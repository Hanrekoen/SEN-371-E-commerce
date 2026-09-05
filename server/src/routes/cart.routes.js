"use strict";
const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const controller = require("../controllers/cart.controller");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// Every cart route requires a signed-in user.
router.use(authenticate);

router.get("/", asyncHandler(controller.getCart));
router.post("/items", asyncHandler(controller.addItem));
router.patch("/items/:productId", asyncHandler(controller.updateQuantity));
router.delete("/items/:productId", asyncHandler(controller.removeItem));
router.delete("/", asyncHandler(controller.clear));

module.exports = router;
