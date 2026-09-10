"use strict";
const PaymentProvider = require("./PaymentProvider");
const { ServiceUnavailableError, ValidationError } = require("../../errors/AppError");

// The real implementation: an HTTP call to the payment-gateway service.
// Node 22 has global fetch, so there is no HTTP client dependency.

class MockPaymentProvider extends PaymentProvider {
  constructor({ baseUrl, apiKey, timeoutMs = 5000 } = {}) {
    super();
    if (!baseUrl) {
      throw new Error("MockPaymentProvider needs a baseUrl - set PAYMENT_API_URL");
    }
    this.baseUrl = String(baseUrl).replace(/\/+$/, "");
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
  }

  async authorize({ amountCents, currency, orderNumber, card }) {
    // The amount must come from orderFactory's calculation. Anything else is
    // a price-tampering bug, stopped here as well as at the route.
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      throw new Error("authorize() needs a positive integer amountCents from the calculated order total");
    }

    let response;
    try {
      response = await fetch(`${this.baseUrl}/authorize`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": this.apiKey },
        body: JSON.stringify({ amountCents, currency, orderNumber, card }),
        signal: AbortSignal.timeout(this.timeoutMs), // a hung provider must not hang us
      });
    } catch (err) {
      // No response at all. We do not know whether the payment went through,
      // so we must not claim it did.
      const timedOut = err.name === "TimeoutError" || err.name === "AbortError";
      console.error(
        `[payment] ${orderNumber} ${timedOut ? `no response within ${this.timeoutMs}ms` : `unreachable: ${err.message}`}`
      );
      throw new ServiceUnavailableError(
        "The payment provider is not responding - your card has not been charged"
      );
    }

    let body;
    try {
      body = await response.json();
    } catch {
      console.error(`[payment] ${orderNumber} unreadable body, HTTP ${response.status}`);
      throw new ServiceUnavailableError(
        "The payment provider returned an unreadable response - your card has not been charged"
      );
    }

    if (response.ok && body.status === "approved") {
      console.log(`[payment] ${orderNumber} approved ref=${body.reference}`);
      return {
        approved: true,
        providerReference: body.reference,
        message: "Payment approved",
        code: null,
      };
    }

    // A decline is a normal answer, so it is a value and not an exception.
    if (response.status === 402 || body.status === "declined") {
      console.log(`[payment] ${orderNumber} declined code=${body.code}`);
      return {
        approved: false,
        providerReference: null,
        message: body.message || "Your card was declined",
        code: body.code || "card_declined",
      };
    }

    // Bad card details are the customer's to fix, so a 400 rather than a 503.
    if (response.status === 400) {
      console.warn(`[payment] ${orderNumber} rejected by provider: ${body.message}`);
      throw new ValidationError("The payment provider rejected these card details", [
        { field: "card", message: body.message || "Invalid card details" },
      ]);
    }

    // 401 lands here too: a bad API key is our misconfiguration, logged
    // loudly and shown to the customer as a 503.
    console.error(
      `[payment] ${orderNumber} provider error HTTP ${response.status} code=${body.code} ${body.message || ""}`
    );
    throw new ServiceUnavailableError(
      "The payment provider is unavailable - your card has not been charged"
    );
  }
}

module.exports = MockPaymentProvider;
