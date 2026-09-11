"use strict";
const express = require("express");
const { body, param, query } = require("express-validator");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const orderController = require("../controllers/order.controller");
const adminController = require("../controllers/admin.controller");
const { ORDER_STATUSES } = require("../models/order.model");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

// Every route below is admin-only, so the guard is mounted once rather than
// repeated per route - one place to get it wrong instead of eight.
router.use(authenticate, requireRole("admin"));

const listOrdersRules = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("status").optional().isIn(ORDER_STATUSES),
];

const statusRules = [
  body("status").isIn(ORDER_STATUSES).withMessage(`status must be one of: ${ORDER_STATUSES.join(", ")}`),
];

const listProductRules = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("q").optional().trim().isLength({ max: 120 }),
  query("brand").optional().trim().isLength({ max: 80 }),
  query("categoryId").optional().isMongoId(),
];

const idParam = [param("id").isMongoId().withMessage("Invalid id")];

const stockRules = [
  ...idParam,
  body("delta")
    .isInt({ min: -10000, max: 10000 })
    .withMessage("delta must be a whole number between -10000 and 10000")
    .toInt()
    .custom((v) => v !== 0)
    .withMessage("delta cannot be zero"),
];

router.get("/stats", asyncHandler(adminController.stats));

router.get("/orders", listOrdersRules, validate, asyncHandler(orderController.listAll));
router.patch("/orders/:id/status", [...idParam, ...statusRules], validate, asyncHandler(orderController.updateStatus));

router.get("/products", listProductRules, validate, asyncHandler(adminController.listProducts));
router.get("/products/:id", idParam, validate, asyncHandler(adminController.getProduct));
router.patch("/products/:id/reactivate", idParam, validate, asyncHandler(adminController.reactivateProduct));
router.patch("/products/:id/stock", stockRules, validate, asyncHandler(adminController.adjustStock));

module.exports = router;
