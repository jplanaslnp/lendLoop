import { join } from "node:path";

import { expect, test, type Browser, type Page } from "@playwright/test";

/**
 * The full loan lifecycle between two real Clerk development test users
 * (Phase 8): request → approve (with a pickup note) → ready for pickup →
 * pickup → mark returned → confirm return. Credentials come from the
 * environment only, as in borrowing.spec.ts:
 *
 *   E2E_CLERK_USER_EMAIL / E2E_CLERK_USER_PASSWORD     borrower
 *   E2E_CLERK_OWNER_EMAIL / E2E_CLERK_OWNER_PASSWORD   owner
 *
 * Skipped when any is missing. The listing created here is archived at the
 * end (it is only archivable once the loan is returned).
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
  "Set E2E_CLERK_USER_* and E2E_CLERK_OWNER_* to run the lifecycle test",
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

function dayLabel(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

const visible = (page: Page, text: string | RegExp) =>
  page.getByText(text).filter({ visible: true }).first();

const button = (page: Page, name: string) =>
  page
    .getByRole("button", { name, exact: true })
    .filter({ visible: true })
    .first();

async function signedInPage(
  browser: Browser,
  account: { email: string; password: string },
  path: string,
): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto(
    `/explore?auth=sign-in&redirect_url=${encodeURIComponent(path)}`,
  );
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
  await expect(page).toHaveURL(new RegExp(`${path}$`), { timeout: 20_000 });
  return page;
}

async function pickDay(page: Page, label: string) {
  const day = page
    .getByRole("button", { name: label, exact: true })
    .filter({ visible: true })
    .first();
  if ((await day.count()) === 0) {
    await button(page, "Next month").click();
  }
  await day.click();
}

/** Opens the request card for `name` on Borrowing or Lending. */
async function openRequest(page: Page, path: string, name: string) {
  await page.goto(path);
  const card = page
    .getByRole("button")
    .filter({ hasText: name })
    .filter({ visible: true })
    .first();
  await expect(card).toBeVisible({ timeout: 20_000 });
  await card.click();
  return page.getByRole("region", { name: `${name} request` });
}

test("a loan goes from request to returned, with the right actor at each step", async ({
  browser,
}) => {
  test.setTimeout(240_000);
  const name = `E2E Loan ${Date.now().toString(36)}`;

  // Owner shares an item.
  const ownerPage = await signedInPage(browser, owner, "/share");
  await ownerPage.getByLabel(/Item name/).fill(name);
  await ownerPage.getByLabel(/Category/).selectOption("garden");
  await ownerPage.getByRole("radio", { name: "Good" }).click();
  await ownerPage
    .getByLabel(/Description/)
    .fill("Garden shears, sharpened last month.");
  await ownerPage.getByLabel(/Area/).fill("Patershol, Gent");
  await ownerPage
    .locator('input[type="file"]')
    .setInputFiles(join(IMAGES, "drill-small.jpg"));
  await button(ownerPage, "Publish item").click();
  await expect(
    ownerPage.getByRole("dialog", { name: `${name} is live` }),
  ).toBeVisible({ timeout: 30_000 });
  await ownerPage.goto("/profile");
  await ownerPage
    .getByRole("button", { name: `Actions for ${name}` })
    .filter({ visible: true })
    .first()
    .click();
  const toolPath = await ownerPage
    .getByRole("menuitem", { name: "View in Explore" })
    .first()
    .getAttribute("href");
  expect(toolPath).toMatch(/^\/tools\/[a-z0-9]+$/);

  let archived = false;
  try {
    // Borrower requests it for today+1 … today+2.
    const page = await signedInPage(browser, borrower, toolPath!);
    await page
      .getByRole("button", { name: /Select start date/ })
      .filter({ visible: true })
      .first()
      .click();
    await pickDay(page, dayLabel(1));
    await pickDay(page, dayLabel(2));
    await button(page, "Request to borrow").click();
    const confirm = page.getByRole("dialog", { name: "Confirm your request" });
    await expect(confirm).toBeVisible({ timeout: 20_000 });
    await confirm.getByRole("textbox").fill("For the front hedge, thanks!");
    await confirm.getByRole("button", { name: "Send request" }).click();
    await expect(
      visible(page, "Request sent · waiting for the owner."),
    ).toBeVisible({ timeout: 20_000 });

    // Owner sees it in Lending with the message, and approves with a note.
    let lending = await openRequest(ownerPage, "/lending", name);
    await expect(
      lending.getByText("For the front hedge, thanks!"),
    ).toBeVisible();
    await lending.getByRole("button", { name: "Approve" }).click();
    const approve = ownerPage.getByRole("dialog", { name: "Approve request" });
    await approve.getByRole("textbox").fill("Ring the blue door after 6 pm.");
    await approve.getByRole("button", { name: "Approve" }).click();
    await expect(visible(ownerPage, /Request approved/)).toBeVisible({
      timeout: 15_000,
    });

    // Borrower sees the note, and can't confirm pickup yet.
    let borrowing = await openRequest(page, "/borrowing", name);
    await expect(borrowing.getByText("Request approved")).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      borrowing.getByRole("button", { name: "Confirm Pickup" }),
    ).toHaveCount(0);
    await borrowing
      .getByRole("button", { name: "View Pickup Details" })
      .click();
    const details = page.getByRole("dialog", { name: "Pickup details" });
    await expect(
      details.getByText("Ring the blue door after 6 pm."),
    ).toBeVisible();
    await details.getByRole("button", { name: "Close" }).click();

    // Owner marks it ready; the borrower confirms pickup.
    lending = await openRequest(ownerPage, "/lending", name);
    await lending
      .getByRole("button", { name: "Item ready for pickup" })
      .click();
    await expect(visible(ownerPage, /Marked ready/)).toBeVisible({
      timeout: 15_000,
    });
    borrowing = await openRequest(page, "/borrowing", name);
    await borrowing.getByRole("button", { name: "Confirm Pickup" }).click();
    await expect(
      visible(page, "Pickup confirmed · the loan has started."),
    ).toBeVisible({ timeout: 15_000 });

    // The listing can't be removed while it's on loan.
    await ownerPage.goto("/profile");
    await ownerPage
      .getByRole("button", { name: `Actions for ${name}` })
      .filter({ visible: true })
      .first()
      .click();
    await expect(
      ownerPage
        .getByRole("menuitem", { name: "Can’t remove while on loan" })
        .first(),
    ).toBeDisabled();

    // Borrower marks it returned; the owner confirms.
    borrowing = await openRequest(page, "/borrowing", name);
    await borrowing.getByRole("button", { name: "Mark as Returned" }).click();
    await expect(visible(page, /Marked as returned/)).toBeVisible({
      timeout: 15_000,
    });
    lending = await openRequest(ownerPage, "/lending", name);
    await lending.getByRole("button", { name: "Confirm Return" }).click();
    await expect(
      visible(ownerPage, "Return confirmed · loan completed."),
    ).toBeVisible({ timeout: 15_000 });

    borrowing = await openRequest(page, "/borrowing", name);
    await expect(borrowing.getByText("Loan completed")).toBeVisible({
      timeout: 20_000,
    });
    await page.context().close();

    await archive(ownerPage, name);
    archived = true;
  } finally {
    if (!archived) await archive(ownerPage, name).catch(() => {});
    await ownerPage.context().close();
  }
});

async function archive(page: Page, name: string) {
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
