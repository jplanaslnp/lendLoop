import { expect, test, type Page } from "@playwright/test";

/** The Phase 2 mock sign-in (in-memory only; replaced by Clerk in Phase 3). */
async function mockSignIn(page: Page) {
  await page
    .getByRole("button", { name: /^(Login \/ Register|Log in)$/ })
    .filter({ visible: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Continue with Google" }).click();
}

test("home redirects to the public Explore page with LendLoop branding", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/explore$/);
  await expect(page).toHaveTitle(/LendLoop/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Explore" }),
  ).toBeVisible();
  await expect(page.getByText("Share your tool")).toHaveCount(0);
  await expect(
    page.getByRole("main").getByRole("heading", { name: "Projector" }),
  ).toBeVisible();
});

test("signed-out Explore does not show owner details", async ({ page }) => {
  await page.goto("/explore");
  await expect(page.getByRole("main").getByText("Marc S.")).toHaveCount(0);
});

test("category filters narrow the list", async ({ page }) => {
  await page.goto("/explore");
  await page.getByRole("button", { name: "Garden & Outdoor" }).click();
  const main = page.getByRole("main");
  await expect(
    main.getByRole("heading", { name: "Garden Tool Set" }),
  ).toBeVisible();
  await expect(main.getByRole("heading", { name: "Projector" })).toHaveCount(0);
});

test("product details lets a visitor pick dates", async ({ page }) => {
  await page.goto("/tools/osmo-mobile");
  await expect(
    page
      .getByRole("heading", { name: "DJI Osmo Mobile" })
      .filter({ visible: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Select start date/ }).click();
  // Nov 27 is the only free day before a booking: a single-day range.
  const day = page
    .getByRole("button", { name: "Nov 27", exact: true })
    .filter({ visible: true })
    .first();
  await day.click();
  await expect(
    page.getByText("Now pick an end date — available until Nov 27"),
  ).toBeVisible();
  await day.click();
  await expect(page.getByText("Available · Nov 27 (1 day)")).toBeVisible();
});

test("protected pages ask signed-out visitors to sign in", async ({ page }) => {
  await page.goto("/borrowing");
  await expect(
    page.getByRole("dialog", { name: "Welcome back" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page).toHaveURL(/\/explore$/);
});

test("mock sign-in shows Borrowing requests", async ({ page }) => {
  await page.goto("/explore");
  await mockSignIn(page);
  await page
    .getByRole("link", { name: "Borrowing" })
    .filter({ visible: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/borrowing$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Borrowing" }),
  ).toBeVisible();
  await expect(
    page.getByText("Confirm pickup").filter({ visible: true }).first(),
  ).toBeVisible();
});

test("unknown routes render the not-found page with a 404 status", async ({
  page,
}) => {
  const response = await page.goto("/this-route-does-not-exist");

  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { level: 1, name: "Page not found" }),
  ).toBeVisible();
});
