import { expect, test, type Page } from "@playwright/test";

/**
 * Real Clerk sign-in against the development instance. Needs an existing
 * test user whose email uses Clerk's `+clerk_test` suffix (verification code
 * 424242, no email is sent). Credentials come from the environment only:
 *
 *   E2E_CLERK_USER_EMAIL=someone+clerk_test@example.com
 *   E2E_CLERK_USER_PASSWORD=...
 *
 * Skipped when they are not set (e.g. CI without secrets). Sign-up is not
 * automated: Clerk's bot protection challenge must be completed by a person.
 */
const email = process.env.E2E_CLERK_USER_EMAIL ?? "";
const password = process.env.E2E_CLERK_USER_PASSWORD ?? "";
const CLERK_TEST_CODE = "424242";

test.skip(
  !email || !password,
  "Set E2E_CLERK_USER_EMAIL and E2E_CLERK_USER_PASSWORD to run Clerk tests",
);

async function openSignIn(page: Page) {
  await page
    .getByRole("button", { name: /^(Login \/ Register|Log in)$/ })
    .filter({ visible: true })
    .first()
    .click();
}

/** Fills the modal; answers Clerk's new-device email code if asked. */
async function signIn(page: Page, pw = password) {
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Email address").fill(email);
  await dialog.getByLabel("Password", { exact: true }).fill(pw);
  await dialog.getByRole("button", { name: "Sign in", exact: true }).click();
  const codeStep = page.getByRole("dialog", { name: "Check your email" });
  const form = page.getByRole("dialog", { name: "Welcome back" });
  // Either Clerk asks for a new-device code, or the modal closes.
  await expect(async () => {
    const asked = await codeStep.isVisible();
    expect(asked || !(await form.isVisible())).toBe(true);
  }).toPass({ timeout: 15_000 });
  if (await codeStep.isVisible()) {
    await codeStep.getByLabel("Verification code").fill(CLERK_TEST_CODE);
    await codeStep.getByRole("button", { name: "Verify and continue" }).click();
  }
}

test("wrong password shows Clerk's error in the modal", async ({ page }) => {
  await page.goto("/explore");
  await openSignIn(page);
  const dialog = page.getByRole("dialog", { name: "Welcome back" });
  await dialog.getByLabel("Email address").fill(email);
  await dialog
    .getByLabel("Password", { exact: true })
    .fill("not-the-password-1");
  await dialog.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    dialog.getByText("That password isn’t right. Try again."),
  ).toBeVisible({ timeout: 15_000 });
});

test("sign in from a protected link, keep the session, sign out", async ({
  page,
}) => {
  await page.goto("/explore");
  await page
    .getByRole("link", { name: /^Share( a tool)?$/ })
    .filter({ visible: true })
    .first()
    .click();
  await signIn(page);

  // Continues to the page that was asked for.
  await expect(page).toHaveURL(/\/share$/, { timeout: 20_000 });
  await expect(
    page.getByRole("heading", { level: 1, name: "Share a tool" }),
  ).toBeVisible();

  // The session survives a full reload (proxy lets the request through).
  await page.reload();
  await expect(page).toHaveURL(/\/share$/);

  await page.goto("/profile");
  await expect(page.getByText(email)).toBeVisible();
  await page
    .getByRole("button", { name: "Log out" })
    .filter({ visible: true })
    .first()
    .click();
  await page
    .getByRole("dialog", { name: "Log out?" })
    .getByRole("button", { name: "Log out" })
    .click();
  await expect(page).toHaveURL(/\/explore$/, { timeout: 15_000 });

  // Signed out again: account pages are gated.
  await page.goto("/profile");
  await expect(
    page.getByRole("dialog", { name: "Welcome back" }),
  ).toBeVisible();
});

test("borrow request resumes after signing in", async ({ page }) => {
  await page.goto("/tools/osmo-mobile");
  await page
    .getByRole("button", { name: /Select start date/ })
    .filter({ visible: true })
    .first()
    .click();
  const day = page
    .getByRole("button", { name: "Nov 27", exact: true })
    .filter({ visible: true })
    .first();
  await day.click();
  await day.click();
  await page
    .getByRole("button", { name: "Request to borrow" })
    .filter({ visible: true })
    .first()
    .click();
  await signIn(page);
  await expect(
    page.getByRole("dialog", { name: "Confirm your request" }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page).toHaveURL(/\/tools\/osmo-mobile$/);
});
