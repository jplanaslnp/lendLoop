import { expect, test } from "@playwright/test";

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

test("protected pages send signed-out visitors to the sign-in modal", async ({
  page,
}) => {
  await page.goto("/borrowing");
  // proxy.ts redirects to Explore, which opens the LendLoop modal.
  await expect(page).toHaveURL(/\/explore$/);
  await expect(
    page.getByRole("dialog", { name: "Welcome back" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/\/explore$/);
});

test("the sign-in form validates before contacting Clerk", async ({ page }) => {
  await page.goto("/explore");
  await page
    .getByRole("button", { name: /^(Login \/ Register|Log in)$/ })
    .filter({ visible: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog", { name: "Welcome back" });
  await dialog.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(dialog.getByText("Enter your email address.")).toBeVisible();
  await expect(dialog.getByText("Enter your password.")).toBeVisible();

  await dialog.getByRole("tab", { name: "Create account" }).click();
  await expect(
    page.getByRole("dialog", { name: "Create your account" }),
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
