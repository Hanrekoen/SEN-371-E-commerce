"use strict";
const mongoose = require("mongoose");

// Cart items REFERENCE the product, so the cart always reflects the current
// price and stock. Compare with order items, which embed a snapshot.
const cartItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    quantity:  { type: Number, required: true, min: 1 },
    finish:    { type: String },   // chosen variant name, e.g. "Obsidian Black"
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    items:  { type: [cartItemSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cart", cartSchema);
