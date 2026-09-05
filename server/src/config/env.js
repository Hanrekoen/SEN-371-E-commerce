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
  mongoUri: process.env.MONGODB_URI,
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessTtl: process.env.ACCESS_TOKEN_TTL || "15m",
    refreshTtl: process.env.REFRESH_TOKEN_TTL || "7d",
  },
};
