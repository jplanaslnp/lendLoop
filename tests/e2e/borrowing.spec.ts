import { join } from "node:path";

import { expect, test, type Browser, type Page } from "@playwright/test";

/**
 * Borrow requests between two real Clerk development test users (Phase 7):
 * an owner who shares an item and a borrower who requests it. Credentials
 * come from the environment only (never from files in the repository):
 *
 *   E2E_CLERK_USER_EMAIL / E2E_CLERK_USER_PASSWORD     borrower
 *   E2E_CLERK_OWNER_EMAIL / E2E_CLERK_OWNER_PASSWORD   owner
 *
 * Both accounts must use Clerk's `+clerk_test` email suffix (code 424242).
 * Skipped when any of them is missing. Demo listings are never used: their
 * owners are fictional and requests on them are refused. Every listing made
 * here is archived again at the end of the test.
 */
const borrower = {
  email: process.env.E2E_CLERK_USER_EMAIL ?? "",
  password: process.env.E2E_CLERK_USER_PASSWORD ?? "",
};
const owner = {
  email: process.env.E2E_CLERK_OWNER_EMAIL ?? "",
  password: process.env.E2E_CLERK_OWNER_PASSWORD ?? "",
};

test.skip(
  !borrower.email || !borrower.password || !owner.email || !owner.password,
  "Set E2E_CLERK_USER_* and E2E_CLERK_OWNER_* to run the borrowing tests",
);

