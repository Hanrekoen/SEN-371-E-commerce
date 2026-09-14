"use strict";
const rateLimit = require("express-rate-limit");
const env = require("../config/env");
const { TooManyRequestsError } = require("../errors/AppError");

// PERSON 2 OWNS THIS FILE. Limits live here; app.js applies them in order.

// A 429 goes through the AppError path so the client parses one envelope.
function reject(message) {
  return (_req, _res, next) => next(new TooManyRequestsError(message));
}

// Two explicit off-switches, so limiting is never off by accident: Jest would trip
// these mid-run (app.security.test.js sets RATE_LIMIT_IN_TESTS=true to re-enable,
// since it tests limiting), and the E2E suite drives the real server where its
// browser journeys from one IP exhaust the 300/15min global budget and everything
// after 429s - playwright.config.js sets RATE_LIMIT_DISABLED=true for that run.
const skipRateLimiting = () =>
  process.env.RATE_LIMIT_DISABLED === "true" ||
  (env.nodeEnv === "test" && process.env.RATE_LIMIT_IN_TESTS !== "true");

const WINDOW_MS = 15 * 60 * 1000;

// Tier 1: everything. A shopper never approaches 300; an enumeration script
// hits it in under a minute.
const apiLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimiting,
  handler: reject("Too many requests - please slow down and try again shortly"),
});

// Tier 2: anything that changes state. Reads repeat legitimately, writes
// do not. Sits on top of tier 1, so a write consumes both.
const writeLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => skipRateLimiting(req, res) || !isMutating(req),
  handler: reject("Too many changes in a short time - please try again shortly"),
});

function isMutating(req) {
  return req.method === "POST" || req.method === "PUT" ||
         req.method === "PATCH" || req.method === "DELETE";
}

// Tier 3 (login) lives in auth.routes.js but imports reject/skipRateLimiting from
// here, so all three tiers share one envelope and one off-switch. When it had its
// own, any suite signing in more than ten times failed on an unrelated 429.
module.exports = { apiLimiter, writeLimiter, WINDOW_MS, reject, skipRateLimiting };
