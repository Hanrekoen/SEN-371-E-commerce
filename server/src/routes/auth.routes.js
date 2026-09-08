"use strict";
const express = require("express");
const { body } = require("express-validator");
const rateLimit = require("express-rate-limit");

const asyncHandler = require("../utils/asyncHandler");
const controller = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth");
const validate = require("../middleware/validate");

// PERSON 2 OWNS THIS FILE.
//
// Milestone 3: the validate adapter that used to live here has moved to
// middleware/validate.js so products, orders, cart and categories share it.
// Behaviour is unchanged - same 400, same error.details shape.

const router = express.Router();

// Slows down credential stuffing / brute-force guessing without
// affecting normal users, who never come close to this in 15 minutes.
// The global limiter in app.js sits above this one; this stricter tier
// stays because login is the endpoint actually worth guessing at.
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
