"use strict";

// Test cards that force a specific outcome, as real gateways publish, so the failure
// paths are demonstrable. Anything not listed is approved if it passes Luhn.
const OUTCOMES = {
  "4000000000000002": { outcome: "declined", code: "card_declined",     message: "Card declined by issuer" },
  "4000000000000069": { outcome: "declined", code: "expired_card",      message: "Card has expired" },
  "4000000000000127": { outcome: "declined", code: "incorrect_cvc",     message: "Security code is incorrect" },
  "4000000000009995": { outcome: "declined", code: "insufficient_funds", message: "Insufficient funds" },
  "4000000000000119": { outcome: "error",    code: "processing_error",  message: "Issuer network unavailable" },
  "4000000000000259": { outcome: "timeout",  code: "timeout",           message: "Issuer did not respond" },
};

// A second, card-independent way to force a decline.
const MAX_AMOUNT_CENTS = 5000000; // R50 000.00

// Luhn checksum - what a real gateway checks before reaching the issuer.
function luhnValid(number) {
  const digits = String(number).replace(/\D/g, "");
  if (digits.length < 12 || digits.length > 19) return false;

  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number(digits[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

function lookup(number) {
  return OUTCOMES[String(number).replace(/\D/g, "")] || null;
}

module.exports = { OUTCOMES, MAX_AMOUNT_CENTS, luhnValid, lookup };
