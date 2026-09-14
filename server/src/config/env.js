"use strict";
require("dotenv").config();

// Fail loudly at startup rather than silently at request time.
const REQUIRED = ["MONGODB_URI", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];
const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(
    "Missing required environment variables: " + missing.join(", ") +
    ". Copy .env.example to server/.env and fill it in."
  );
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  port: Number(process.env.PORT) || 5000,
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  // Off by default: trusting X-Forwarded-For with no proxy in front lets a
  // client spoof its IP and get a fresh rate-limit bucket per request.
  trustProxy: process.env.TRUST_PROXY === "true" ? 1 : Number(process.env.TRUST_PROXY) || false,

  mongoUri: process.env.MONGODB_URI,
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessTtl: process.env.ACCESS_TOKEN_TTL || "15m",
    refreshTtl: process.env.REFRESH_TOKEN_TTL || "7d",
  },

  // Payment gateway (Milestone 3). Deliberately NOT in REQUIRED: the defaults
  // match src/gateway/, so a dev machine needs no .env entries for it.
  payment: {
    // "mock" = real HTTP call, "stub" = in-process.
    provider: process.env.PAYMENT_PROVIDER || (process.env.NODE_ENV === "test" ? "stub" : "mock"),
    apiUrl: process.env.PAYMENT_API_URL || "http://localhost:5001",
    apiKey: process.env.PAYMENT_API_KEY || "dev-gateway-key",
    timeoutMs: Number(process.env.PAYMENT_TIMEOUT_MS) || 5000,
    currency: process.env.PAYMENT_CURRENCY || "ZAR",

    // The mock gateway runs inside this process on its own port, so `npm
    // start` is the only command needed. The API still reaches it over HTTP -
    // nothing about the integration is short-circuited, it just no longer
    // needs a second terminal. Set PAYMENT_EMBEDDED=false to host it
    // elsewhere and point PAYMENT_API_URL at it.
    embedded: process.env.PAYMENT_EMBEDDED !== "false",
    gatewayPort: Number(process.env.PAYMENT_GATEWAY_PORT) || 5001,
  },
};
