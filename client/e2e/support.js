// Shared helpers for the end-to-end tests.
//
// These deliberately drive the app the way a person does - click the link,
// fill the field, press the button - rather than calling the API to set up
// state. Setting up through the API would be faster, but it would also skip
// the part of the system these tests exist to check.

import { expect } from "@playwright/test";

// From server/scripts/seed.js. Run `npm run seed` before these tests.
export const SEED_PASSWORD = "Password123!";
export const ADMIN = { email: "Hanre.admin@sen371.test", password: SEED_PASSWORD };
export const CUSTOMER = { email: "Sipho@sen371.test", password: SEED_PASSWORD };

// The gateway's test cards, which behave the same here as in the demo.
export const CARD = {
  approved: "4242 4242 4242 4242",
  declined: "4000 0000 0000 9995",
  unreachable: "4000 0000 0000 0119",
};

// A fresh address every run, so re-running the suite never trips over an
// account that already exists.
export const newAccount = () => {
  const stamp = Date.now().toString(36);
  return {
    firstName: "Test",
    lastName: "Shopper",
    email: `e2e-${stamp}@sen371.test`,
    password: "Vault-Pass-9",
  };
};

export async function signIn(page, { email, password }) {
  await page.goto("/login");
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();

  // Wait for something that exists ONLY once signed in. The obvious
  // alternative - asserting the "Sign in" link has gone - passes instantly and
  // wrongly, because Playwright treats "not in the DOM at all" as hidden, and
  // on the login page there is no such link to begin with. That let the next
  // step run against a page whose login request was still in flight.
  await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
}

export async function registerNewAccount(page, account = newAccount()) {
  await page.goto("/login");
  await page.getByRole("tab", { name: /register/i }).click();
  await page.getByLabel(/first name/i).fill(account.firstName);
  await page.getByLabel(/last name/i).fill(account.lastName);
  await page.getByLabel(/email address/i).fill(account.email);
  await page.getByLabel(/^password$/i).fill(account.password);
  await page.getByRole("button", { name: /create account/i }).click();
  // Same reasoning as signIn: wait for proof of a session, not for the absence
  // of something that was never there.
  await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
  return account;
}

// Opens the first in-stock product in the catalogue and adds one to the cart,
// through the product page rather than the card's quick-add, so the journey
// covers the detail page too.
export async function addFirstProductToCart(page) {
  await page.goto("/catalog");

  // The card itself is the link, and an out-of-stock one cannot be bought, so
  // it is skipped rather than failing the journey on a seeded stock level.
  const card = page.locator(".gv-pcard").filter({ hasNot: page.locator(".gv-pcard__oos") }).first();
  await expect(card).toBeVisible();
  const name = (await card.locator(".gv-pcard__name").innerText()).trim();

  await card.click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();

  await page.getByRole("button", { name: /add to cart/i }).click();
  await expect(page.getByText(/added to your cart/i)).toBeVisible();
  return name;
}

export async function fillCheckout(page, cardNumber = CARD.approved) {
  await page.getByLabel(/street address/i).fill("440 Silicon Pass");
  await page.getByLabel(/^city/i).fill("Centurion");
  await page.getByLabel(/^province/i).fill("Gauteng");
  await page.getByLabel(/postal code/i).fill("0157");
  await page.getByLabel(/cardholder name/i).fill("Test Shopper");
  await page.getByLabel(/card number/i).fill(cardNumber);
  await page.getByLabel(/^expiry/i).fill("0829");
  await page.getByLabel(/^cvc/i).fill("123");
}
