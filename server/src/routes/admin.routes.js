"use strict";
const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const orderController = require("../controllers/order.controller");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/orders",             authenticate, requireRole("admin"), asyncHandler(orderController.listAll));
router.patch("/orders/:id/status",authenticate, requireRole("admin"), asyncHandler(orderController.updateStatus));

module.exports = router;
