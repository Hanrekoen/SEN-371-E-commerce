"use strict";
const express = require("express");
const { body } = require("express-validator");
const rateLimit = require("express-rate-limit");

const asyncHandler = require("../utils/asyncHandler");
const controller = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth");
const validate = require("../middleware/validate");

// PERSON 2 OWNS THIS FILE.
// Milestone 3: the validate adapter moved to middleware/validate.js so every
// route file shares it. Behaviour unchanged.

const router = express.Router();

// Stricter than the global limiter, because login is the endpoint actually
// worth guessing at. Normal users never approach 10 in 15 minutes.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, data: null, error: { code: "RATE_LIMITED", message: "Too many login attempts, try again later" }, meta: null },
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

module.exports = router;
