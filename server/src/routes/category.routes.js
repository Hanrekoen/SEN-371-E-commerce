"use strict"
const express = require("express");
const asynchandler = require("../utils/asyncHandler");
const controller = require("../controllers/category.controller");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();
//public routes
router.get("/", asynchandler(controller.list));
router.get("/:slug", asynchandler(controller.getbyslug));
//admin routes
router.post("/", authenticate, requireRole("admin"), asynchandler(controller.create));
router.put("/:id", authenticate, requireRole("admin"), asynchandler(controller.update));
router.delete("/:id", authenticate, requireRole("admin"), asynchandler(controller.remove));

module.exports = router;