"use strict";
const express = require("express");
const { MAX_AMOUNT_CENTS, luhnValid, lookup } = require("./cards");

// GadgetVault mock payment gateway.
//
// A separate service on purpose: own package.json, own port, own response
// shape. The API has to make a real HTTP call and translate a foreign
// response into its own domain - the work a Stripe integration would involve.
// The network call, API key, status codes, latency and failures are real.
// Only the money is imaginary.

const API_KEY = process.env.GATEWAY_API_KEY || "dev-gateway-key";
const TIMEOUT_CARD_DELAY_MS = Number(process.env.GATEWAY_SLOW_MS) || 15000;

const app = express();
app.use(express.json({ limit: "16kb" }));

// Last four digits only - a full PAN in a log is how a system that never
// stores card data still leaks it.
function last4(number) {
  return String(number || "").replace(/\D/g, "").slice(-4);
}

function log(orderNumber, amountCents, card, outcome) {
  console.log(
    `[gateway] ${orderNumber || "-"} ${amountCents} ****${last4(card)} -> ${outcome}`
  );
}

app.get("/health", (_req, res) =>
  res.json({ service: "payment-gateway", status: "ok", time: new Date().toISOString() })
);

// Header, not body, so the key never lands in a payload log.
app.use((req, res, next) => {
  if (req.path === "/health") return next();
  if (req.get("x-api-key") !== API_KEY) {
    return res.status(401).json({
      status: "error",
      code: "unauthorised",
      message: "Missing or invalid API key",
    });
  }
  return next();
});

app.post("/authorize", async (req, res) => {
  const { amountCents, currency, orderNumber, card } = req.body || {};

  // --- request validation -------------------------------------------------
  const problems = [];
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    problems.push("amountCents must be a positive integer");
  }
  if (typeof currency !== "string" || !/^[A-Z]{3}$/.test(currency)) {
    problems.push("currency must be a three-letter ISO code");
  }
  if (typeof orderNumber !== "string" || orderNumber.length === 0) {
    problems.push("orderNumber is required");
  }
  if (!card || typeof card !== "object") {
    problems.push("card is required");
  } else {
    if (!luhnValid(card.number)) problems.push("card.number failed the checksum");
    if (!/^\d{3,4}$/.test(String(card.cvc || ""))) problems.push("card.cvc must be 3 or 4 digits");
    if (!Number.isInteger(card.expMonth) || card.expMonth < 1 || card.expMonth > 12) {
      problems.push("card.expMonth must be 1-12");
    }
    if (!Number.isInteger(card.expYear) || card.expYear < 2024) {
      problems.push("card.expYear is invalid");
    }
  }

  if (problems.length > 0) {
    log(orderNumber, amountCents, card && card.number, "rejected (400)");
    return res.status(400).json({
      status: "error",
      code: "invalid_request",
      message: problems.join("; "),
    });
  }

  // --- outcome ------------------------------------------------------------
  const rule = lookup(card.number);

  if (rule && rule.outcome === "timeout") {
    // Answer far too late on purpose, so the caller's timeout ends it.
    log(orderNumber, amountCents, card.number, `slow (${TIMEOUT_CARD_DELAY_MS}ms)`);
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, TIMEOUT_CARD_DELAY_MS);
      // unref: an abandoned stall must not hold the process open. The
      // listening socket keeps a real gateway alive regardless.
      if (typeof timer.unref === "function") timer.unref();
    });
    return res.status(200).json({
      status: "approved",
      reference: reference(),
      message: "Approved, eventually",
    });
  }

  if (rule && rule.outcome === "error") {
    log(orderNumber, amountCents, card.number, "gateway error (502)");
    return res.status(502).json({
      status: "error",
      code: rule.code,
      message: rule.message,
    });
  }

  if (rule && rule.outcome === "declined") {
    log(orderNumber, amountCents, card.number, `declined (${rule.code})`);
    return res.status(402).json({
      status: "declined",
      code: rule.code,
      message: rule.message,
      reference: null,
    });
  }

  if (amountCents > MAX_AMOUNT_CENTS) {
    log(orderNumber, amountCents, card.number, "declined (limit_exceeded)");
    return res.status(402).json({
      status: "declined",
      code: "limit_exceeded",
      message: "Amount exceeds the authorisation limit for this card",
      reference: null,
    });
  }

  log(orderNumber, amountCents, card.number, "approved");
  return res.status(200).json({
    status: "approved",
    reference: reference(),
    amountCents,
    currency,
    orderNumber,
    card: { last4: last4(card.number), brand: brandOf(card.number) },
    processedAt: new Date().toISOString(),
  });
});

function reference() {
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `PAY-${Date.now().toString(36).toUpperCase()}-${rand}`;
}

function brandOf(number) {
  const digits = String(number).replace(/\D/g, "");
  if (/^4/.test(digits)) return "visa";
  if (/^5[1-5]/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  return "unknown";
}

app.use((req, res) =>
  res.status(404).json({ status: "error", code: "not_found", message: `No route ${req.method} ${req.path}` })
);

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("[gateway] unhandled", err.message);
  res.status(500).json({ status: "error", code: "internal_error", message: "Gateway failure" });
});

module.exports = app;
