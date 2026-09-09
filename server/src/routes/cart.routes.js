"use strict";
const express = require("express");
const { body, param } = require("express-validator");

const asyncHandler = require("../utils/asyncHandler");
const controller = require("../controllers/cart.controller");
const { authenticate } = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();

// Every cart route requires a signed-in user.
router.use(authenticate);

// The service already rejects quantities that exceed stock (BusinessRuleError,
// 422) - that's a business rule and stays in cart.service.js. This is the
// layer above it: malformed input never reaches that check at all.
// 100 is an arbitrary but generous per-line cap; it exists so a typo or a
// scripted request can't ask the service to reason about quantity 999999.
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

router.get("/", asyncHandler(controller.getCart));
router.post("/items", addItemRules, validate, asyncHandler(controller.addItem));
router.patch("/items/:productId", updateQuantityRules, validate, asyncHandler(controller.updateQuantity));
router.delete("/items/:productId", [productIdParam], validate, asyncHandler(controller.removeItem));
router.delete("/", asyncHandler(controller.clear));

module.exports = router;
