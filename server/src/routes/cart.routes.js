"use strict";
const express = require("express");
const { body, param } = require("express-validator");

const asyncHandler = require("../utils/asyncHandler");
const controller = require("../controllers/cart.controller");
const { authenticate, shoppersOnly } = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();

// Every cart route requires a signed-in user.
router.use(authenticate);

// The stock limit is a business rule and stays in cart.service.js (422).
// This cap only stops malformed input reaching it at all.
const MAX_LINE_QUANTITY = 100;

const productIdParam = param("productId").isMongoId().withMessage("Invalid product id");

const addItemRules = [
  body("productId").isMongoId().withMessage("Invalid product id"),
  body("quantity")
    .isInt({ min: 1, max: MAX_LINE_QUANTITY })
    .withMessage(`Quantity must be between 1 and ${MAX_LINE_QUANTITY}`),
  body("finish").optional().isString().trim().isLength({ max: 60 }),
];

const updateQuantityRules = [
  productIdParam,
  body("quantity")
    .isInt({ min: 1, max: MAX_LINE_QUANTITY })
    .withMessage(`Quantity must be between 1 and ${MAX_LINE_QUANTITY}`),
];

// Reading a cart is harmless for anyone signed in - an admin viewing the app
// should see an empty cart rather than a 403 on every page load, because the
// navbar asks for it on every route.
router.get("/", asyncHandler(controller.getCart));

// Filling one is not: an admin who cannot check out must not be able to build
// a basket that can never be used.
router.post("/items", shoppersOnly, addItemRules, validate, asyncHandler(controller.addItem));
router.patch("/items/:productId", shoppersOnly, updateQuantityRules, validate, asyncHandler(controller.updateQuantity));
router.delete("/items/:productId", shoppersOnly, [productIdParam], validate, asyncHandler(controller.removeItem));
router.delete("/", shoppersOnly, asyncHandler(controller.clear));

module.exports = router;
