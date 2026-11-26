import { expect, test } from "@playwright/test";

test("home page shows the LendLoop identity", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/LendLoop/);
  await expect(
    page.getByRole("heading", { level: 1, name: "LendLoop" }),
  ).toBeVisible();
  await expect(
    page.getByText("Borrow what you need. Lend what you don’t."),
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