const IMAGES = join(process.cwd(), "tests", "fixtures", "images");
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "Dec 3" for the local date `days` from today (the calendar's labels). */
function dayLabel(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** Fills the open sign-in modal; answers Clerk's new-device code if asked. */
async function fillSignIn(
  page: Page,
  account: { email: string; password: string },
) {
  const dialog = page.getByRole("dialog", { name: "Welcome back" });
  await dialog.getByLabel("Email address").fill(account.email);
  await dialog.getByLabel("Password", { exact: true }).fill(account.password);
  await dialog.getByRole("button", { name: "Sign in", exact: true }).click();
  const code = page.getByRole("dialog", { name: "Check your email" });
  await expect(async () => {
    const asked = await code.isVisible();
    expect(asked || !(await dialog.isVisible())).toBe(true);
  }).toPass({ timeout: 15_000 });
  if (await code.isVisible()) {
    await code.getByLabel("Verification code").fill("424242");
    await code.getByRole("button", { name: "Verify and continue" }).click();
  }
}

async function signedInPage(
  browser: Browser,
  account: { email: string; password: string },
  path: string,
): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(
    `/explore?auth=sign-in&redirect_url=${encodeURIComponent(path)}`,
  );
  await fillSignIn(page, account);
  await expect(page).toHaveURL(new RegExp(`${path}$`), { timeout: 20_000 });
  return page;
}

/** Clicks a calendar day, moving to the next month if it isn't shown. */
async function pickDay(page: Page, label: string) {
  const day = page
    .getByRole("button", { name: label, exact: true })
    .filter({ visible: true })
    .first();
  if ((await day.count()) === 0) {
    await page
      .getByRole("button", { name: "Next month" })
      .filter({ visible: true })
      .first()
      .click();
  }
  await day.click();
}

async function chooseDates(page: Page, from: number, to: number) {
  await page
    .getByRole("button", { name: /Select start date/ })
    .filter({ visible: true })
    .first()
    .click();
  await pickDay(page, dayLabel(from));
  await pickDay(page, dayLabel(to));
}

const visible = (page: Page, text: string | RegExp) =>
  page.getByText(text).filter({ visible: true }).first();

async function shareItem(page: Page, name: string): Promise<string> {
  await page.getByLabel(/Item name/).fill(name);
  await page.getByLabel(/Category/).selectOption("garden");
  await page.getByRole("radio", { name: "Good" }).click();
  await page
    .getByLabel(/Description/)
    .fill("Electric hedge trimmer with a spare blade.");
  await page.getByLabel(/Area/).fill("Patershol, Gent");
  await page
    .locator('input[type="file"]')
    .setInputFiles(join(IMAGES, "drill-small.jpg"));
  await page.getByRole("button", { name: "Publish item" }).click();
  await expect(
    page.getByRole("dialog", { name: `${name} is live` }),
  ).toBeVisible({ timeout: 30_000 });

  await page.goto("/profile");
  await page
    .getByRole("button", { name: `Actions for ${name}` })
    .filter({ visible: true })
    .first()
    .click();
  const href = await page
    .getByRole("menuitem", { name: "View in Explore" })
    .first()
    .getAttribute("href");
  expect(href).toMatch(/^\/tools\/[a-z0-9]+$/);
  return href!;
}

async function archiveItem(page: Page, name: string) {
  await page.goto("/profile");
  await page
    .getByRole("button", { name: `Actions for ${name}` })
    .filter({ visible: true })
    .first()
    .click();
  await page.getByRole("menuitem", { name: "Remove listing" }).first().click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Remove", exact: true })
    .click();
  await expect(
    visible(page, `${name} removed from your listings.`),
  ).toBeVisible({ timeout: 15_000 });
}

test("request an item, track it, cancel it, and see it cancelled on archive", async ({
  browser,
}) => {
  test.setTimeout(180_000);
  const name = `E2E Trimmer ${Date.now().toString(36)}`;

  // The owner shares an item and sees it as their own.
  const ownerPage = await signedInPage(browser, owner, "/share");
  const toolPath = await shareItem(ownerPage, name);
  // Whatever happens below, the listing made here is archived again.
  let archived = false;
  try {
    await ownerPage.goto(toolPath);
    await expect(visible(ownerPage, "This is your listing")).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      ownerPage
        .getByRole("link", { name: "Edit listing" })
        .filter({ visible: true })
        .first(),
    ).toHaveAttribute("href", /^\/share\/[a-z0-9]+$/);

    // A visitor picks dates, is asked to sign in, and the request resumes.
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(toolPath);
    await chooseDates(page, 2, 4);
    await page
      .getByRole("button", { name: "Request to borrow" })
      .filter({ visible: true })
      .first()
      .click();
    await fillSignIn(page, borrower);
    const confirm = page.getByRole("dialog", { name: "Confirm your request" });
    await expect(confirm).toBeVisible({ timeout: 20_000 });
    await confirm.getByRole("textbox").fill("Hi! For the front hedge.");
    await confirm.getByRole("button", { name: "Send request" }).click();
    await expect(
      visible(page, "Request sent · waiting for the owner."),
    ).toBeVisible({ timeout: 20_000 });

    // The pending state comes from Convex, so it survives a reload.
    await page.reload();
    await expect(
      visible(page, /Request sent · (Pending|View in Borrowing)/),
    ).toBeVisible({ timeout: 20_000 });

    // Borrowing lists it; the borrower cancels it.
    await page.goto("/borrowing");
    const card = page
      .getByRole("button")
      .filter({ hasText: name })
      .filter({ visible: true })
      .first();
    await expect(card).toBeVisible({ timeout: 20_000 });
    await card.click();
    const detail = page.getByRole("region", { name: `${name} request` });
    await expect(detail.getByText("Waiting for approval")).toBeVisible();
    await expect(
      detail.getByRole("button", { name: "View Pickup Address" }),
    ).toHaveCount(0);
    await detail.getByRole("button", { name: "Cancel Request" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Yes, cancel request" })
      .click();
    await expect(visible(page, "Request cancelled.")).toBeVisible({
      timeout: 15_000,
    });
    // Shown in the status banner and as the last timeline step.
    await expect(detail.getByText("Cancelled by you")).toHaveCount(2);
    await expect(
      detail.getByText(/the request was withdrawn\.$/),
    ).toBeVisible();

    // The dates are free again; a new request is pending when the owner
    // removes the listing, which cancels it.
    await page.goto(toolPath);
    await chooseDates(page, 2, 3);
    await page
      .getByRole("button", { name: "Request to borrow" })
      .filter({ visible: true })
      .first()
      .click();
    await page
      .getByRole("dialog", { name: "Confirm your request" })
      .getByRole("button", { name: "Send request" })
      .click();
    await expect(
      visible(page, "Request sent · waiting for the owner."),
    ).toBeVisible({ timeout: 20_000 });

    await archiveItem(ownerPage, name);
    archived = true;

    await page.goto("/borrowing");
    const cancelledCard = page
      .getByRole("button")
      .filter({ hasText: name })
      .filter({ visible: true })
      .first();
    await expect(cancelledCard).toBeVisible({ timeout: 20_000 });
    await cancelledCard.click();
    await expect(visible(page, "Listing removed")).toBeVisible({
      timeout: 20_000,
    });
    await expect(visible(page, "Cancelled · listing removed")).toBeVisible();

    await context.close();
  } finally {
    if (!archived) await archiveItem(ownerPage, name).catch(() => {});
    await ownerPage.context().close();
  }
});
