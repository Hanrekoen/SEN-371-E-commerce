"use strict";
const rateLimit = require("express-rate-limit");
const env = require("../config/env");
const { TooManyRequestsError } = require("../errors/AppError");

// PERSON 2 OWNS THIS FILE. Limits live here; app.js applies them in order.

// A 429 goes through the AppError path so the client parses one envelope.
function reject(message) {
  return (_req, _res, next) => next(new TooManyRequestsError(message));
}

// Jest would otherwise trip these mid-suite. Set RATE_LIMIT_IN_TESTS=true
// in the one suite that tests limiting.
const skipInTests = () =>
  env.nodeEnv === "test" && process.env.RATE_LIMIT_IN_TESTS !== "true";

const WINDOW_MS = 15 * 60 * 1000;

// Tier 1: everything. A shopper never approaches 300; an enumeration script
// hits it in under a minute.
const apiLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  handler: reject("Too many requests - please slow down and try again shortly"),
});

// Tier 2: anything that changes state. Reads repeat legitimately, writes
// do not. Sits on top of tier 1, so a write consumes both.
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

// Tier 3 is the login limiter, kept in auth.routes.js next to the endpoint -
// but it shares reject() and skipInTests() from here, so all three tiers
// answer in the same envelope and all three are switched off in tests by the
// same flag. It used to define its own message and no skip, which meant any
// suite signing in more than ten times started failing on a 429 that had
// nothing to do with what it was testing.
module.exports = { apiLimiter, writeLimiter, WINDOW_MS, reject, skipInTests };
