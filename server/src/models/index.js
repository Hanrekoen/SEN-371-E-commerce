"use strict";

// Mongoose only knows a model once its file is required, so .populate("categoryId")
// throws MissingSchemaError otherwise. Requiring this at startup registers all five.

const User = require("./user.model");
const Category = require("./category.model");
const Product = require("./product.model");
const Cart = require("./cart.model");
const Order = require("./order.model");

module.exports = { User, Category, Product, Cart, Order };
