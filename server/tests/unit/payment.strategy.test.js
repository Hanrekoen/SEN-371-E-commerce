"use strict";

// config/env.js throws when these are missing, by design. Supplied here
// before the first require rather than relying on a real .env.
process.env.NODE_ENV = "test";
process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sen371-test";
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test-access-secret-not-a-real-key";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-refresh-secret-not-a-real-key";

const PaymentProvider = require("../../src/services/payment/PaymentProvider");
const StubPaymentProvider = require("../../src/services/payment/StubPaymentProvider");
const MockPaymentProvider = require("../../src/services/payment/MockPaymentProvider");
const { createPaymentProvider } = require("../../src/services/payment");
const { ServiceUnavailableError } = require("../../src/errors/AppError");

// PERSON 2 - Strategy pattern, the parts that need no network.

const CARD = { number: "4242424242424242", expMonth: 4, expYear: 2030, cvc: "123" };
const request = (over = {}) => ({
  amountCents: 34900,
  currency: "ZAR",
  orderNumber: "ORD-2026-000001",
  card: CARD,
  ...over,
});

describe("PaymentProvider (the contract)", () => {
  test("is abstract - a subclass that forgets authorize() fails loudly", async () => {
    class Forgetful extends PaymentProvider {}
    await expect(new Forgetful().authorize(request())).rejects.toThrow(
      /must implement authorize/
    );
  });

});

describe("StubPaymentProvider", () => {
  test("approves an ordinary card and returns a reference", async () => {
    const result = await new StubPaymentProvider().authorize(request());
    expect(result.approved).toBe(true);
    expect(result.providerReference).toMatch(/^PAY-STUB-/);
    expect(result.code).toBeNull();
  });

  // A decline is an ordinary result carrying its reason, not an exception -
  // checkout has to be able to tell a refusal from a provider that broke.
  test("declines on the test cards, with the reason", async () => {
    const provider = new StubPaymentProvider();
    const result = await provider.authorize(
      request({ card: { ...CARD, number: "4000000000009995" } })
    );
    expect(result.approved).toBe(false);
    expect(result.code).toBe("insufficient_funds");
    expect(result.providerReference).toBeNull();
  });

  test("an unavailable provider IS an exception, and a 503 one", async () => {
    const error = await new StubPaymentProvider({ forceUnavailable: true })
      .authorize(request())
      .catch((e) => e);
    expect(error).toBeInstanceOf(ServiceUnavailableError);
    expect(error.status).toBe(503);
    expect(error.message).toMatch(/has not been charged/);
  });

  test("rejects an amount that did not come from the calculated total", async () => {
    const provider = new StubPaymentProvider();
    await expect(provider.authorize(request({ amountCents: "34900" }))).rejects.toThrow(
      /positive integer amountCents/
    );
    await expect(provider.authorize(request({ amountCents: 0 }))).rejects.toThrow();
    await expect(provider.authorize(request({ amountCents: -100 }))).rejects.toThrow();
  });

  test("records what checkout sent, without the full card number", async () => {
    const provider = new StubPaymentProvider();
    await provider.authorize(request());
    expect(provider.calls).toHaveLength(1);
    expect(provider.calls[0]).toMatchObject({ amountCents: 34900, last4: "4242" });
    expect(JSON.stringify(provider.calls)).not.toContain(CARD.number);
  });
});

describe("the strategy selector", () => {
  test('"stub" and "mock" each build their own implementation', () => {
    expect(createPaymentProvider({ provider: "stub" })).toBeInstanceOf(StubPaymentProvider);
    expect(
      createPaymentProvider({ provider: "mock", apiUrl: "http://localhost:5001", apiKey: "k" })
    ).toBeInstanceOf(MockPaymentProvider);
  });

  test("an unknown strategy fails at startup rather than at checkout", () => {
    expect(() => createPaymentProvider({ provider: "paypal" })).toThrow(/Unknown PAYMENT_PROVIDER/);
  });
});
