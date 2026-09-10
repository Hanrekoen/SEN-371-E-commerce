"use strict";
const express = require("express");
const { body, query } = require("express-validator");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const controller = require("../controllers/product.controller");
// Person 2 supplies these. Uncomment the guards once middleware/auth.js exists.
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

const ALLOWED_SORTS = ["priceAsc", "priceDesc", "newest", "rating"];

const listQueryRules = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("sort").optional().isIn(ALLOWED_SORTS),
  query("minPrice").optional().isFloat({ min: 0 }).toFloat(),
  query("maxPrice").optional().isFloat({ min: 0 }).toFloat(),
];

const productWriteRules = [
    body("name").trim().isLength({min: 2, max:120 }).withMessage("Name must be between 2 and 120 characters"),
    body("slug").matches(/^[a-z0-9]+(-[a-z0-9]+)*$/).withMessage("Slug must be lowercase letters, numbers, and hyphens only"),
    body("sku").matches(/^[A-Z0-9-]+$/).withMessage("SKU must be uppercase letters, hyphens and numbers only"),
    body("brand").trim().notEmpty().withMessage("Brand must be filled in"),
    body("description").trim().notEmpty().withMessage("Description is required"),
    body("priceCents").isInt({ min: 0 }).withMessage("Price must be a non-negative integer"),
    body("categoryId").isMongoId().withMessage("Category ID must be a valid MongoDB ObjectId"),
    body("stockQty").isInt({ min: 0 }).toInt().withMessage("Stock quantity must be a non-negative integer"),
    body("images").isArray({ min: 1 }).withMessage("Images must be an array of URLs"),
    body("images.*").isURL().withMessage("Each image must be a valid URL"),
    body("variants").optional().isArray(),
    body("specs").optional().isArray(),
];

// Public
router.get("/", listQueryRules, validate, asyncHandler(controller.list));
router.get("/brands", asyncHandler(controller.listBrands));
router.get("/:slug", asyncHandler(controller.getBySlug));

// Admin only
router.post("/",       authenticate, requireRole("admin"),productWriteRules, validate, asyncHandler(controller.create));
router.put("/:id",     authenticate, requireRole("admin"),productWriteRules, validate, asyncHandler(controller.update));
router.delete("/:id",  authenticate, requireRole("admin"), asyncHandler(controller.deactivate));

module.exports = router;
