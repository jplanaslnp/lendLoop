import { expect, test } from "@playwright/test";

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

// Explore and product data come from the Convex dev deployment, seeded
// with `npx convex run seed:run` (README → Development seed data).

test("signed-out Explore shows item details but no owner", async ({ page }) => {
  await page.goto("/explore");
  const card = page
    .getByRole("main")
    .getByRole("link")
    .filter({ has: page.getByRole("heading", { name: "Projector" }) });
  await expect(card.getByText(/Full HD portable projector/)).toBeVisible();
  await expect(card.getByText("Electronics")).toBeVisible();
  await expect(card.getByText("Like New")).toBeVisible();
  await expect(card.getByText("Available")).toBeVisible();
  await expect(page.getByRole("main").getByText("Marc S.")).toHaveCount(0);
});

test("signed-out product page shows the area but not the owner", async ({
  page,
}) => {
  await page.goto("/tools/projector");
  await expect(
    page
      .getByText("Patershol, Gent · approximate area")
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await expect(
    page
      .getByText("Sign in to see who is sharing this item.")
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await expect(page.getByText("Marc S.")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /View profile/ })).toHaveCount(0);
});

test("an unknown tool ID renders the not-found page", async ({ page }) => {
  await page.goto("/tools/not-a-real-tool");
  await expect(
    page.getByRole("heading", { level: 1, name: "Page not found" }),
  ).toBeVisible();
  // The streamed page can't change the status code once sent, so Next.js
  // marks it noindex instead (dev mode still answers 404).
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex",
  );
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
  // Demo items can be browsed but not requested (their owners are fictional).
  await expect(
    page
      .getByText("Demo item · requests are turned off")
      .filter({ visible: true })
      .first(),
  ).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: /Select start date/ }).click();
  // Today, in the browser's own calendar: a single-day range.
  const now = new Date();
  const today = `${MONTHS[now.getMonth()]} ${now.getDate()}`;
  const day = page
    .getByRole("button", { name: today, exact: true })
    .filter({ visible: true })
    .first();
  await day.click();
  await expect(
    page.getByText(/Now pick an end date — up to 7 days/),
  ).toBeVisible();
  await day.click();
  await expect(page.getByText(`Available · ${today} (1 day)`)).toBeVisible();
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
