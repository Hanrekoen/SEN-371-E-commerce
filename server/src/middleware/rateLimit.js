"use strict";
const rateLimit = require("express-rate-limit");
const env = require("../config/env");
const { TooManyRequestsError } = require("../errors/AppError");

// PERSON 2 OWNS THIS FILE.
//
// Rate limiting, in tiers. The limits sit here rather than inline in app.js
// so they can be read, changed and reasoned about in one place, and so a
// test can import them; app.js is where they are applied, in order.

// A 429 goes through the same AppError -> errorHandler path as every other
// failure, so the client parses one envelope shape and not two. This is why
// the limiters use a handler instead of the `message` option.
function reject(message) {
  return (_req, _res, next) => next(new TooManyRequestsError(message));
}

// Jest would otherwise trip these within a single suite and fail unrelated
// tests. Set RATE_LIMIT_IN_TESTS=true in the one suite that tests limiting.
const skipInTests = () =>
  env.nodeEnv === "test" && process.env.RATE_LIMIT_IN_TESTS !== "true";

const WINDOW_MS = 15 * 60 * 1000;

/**
 * Tier 1 - everything.
 *
 * 300 requests / 15 minutes / IP, roughly one every three seconds sustained.
 * A customer browsing the catalogue, filtering and paging comes nowhere near
 * it; a script enumerating /products?page=1..n hits it in under a minute.
 */
const apiLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  handler: reject("Too many requests - please slow down and try again shortly"),
});

/**
 * Tier 2 - anything that changes state.
 *
 * Reads are cheap and repeat legitimately; writes are neither. 60 in 15
 * minutes is far more than a real shopper performs and far less than an
 * abuse script wants. Sits on top of tier 1, so a write consumes both.
 */
const writeLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => skipInTests(req, res) || !isMutating(req),
  handler: reject("Too many changes in a short time - please try again shortly"),
});

function isMutating(req) {
  return req.method === "POST" || req.method === "PUT" ||
         req.method === "PATCH" || req.method === "DELETE";
}

// Tier 3, the strictest, is the login limiter. It stays in auth.routes.js
// next to the endpoint it exists for. See docs/SECURITY.md, A07.

module.exports = { apiLimiter, writeLimiter, WINDOW_MS };
