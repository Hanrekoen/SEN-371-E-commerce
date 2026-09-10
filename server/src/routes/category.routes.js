"use strict";
const express = require("express");
const { body, param, query } = require("express-validator");

const asynchandler = require("../utils/asyncHandler");
const controller = require("../controllers/category.controller");
const { authenticate, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");

// PERSON 4 OWNS THIS FILE.
// Milestone 3 (4.2): rules moved onto the shared middleware/validate.js, so a
// category failure returns the same 400 envelope as every other endpoint.

const router = express.Router();

// slug is optional - the service derives it from the name. When supplied the
// format is checked, since slugify would silently change a malformed one.
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

// 4.3: paginate like products and orders. Capped at 100 here and in the
// repository - an unbounded ?limit= is a denial-of-service lever.
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
