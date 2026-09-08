"use strict";
const express = require("express");
const { MAX_AMOUNT_CENTS, luhnValid, lookup } = require("./cards");

// GadgetVault mock payment gateway.
//
// A separate service, deliberately. It has its own package.json, its own
// port and its own response shape - the GadgetVault { success, data, error,
// meta } envelope does not appear anywhere in this file. That is the point:
// the API has to make a real HTTP call to something outside itself and
// translate a foreign response into its own domain, which is exactly the
// work an integration with Stripe or PayFast would involve.
//
// It is a mock in that no money moves. It is not a stub: the network call,
// the API key, the status codes, the failure modes and the latency are all
// real, and the API cannot tell the difference from the outside.

const API_KEY = process.env.GATEWAY_API_KEY || "dev-gateway-key";
const TIMEOUT_CARD_DELAY_MS = Number(process.env.GATEWAY_SLOW_MS) || 15000;

const app = express();
app.use(express.json({ limit: "16kb" }));

// Only ever log the last four digits. A full PAN in a log file is the
// classic way a system that never stores card data still leaks it.
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

// Every gateway authenticates its merchant. Header, not body, so the key
// never lands in a request log that records payloads.
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
    // Answer far too late on purpose, so the caller's own timeout is what
    // ends the request. This is the only way to prove a client timeout works.
    log(orderNumber, amountCents, card.number, `slow (${TIMEOUT_CARD_DELAY_MS}ms)`);
    await new Promise((resolve) => setTimeout(resolve, TIMEOUT_CARD_DELAY_MS));
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
