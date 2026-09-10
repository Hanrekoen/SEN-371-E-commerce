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
  // Rate limiting counts per IP. Behind a reverse proxy every request
  // carries the proxy's IP, so the whole internet shares one bucket unless
  // Express is told to read X-Forwarded-For. Trusting it when there is NO
  // proxy is worse: anyone can then spoof the header and get a fresh bucket
  // per request. Off by default, on only where a proxy actually terminates.
  trustProxy: process.env.TRUST_PROXY === "true" ? 1 : Number(process.env.TRUST_PROXY) || false,
  mongoUri: process.env.MONGODB_URI,
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessTtl: process.env.ACCESS_TOKEN_TTL || "15m",
    refreshTtl: process.env.REFRESH_TOKEN_TTL || "7d",
  },

  // --- Payment gateway (Person 2, Milestone 3) ---
  // Deliberately NOT in REQUIRED above. A teammate who has not started the
  // gateway must still be able to boot the API and work on their own routes;
  // the defaults below match payment-gateway/'s own defaults, so on a normal
  // dev machine this needs no .env entries at all.
  payment: {
    // "mock" makes the real HTTP call. "stub" answers in-process, no network.
    provider: process.env.PAYMENT_PROVIDER || (process.env.NODE_ENV === "test" ? "stub" : "mock"),
    apiUrl: process.env.PAYMENT_API_URL || "http://localhost:5001",
    apiKey: process.env.PAYMENT_API_KEY || "dev-gateway-key",
    // A hung provider must not hang the API.
    timeoutMs: Number(process.env.PAYMENT_TIMEOUT_MS) || 5000,
    currency: process.env.PAYMENT_CURRENCY || "ZAR",
  },
};
