"use strict";
const env = require("../../config/env");
const PaymentProvider = require("./PaymentProvider");
const MockPaymentProvider = require("./MockPaymentProvider");
const StubPaymentProvider = require("./StubPaymentProvider");

// The Strategy selector.
//
// This is the only place that knows which implementation exists. order.service
// imports `paymentProvider` and calls authorize() on it; changing the strategy
// is a line in .env, not an edit to the checkout code.

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

  throw new Error(
    `Unknown PAYMENT_PROVIDER "${strategy}" - expected "mock" or "stub"`
  );
}

// Built once, lazily, on first checkout rather than at import time. Requiring
// this module in a unit test must not demand a configured gateway.
let instance = null;

const paymentProvider = {
  async authorize(request) {
    if (!instance) {
      instance = createPaymentProvider();
      console.log(`[payment] strategy: ${instance.name}`);
    }
    return instance.authorize(request);
  },

  /** Test seam: swap the strategy for one call, then reset(). */
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
