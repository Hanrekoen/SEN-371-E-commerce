"use strict";
const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const controller = require("../controllers/order.controller");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// Every route here requires a signed-in customer.
router.post("/",    authenticate, asyncHandler(controller.checkout));
router.get("/",     authenticate, asyncHandler(controller.listMine));
router.get("/:id",  authenticate, asyncHandler(controller.getMine));

module.exports = router;
