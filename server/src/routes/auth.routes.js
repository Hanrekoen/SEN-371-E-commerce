"use strict";
const express = require("express");
const { body, validationResult } = require("express-validator");
const rateLimit = require("express-rate-limit");

const asyncHandler = require("../utils/asyncHandler");
const controller = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth");
const { ValidationError } = require("../errors/AppError");

// Person 1: mount with  router.use("/auth", require("./auth.routes"));
// in routes/index.js (that file is yours to edit, so left commented there).

const router = express.Router();

// Small local adapter so express-validator's result plugs into the
// project's single AppError -> errorHandler path instead of each route
// handling its own 400 response.
function validate(req, _res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ValidationError(
      "Request validation failed",
      errors.array().map((e) => ({ field: e.path, message: e.msg }))
    ));
  }
  return next();
}

// Slows down credential stuffing / brute-force guessing without
// affecting normal users, who never come close to this in 15 minutes.
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
