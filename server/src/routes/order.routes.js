"use strict";
const express = require("express");
const { body, query } = require("express-validator");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const controller = require("../controllers/order.controller");
const { authenticate, shoppersOnly } = require("../middleware/auth");

const router = express.Router();


const checkoutRules = [
body("shippingAddress").exists().withMessage("shippingAddress is required"),
body("shippingAddress.line1").notEmpty().withMessage("line1 is required"), 
body("shippingAddress.city").notEmpty().withMessage("city is required"),
body("shippingAddress.province").notEmpty().withMessage("province is required"), 
body("shippingAddress.country").notEmpty().withMessage("country is required"),
body("shippingAddress.postalCode").matches(/^\d{4}$/).withMessage("postalCode must be a 4-digit number"),
body("card.number").notEmpty().withMessage("card number is required"),
body("card.expMonth").isInt({ min: 1, max: 12 }).withMessage("expMonth must be 1-12"),
body("card.expYear").isInt({ min: 2024 }).withMessage("expYear must be valid"), 
body("card.cvc").notEmpty().withMessage("cvc is required"),
];

const listQueryRules = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
];
// Every route here requires a signed-in customer.
// shoppersOnly: an admin administers orders, it does not place them.
router.post("/",    authenticate, shoppersOnly, checkoutRules, validate, asyncHandler(controller.checkout));
router.get("/",     authenticate, listQueryRules, validate, asyncHandler(controller.listMine));
router.get("/:id",  authenticate, asyncHandler(controller.getMine));

module.exports = router;
