"use strict";
const PaymentProvider = require("./PaymentProvider");
const { ServiceUnavailableError, ValidationError } = require("../../errors/AppError");

// Strategy pattern - the real implementation.
//
// Makes an HTTP call over the network to the payment-gateway service, handles
// the response, and copes when there isn't one. Node 22 has global fetch, so
// there is no HTTP client dependency to add.

class MockPaymentProvider extends PaymentProvider {
  /**
   * @param {Object} options
   * @param {string} options.baseUrl    e.g. http://localhost:5001
   * @param {string} options.apiKey
   * @param {number} [options.timeoutMs=5000]
   */
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
    // The amount is the one thing that must never be taken on trust. It comes
    // from orderFactory's calculation; a caller passing anything else is a
    // price-tampering bug and is stopped here as well as at the route.
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      throw new Error("authorize() needs a positive integer amountCents from the calculated order total");
    }

    let response;
    try {
      response = await fetch(`${this.baseUrl}/authorize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
        },
        body: JSON.stringify({ amountCents, currency, orderNumber, card }),
        // A hung provider must not hang our API. Without this the request
        // sits until the client gives up, holding a connection and a
        // half-decremented order open the whole time.
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      // No response at all: DNS failure, connection refused, socket reset,
      // or our own timeout firing. All the same to the caller - we do not
      // know whether the payment went through, so we must not claim it did.
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
      console.error(`[payment] ${orderNumber} provider returned unreadable body, HTTP ${response.status}`);
      throw new ServiceUnavailableError(
        "The payment provider returned an unreadable response - your card has not been charged"
      );
    }

    // --- approved ---------------------------------------------------------
    if (response.ok && body.status === "approved") {
      console.log(`[payment] ${orderNumber} approved ref=${body.reference}`);
      return {
        approved: true,
        providerReference: body.reference,
        message: "Payment approved",
        code: null,
      };
    }

    // --- declined: a normal answer from a working provider ----------------
    if (response.status === 402 || body.status === "declined") {
      console.log(`[payment] ${orderNumber} declined code=${body.code}`);
      return {
        approved: false,
        providerReference: null,
        message: body.message || "Your card was declined",
        code: body.code || "card_declined",
      };
    }

    // --- our request was wrong -------------------------------------------
    // Bad card details reach here. That is the customer's to fix, so it
    // surfaces as a 400 rather than being hidden behind a 503.
    if (response.status === 400) {
      console.warn(`[payment] ${orderNumber} rejected by provider: ${body.message}`);
      throw new ValidationError("The payment provider rejected these card details", [
        { field: "card", message: body.message || "Invalid card details" },
      ]);
    }

    // --- anything else: provider trouble ----------------------------------
    // 401 lands here too. A bad API key is our misconfiguration, not the
    // customer's problem, so it is logged loudly and returned as a 503.
    console.error(
      `[payment] ${orderNumber} provider error HTTP ${response.status} code=${body.code} ${body.message || ""}`
    );
    throw new ServiceUnavailableError(
      "The payment provider is unavailable - your card has not been charged"
    );
  }
}

module.exports = MockPaymentProvider;
