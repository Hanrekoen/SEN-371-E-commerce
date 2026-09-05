"use strict";

/**
 * Registers every Mongoose model in one place.
 *
 * Mongoose only knows about a model once its file has been required. A
 * repository that calls .populate("categoryId") therefore fails with
 * MissingSchemaError unless the referenced model has already been loaded
 * somewhere. Requiring this module during startup registers all five, so
 * population works no matter which repository happens to load first.
 */

const User = require("./user.model");
const Category = require("./category.model");
const Product = require("./product.model");
const Cart = require("./cart.model");
const Order = require("./order.model");

module.exports = { User, Category, Product, Cart, Order };
