"use strict";
const express = require("express");
const { body } = require("express-validator");
const rateLimit = require("express-rate-limit");

const asyncHandler = require("../utils/asyncHandler");
const controller = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { reject, skipRateLimiting, WINDOW_MS } = require("../middleware/rateLimit");

// PERSON 2 OWNS THIS FILE.
// Milestone 3: the validate adapter moved to middleware/validate.js so every
// route file shares it. Behaviour unchanged.

const router = express.Router();

// Stricter than the global limiter: login is the endpoint worth guessing at, and
// normal users never approach 10 in 15 minutes. Uses the shared reject/
// skipRateLimiting so login 429s take the same error path and the same test
// off-switches - without them, a suite signing in >10 times failed on a stray 429.
const loginLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimiting,
  handler: reject("Too many login attempts, try again later"),
});

const registerRules = [
  body("firstName").trim().isLength({ min: 2, max: 50 }),
  body("lastName").trim().isLength({ min: 2, max: 50 }),
  body("email").isEmail().normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/\d/)
    .withMessage("Password must contain a number"),
];

const loginRules = [
  body("email").isEmail().normalizeEmail(),
  body("password").notEmpty(),
];

router.post("/register", registerRules, validate, asyncHandler(controller.register));
router.post("/login", loginLimiter, loginRules, validate, asyncHandler(controller.login));
router.post("/refresh", asyncHandler(controller.refresh));
router.post("/logout", authenticate, asyncHandler(controller.logout));
// The client calls this on every page load to restore a session.
router.get("/me", authenticate, asyncHandler(controller.me));

module.exports = router;
