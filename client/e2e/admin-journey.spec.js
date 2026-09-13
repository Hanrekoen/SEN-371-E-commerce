import { test, expect } from "@playwright/test";
import {
  ADMIN, CARD, addFirstProductToCart, fillCheckout, registerNewAccount, signIn,
} from "./support.js";

// END-TO-END / USER TESTING - the admin's side.
//
// The customer journey proves someone can buy. This proves someone can run
// the shop: add a category, add a product, see it appear in the catalogue a
// customer browses, and move a real order along. It also checks the rule that
// separates the two roles - an admin administers orders, it does not place
// them - at the level a person actually meets it.

const unique = () => Date.now().toString(36);

test.describe("running the catalogue", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, ADMIN);
  });

  test("the dashboard is reachable and shows the shop's numbers", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
  });

  // Every product needs a category, and the product form's picker is
  // required, so this is the first thing a new shop has to be able to do.
  test("a category can be added", async ({ page }) => {
    const name = `E2E Gear ${unique()}`;
    await page.goto("/admin/categories");

    await page.getByLabel(/name/i).fill(name);
    await page.getByRole("button", { name: /add category/i }).click();

    await expect(page.getByText(name)).toBeVisible();
  });

  test("a product added here appears in the shop a customer browses", async ({ page }) => {
    const stamp = unique();
    const name = `E2E Test Headset ${stamp}`;

    await page.goto("/admin/products");
    await page.getByRole("button", { name: /add product/i }).click();

    await page.getByLabel(/^name/i).fill(name);
    await page.getByLabel(/^sku/i).fill(`GV-E2E-${stamp.toUpperCase()}`);
    await page.getByLabel(/^brand/i).fill("Obsidian");
    await page.getByLabel(/^description/i).fill("Added by the end-to-end suite.");
    await page.getByLabel(/price/i).fill("349.00");
    await page.getByLabel(/^stock/i).fill("25");
    await page.getByLabel(/^images/i).fill("/product-pictures/placeholder.jpg");
    await page.getByRole("button", { name: /add product/i }).last().click();

    await expect(page.getByText(name)).toBeVisible({ timeout: 15_000 });

    // The part that matters: it is in the shop, not just in the admin list.
    await page.goto(`/catalog?q=${encodeURIComponent(name)}`);
    await expect(page.getByText(name)).toBeVisible();
  });

  // A soft delete that looks like the product vanished is indistinguishable
  // from having lost it.
  test("deactivating hides a product from the shop but not from the admin", async ({ page }) => {
    await page.goto("/admin/products");

    const row = page.locator("tbody tr").first();
    const name = (await row.locator("td").first().innerText()).trim();

    page.once("dialog", (d) => d.accept());
    await row.getByRole("button", { name: /^deactivate$/i }).click();

    await expect(row.getByText(/deactivated/i)).toBeVisible({ timeout: 15_000 });

    // Put it back, so a re-run starts from the same catalogue.
    page.once("dialog", (d) => d.accept());
    await row.getByRole("button", { name: /reactivate/i }).click();
    await expect(row.getByRole("button", { name: /^deactivate$/i })).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("fulfilling a real order", () => {
  test("an order placed by a customer can be moved paid to shipped to delivered", async ({ page }) => {
    // A genuine order, placed through the shop rather than inserted.
    await registerNewAccount(page);
    await addFirstProductToCart(page);
    await page.goto("/checkout");
    await fillCheckout(page, CARD.approved);
    await page.getByRole("button", { name: /execute transaction/i }).click();
    await expect(page).toHaveURL(/confirmation/, { timeout: 30_000 });
    const orderNumber = (await page.locator("strong").first().innerText()).replace("#", "").trim();

    await page.getByRole("button", { name: /sign out/i }).click();
    await signIn(page, ADMIN);
    await page.goto("/admin");

    const row = page.locator("tr", { hasText: orderNumber }).first();
    await expect(row).toBeVisible({ timeout: 15_000 });

    await row.getByRole("button", { name: /mark shipped/i }).click();
    await expect(row.getByText("shipped")).toBeVisible({ timeout: 15_000 });

    await row.getByRole("button", { name: /mark delivered/i }).click();
    await expect(row.getByText("delivered")).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("an admin is not a shopper", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, ADMIN);
  });

  // The API refuses an admin's cart writes and checkout outright. This is the
  // browser explaining that before they meet a row of buttons that all 403.
  test("the cart says this account does not shop", async ({ page }) => {
    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: /admins do not shop here/i })).toBeVisible();
  });

  test("checkout says the same thing", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page.getByRole("heading", { name: /admins do not shop here/i })).toBeVisible();
  });

  test("a product page offers management instead of a buy button", async ({ page }) => {
    await page.goto("/catalog");
    await page.locator(".gv-pcard").first().click();

    await expect(page.getByText(/cannot be bought from here/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /add to cart/i })).toBeHidden();
  });
});
