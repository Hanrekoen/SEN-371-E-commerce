"use strict";
const env = require("../../config/env");
const PaymentProvider = require("./PaymentProvider");
const MockPaymentProvider = require("./MockPaymentProvider");
const StubPaymentProvider = require("./StubPaymentProvider");

// The Strategy selector - the only place that knows which implementations
// exist. Changing strategy is a line in .env, not an edit to checkout.

function createPaymentProvider(config = env.payment) {
  const strategy = (config && config.provider) || "mock";

  if (strategy === "stub") return new StubPaymentProvider();

  if (strategy === "mock") {
    return new MockPaymentProvider({
      baseUrl: config.apiUrl,
      apiKey: config.apiKey,
      timeoutMs: config.timeoutMs,
    });
  }

  throw new Error(`Unknown PAYMENT_PROVIDER "${strategy}" - expected "mock" or "stub"`);
}

// Built lazily, so requiring this in a unit test does not demand a gateway.
let instance = null;

const paymentProvider = {
  async authorize(request) {
    if (!instance) {
      instance = createPaymentProvider();
      console.log(`[payment] strategy: ${instance.name}`);
    }
    return instance.authorize(request);
  },

  // Test seam: swap the strategy for one run, then reset().
  use(provider) {
    instance = provider;
    return provider;
  },

  reset() {
    instance = null;
  },

  get current() {
    return instance;
  },
};

module.exports = {
  paymentProvider,
  createPaymentProvider,
  PaymentProvider,
  MockPaymentProvider,
  StubPaymentProvider,
};
