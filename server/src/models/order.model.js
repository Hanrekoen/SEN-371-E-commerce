"use strict";
const mongoose = require("mongoose");

const ORDER_STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"];

// Order items COPY the name and price at purchase time. An order is a
// financial record: renaming or repricing a product later must not rewrite it.
const orderItemSchema = new mongoose.Schema(
  {
    productId:      { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name:           { type: String, required: true },
    finish:         { type: String },
    unitPriceCents: { type: Number, required: true, min: 0 },
    quantity:       { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    line1:      { type: String, required: true },
    line2:      { type: String },
    city:       { type: String, required: true },
    province:   { type: String, required: true },
    postalCode: { type: String, required: true },
    country:    { type: String, required: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items:       { type: [orderItemSchema], required: true, validate: (v) => v.length > 0 },

    subtotalCents: { type: Number, required: true, min: 0 },
    shippingCents: { type: Number, required: true, min: 0 },
    taxCents:      { type: Number, required: true, min: 0 },
    totalCents:    { type: Number, required: true, min: 0 },

    status:          { type: String, enum: ORDER_STATUSES, default: "pending" },
    shippingAddress: { type: shippingAddressSchema, required: true },
    paymentReference:{ type: String },
  },
  { timestamps: true }
);

orderSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);
module.exports.ORDER_STATUSES = ORDER_STATUSES;
