"use strict";
const express = require("express");
const { body, query } = require("express-validator");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const orderController = require("../controllers/order.controller");
const { ORDER_STATUSES } = require("../models/order.model");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

const listOrdersRules = [
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
    query("status").optional().isIn(ORDER_STATUSES),
];

const statusRules = [
    body("status").isIn(ORDER_STATUSES).withMessage(`status must be one of: ${ORDER_STATUSES.join(", ")}`),
];

router.get("/orders",              authenticate, requireRole("admin"), listOrdersRules, validate, asyncHandler(orderController.listAll));
router.patch("/orders/:id/status", authenticate, requireRole("admin"), statusRules, validate, asyncHandler(orderController.updateStatus));

module.exports = router;
