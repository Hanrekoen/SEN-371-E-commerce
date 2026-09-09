"use strict";
const express = require("express");
const { body, query } = require("express-validator");
const asyncHandler = require("../utils/asyncHandler");
validate = require("../middleware/validate");
const orderController = require("../controllers/order.controller");
const {ORDER_STATUS} = require("../utils/constants");
const { authenticate, requireRole } = require("../middleware/auth");
const { ORDER_STATUSES } = require("../models/order.model");
const validate = require("../middleware/validate");

const router = express.Router();

const listOrderRules = [ 
    body("status").isIn(ORDER_STATUSES).withMessage('status must be one of: ${ORDER_STATUSES.join}(",")}'),
];

router.get("/orders",             authenticate, requireRole("admin"), listOrderRules, validate, asyncHandler(orderController.listAll));
router.patch("/orders/:id/status",authenticate, requireRole("admin"), statusRules, validate, asyncHandler(orderController.updateStatus));

module.exports = router;
