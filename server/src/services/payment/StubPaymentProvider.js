"use strict";
const PaymentProvider = require("./PaymentProvider");
const { ServiceUnavailableError } = require("../../errors/AppError");

// Strategy pattern - the test implementation.
//
// Same contract, no network. Tests that exercise checkout care about what the
// order looks like after an approval or a decline, not about HTTP; making
// them start a second server would be slow, flaky and beside the point.
//
// It answers on the same test-card numbers the real gateway does, so a test
// and a manual demo force a decline the same way.

const DECLINE_CARDS = {
  "4000000000000002": { code: "card_declined",      message: "Card declined by issuer" },
  "4000000000000069": { code: "expired_card",       message: "Card has expired" },
  "4000000000000127": { code: "incorrect_cvc",      message: "Security code is incorrect" },
  "4000000000009995": { code: "insufficient_funds", message: "Insufficient funds" },
};
const UNAVAILABLE_CARDS = ["4000000000000119", "4000000000000259"];
const MAX_AMOUNT_CENTS = 5000000;

class StubPaymentProvider extends PaymentProvider {
  /**
   * @param {Object}       [options]
   * @param {boolean|null} [options.forceApproved]  true or false to override the card rules entirely
   * @param {boolean}      [options.forceUnavailable] throw ServiceUnavailableError on every call
   */
  constructor({ forceApproved = null, forceUnavailable = false } = {}) {
    super();
    this.forceApproved = forceApproved;
    this.forceUnavailable = forceUnavailable;
    /** Every call recorded, so a test can assert what checkout actually sent. */
    this.calls = [];
  }

  async authorize({ amountCents, currency, orderNumber, card }) {
    this.calls.push({ amountCents, currency, orderNumber, last4: String(card && card.number || "").slice(-4) });

    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      throw new Error("authorize() needs a positive integer amountCents from the calculated order total");
    }

    if (this.forceUnavailable) {
      throw new ServiceUnavailableError(
        "The payment provider is not responding - your card has not been charged"
      );
    }

    if (this.forceApproved === true) return approve();
    if (this.forceApproved === false) {
      return decline("card_declined", "Your card was declined");
    }

    const number = String(card && card.number || "").replace(/\D/g, "");

    if (UNAVAILABLE_CARDS.includes(number)) {
      throw new ServiceUnavailableError(
        "The payment provider is not responding - your card has not been charged"
      );
    }

    const rule = DECLINE_CARDS[number];
    if (rule) return decline(rule.code, rule.message);

    if (amountCents > MAX_AMOUNT_CENTS) {
      return decline("limit_exceeded", "Amount exceeds the authorisation limit for this card");
    }

    return approve();
  }
}

function approve() {
  return {
    approved: true,
    providerReference: `PAY-STUB-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
    message: "Payment approved",
    code: null,
  };
}

function decline(code, message) {
  return { approved: false, providerReference: null, message, code };
}

module.exports = StubPaymentProvider;
