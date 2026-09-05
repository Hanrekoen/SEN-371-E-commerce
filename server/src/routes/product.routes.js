"use strict";
const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const controller = require("../controllers/product.controller");
// Person 2 supplies these. Uncomment the guards once middleware/auth.js exists.
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

// Public
router.get("/", asyncHandler(controller.list));
router.get("/brands", asyncHandler(controller.listBrands));
router.get("/:slug", asyncHandler(controller.getBySlug));

// Admin only
router.post("/",       authenticate, requireRole("admin"), asyncHandler(controller.create));
router.put("/:id",     authenticate, requireRole("admin"), asyncHandler(controller.update));
router.delete("/:id",  authenticate, requireRole("admin"), asyncHandler(controller.deactivate));

module.exports = router;
