import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

/**
 * Listing management against the Convex dev deployment, as the Clerk test
 * user (same credentials as auth.spec.ts). Every listing created here is
 * removed again in the same test.
 */
const email = process.env.E2E_CLERK_USER_EMAIL ?? "";
const password = process.env.E2E_CLERK_USER_PASSWORD ?? "";

test.skip(
  !email || !password,
  "Set E2E_CLERK_USER_EMAIL and E2E_CLERK_USER_PASSWORD to run Clerk tests",
);

const IMAGES = join(process.cwd(), "tests", "fixtures", "images");

async function signIn(page: Page) {
  await page.goto("/explore?auth=sign-in&redirect_url=%2Fshare");
  const dialog = page.getByRole("dialog", { name: "Welcome back" });
  await dialog.getByLabel("Email address").fill(email);
  await dialog.getByLabel("Password", { exact: true }).fill(password);
  await dialog.getByRole("button", { name: "Sign in", exact: true }).click();
  const code = page.getByRole("dialog", { name: "Check your email" });
  await expect(async () => {
    const asked = await code.isVisible();
    expect(asked || page.url().endsWith("/share")).toBe(true);
  }).toPass({ timeout: 15_000 });
  if (await code.isVisible()) {
    await code.getByLabel("Verification code").fill("424242");
    await code.getByRole("button", { name: "Verify and continue" }).click();
  }
  await expect(page).toHaveURL(/\/share$/, { timeout: 20_000 });
}

test("create, view, edit and remove a listing", async ({ page, browser }) => {
  const name = `E2E Ladder ${Date.now().toString(36)}`;
  await signIn(page);

  // A non-image is refused before upload.
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(join(IMAGES, "fake.pdf"));
  await expect(page.getByText("Use JPEG, PNG or WebP photos.")).toBeVisible();

  await page.getByLabel(/Item name/).fill(name);
  await page.getByLabel(/Category/).selectOption("diy");
  await page.getByRole("radio", { name: "Good" }).click();
  await page
    .getByLabel(/Description/)
    .fill("Aluminium step ladder, three steps, folds flat.");
  // The privacy hint is always visible; an address is rejected.
  await expect(
    page.getByText(/Neighbourhood and city only\. Never your street/),
  ).toBeVisible();
  await page.getByLabel(/Area/).fill("Veldstraat 12, Gent");
  await fileInput.setInputFiles(join(IMAGES, "drill-small.jpg"));
  await page.getByRole("button", { name: "Publish item" }).click();
  await expect(
    page.getByText(/no street, number, postcode or floor/).first(),
  ).toBeVisible();

  await page.getByLabel(/Area/).fill("Patershol, Gent");
  await page.getByRole("button", { name: "Publish item" }).click();
  await expect(
    page.getByRole("dialog", { name: `${name} is live` }),
  ).toBeVisible({ timeout: 30_000 });

  // Members see it in Explore with the owner's short name.
  await page.goto("/explore");
  const card = page
    .getByRole("main")
    .getByRole("link")
    .filter({ has: page.getByRole("heading", { name }) });
  await expect(card).toBeVisible({ timeout: 20_000 });
  await expect(card.getByText("QA N.")).toBeVisible();
  await expect(card.locator("img")).toHaveAttribute("src", /convex\.cloud/);
  await card.click();
  await expect(page).toHaveURL(/\/tools\/[a-z0-9]+$/);
  const toolUrl = page.url();

  // Logged-out visitors see the item and area, never the owner.
  const guest = await browser.newContext();
  const guestPage = await guest.newPage();
  await guestPage.goto(toolUrl);
  await expect(
    guestPage
      .getByRole("heading", { level: 1, name })
      .filter({ visible: true }),
  ).toBeVisible();
  await expect(
    guestPage
      .getByText("Patershol, Gent · approximate area")
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await expect(guestPage.getByText("QA N.")).toHaveCount(0);
  await guest.close();

  // Edit from My Profile.
  await page.goto("/profile");
  await page
    .getByRole("button", { name: `Actions for ${name}` })
    .filter({ visible: true })
    .first()
    .click();
  await page.getByRole("menuitem", { name: "Edit listing" }).first().click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Edit listing" }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByLabel(/Area/)).toHaveValue("Patershol, Gent");
  await page.getByLabel(/Item name/).fill(`${name} v2`);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(toolUrl, { timeout: 20_000 });
  await expect(
    page
      .getByRole("heading", { level: 1, name: `${name} v2` })
      .filter({ visible: true }),
  ).toBeVisible();

  // Remove (archive) it.
  await page.goto("/profile");
  await page
    .getByRole("button", { name: `Actions for ${name} v2` })
    .filter({ visible: true })
    .first()
    .click();
  await page.getByRole("menuitem", { name: "Remove listing" }).first().click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Remove", exact: true })
    .click();
  await expect(
    page.getByText(`${name} v2 removed from your listings.`),
  ).toBeVisible({ timeout: 15_000 });

  await page.goto(toolUrl);
  await expect(
    page.getByRole("heading", { level: 1, name: "Page not found" }),
  ).toBeVisible();
  await page.goto("/explore");
  await expect(page.getByRole("heading", { name: `${name} v2` })).toHaveCount(
    0,
  );
});
