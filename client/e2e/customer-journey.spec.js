import { test, expect } from "@playwright/test";
import {
  CARD, addFirstProductToCart, fillCheckout, registerNewAccount, signIn, CUSTOMER,
} from "./support.js";

// END-TO-END / USER TESTING - the automated half.
//
// One person, one browser, no fakes anywhere in the stack: React talking to
// the real API talking to the real database, with the payment gateway
// answering on the same test cards a demo uses. If any seam between those is
// wrong, this is the layer that notices - every layer below replaces one of
// them with a stand-in.

test.describe("a new customer buys something", () => {
  test("register, browse, add to cart, pay, and get a receipt", async ({ page }) => {
    await registerNewAccount(page);

    const product = await addFirstProductToCart(page);

    await page.goto("/cart");
    await expect(page.getByText(product)).toBeVisible();
    await page.getByRole("link", { name: /checkout/i }).click();

    await fillCheckout(page, CARD.approved);
    await page.getByRole("button", { name: /execute transaction/i }).click();

    // The payment screen narrates a request that is genuinely in flight, so
    // this is a real wait on a real round trip, not an animation.
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText(/payment approved/i)).toBeVisible({ timeout: 20_000 });

    await expect(page).toHaveURL(/\/orders\/[a-f0-9]{24}\/confirmation/);
    await expect(page.getByRole("heading", { name: /vault dispatch authorized/i })).toBeVisible();
    await expect(page.getByText(product)).toBeVisible();
  });

  test("the order then appears in the order history", async ({ page }) => {
    await registerNewAccount(page);
    await addFirstProductToCart(page);
    await page.goto("/checkout");
    await fillCheckout(page);
    await page.getByRole("button", { name: /execute transaction/i }).click();
    await expect(page).toHaveURL(/confirmation/, { timeout: 30_000 });

    await page.goto("/orders");

    await expect(page.getByText("paid")).toBeVisible();
    await expect(page.getByRole("link", { name: /view receipt/i }).first()).toBeVisible();
  });

  // The receipt is fetched by id rather than read out of navigation state,
  // which is exactly what makes this survive.
  test("the receipt survives a page refresh", async ({ page }) => {
    await registerNewAccount(page);
    await addFirstProductToCart(page);
    await page.goto("/checkout");
    await fillCheckout(page);
    await page.getByRole("button", { name: /execute transaction/i }).click();
    await expect(page).toHaveURL(/confirmation/, { timeout: 30_000 });

    await page.reload();

    await expect(page.getByRole("heading", { name: /vault dispatch authorized/i })).toBeVisible();
  });

  // Checkout empties the cart server-side; the navbar badge has to agree.
  test("the cart is empty afterwards", async ({ page }) => {
    await registerNewAccount(page);
    await addFirstProductToCart(page);
    await page.goto("/checkout");
    await fillCheckout(page);
    await page.getByRole("button", { name: /execute transaction/i }).click();
    await expect(page).toHaveURL(/confirmation/, { timeout: 30_000 });

    await page.goto("/cart");

    await expect(page.getByText(/your cart is empty|nothing in your cart/i)).toBeVisible();
  });
});

test.describe("when the card is declined", () => {
  test("the reason is shown and the cart is left alone", async ({ page }) => {
    await registerNewAccount(page);
    const product = await addFirstProductToCart(page);

    await page.goto("/checkout");
    await fillCheckout(page, CARD.declined);
    await page.getByRole("button", { name: /execute transaction/i }).click();

    await expect(page.getByRole("alert")).toContainText(/declined/i, { timeout: 20_000 });
    await expect(page.getByRole("alert")).toContainText(/nothing was charged/i);

    await page.getByRole("button", { name: /back to checkout/i }).click();
    await page.goto("/cart");
    await expect(page.getByText(product)).toBeVisible();
  });

  test("a second attempt on a good card goes through", async ({ page }) => {
    await registerNewAccount(page);
    await addFirstProductToCart(page);

    await page.goto("/checkout");
    await fillCheckout(page, CARD.declined);
    await page.getByRole("button", { name: /execute transaction/i }).click();
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: /back to checkout/i }).click();

    await page.getByLabel(/card number/i).fill(CARD.approved);
    await page.getByRole("button", { name: /execute transaction/i }).click();

    await expect(page).toHaveURL(/confirmation/, { timeout: 30_000 });
  });
});

test.describe("signing in and out", () => {
  test("a seeded customer can sign in and see their own orders", async ({ page }) => {
    await signIn(page, CUSTOMER);

    await page.goto("/orders");

    await expect(page.getByRole("heading")).toBeVisible();
    await expect(page.getByText(/not your vault|sign in/i)).toBeHidden();
  });

  // The session is restored from an httpOnly cookie on boot. Getting this
  // wrong signs people out on every refresh, which is the kind of bug that
  // only a real browser reload can catch.
  test("the session survives a refresh", async ({ page }) => {
    await signIn(page, CUSTOMER);

    await page.reload();

    await expect(page.getByRole("link", { name: /sign in/i })).toBeHidden();
  });

  test("signing out ends the session", async ({ page }) => {
    await signIn(page, CUSTOMER);

    await page.getByRole("button", { name: /sign out/i }).click();

    await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
  });
});

test.describe("guards", () => {
  test("checkout is not reachable while signed out", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/login/);
  });

  test("a wrong address shows the 404 page, with the path on it", async ({ page }) => {
    await page.goto("/vault/nowhere");

    await expect(page.getByRole("heading", { name: /leads nowhere/i })).toBeVisible();
    await expect(page.getByText("/vault/nowhere")).toBeVisible();
  });
});
