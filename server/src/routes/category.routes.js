"use strict";
const express = require("express");
const { body, param, query } = require("express-validator");

const asynchandler = require("../utils/asyncHandler");
const controller = require("../controllers/category.controller");
const { authenticate, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");

// PERSON 4 OWNS THIS FILE.
//
// Milestone 3 (4.2): the rules below are Person 4's, moved onto the shared
// middleware/validate.js so a category validation failure produces the same
// 400 envelope as every other endpoint rather than a hand-built one.

const router = express.Router();

// slug is optional: category.service derives it from the name when absent.
// When it IS supplied the format is enforced, because the service slugifies
// whatever it is given and a malformed slug would silently become a
// different string from the one the client asked for.
const categoryRules = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 60 })
    .withMessage("name must be between 2 and 60 characters"),
  body("slug")
    .optional()
    .trim()
    .matches(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    .withMessage("slug must be lowercase letters, numbers and hyphens only"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage("description must be 300 characters or less"),
];

const idParam = [param("id").isMongoId().withMessage("Invalid category id")];

// 4.3: categories paginate like products and orders. The cap of 100 is
// enforced here as well as in the repository - an unbounded ?limit= is how
// a list endpoint becomes a denial-of-service lever.
const listRules = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
];

// public routes
router.get("/", listRules, validate, asynchandler(controller.list));
router.get("/:slug", asynchandler(controller.getbyslug));

// admin routes
router.post("/", authenticate, requireRole("admin"), categoryRules, validate, asynchandler(controller.create));
router.put("/:id", authenticate, requireRole("admin"), [...idParam, ...categoryRules], validate, asynchandler(controller.update));
router.delete("/:id", authenticate, requireRole("admin"), idParam, validate, asynchandler(controller.remove));

module.exports = router;
