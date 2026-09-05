"use strict";
const mongoose = require("mongoose");

// A selectable finish shown on the product detail page ("SELECT VAULT FINISH").
const variantSchema = new mongoose.Schema(
  { name: { type: String, required: true }, hex: { type: String, required: true } },
  { _id: false }
);

// One row of the specifications table.
const specSchema = new mongoose.Schema(
  { label: { type: String, required: true }, value: { type: String, required: true } },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    slug:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    sku:         { type: String, required: true, unique: true, uppercase: true, trim: true },
    brand:       { type: String, required: true, trim: true },   // "Makers & Brands" filter
    description: { type: String, required: true },

    // Money is stored in cents as an integer. Never a float: 0.1 has no exact
    // binary representation, so Doubles drift over repeated arithmetic.
    priceCents:  { type: Number, required: true, min: 0 },

    categoryId:  { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    stockQty:    { type: Number, required: true, min: 0, default: 0 },

    images:      { type: [String], required: true, validate: (v) => v.length > 0 },
    variants:    { type: [variantSchema], default: [] },
    specs:       { type: [specSchema], default: [] },

    // Denormalised so the catalogue can show a rating without a second query.
    ratingAverage: { type: Number, min: 0, max: 5, default: 0 },
    ratingCount:   { type: Number, min: 0, default: 0 },

    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ name: "text", description: "text", brand: "text" });
productSchema.index({ categoryId: 1, isActive: 1 });
productSchema.index({ brand: 1, isActive: 1 });

module.exports = mongoose.model("Product", productSchema);
