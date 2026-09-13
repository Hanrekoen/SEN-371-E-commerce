"use strict";
const express = require("express");
const { body, query } = require("express-validator");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const controller = require("../controllers/product.controller");
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
    // isURL() alone rejects a root-relative path, which is what every seeded
    // product uses (/product-pictures/...). Requiring an absolute URL would
    // make it impossible to add a product using an image the app actually
    // ships, so both forms are accepted - and nothing else is.
    body("images.*")
      .isString()
      .bail()
      .custom((value) => {
        const url = String(value).trim();
        // A root-relative path: /product-pictures/x.jpg. "//host/x" is
        // excluded because it is protocol-relative, not a local path.
        if (/^\/(?!\/)\S*$/.test(url)) return true;
        // Otherwise it must be an absolute http(s) URL with a host.
        try {
          const parsed = new URL(url);
          return (parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.hostname.length > 0;
        } catch {
          return false;
        }
      })
      .withMessage("Each image must be an http(s) URL or a path beginning with /"),
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
