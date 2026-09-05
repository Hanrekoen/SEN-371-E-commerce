"use strict";
const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    label:      { type: String, default: "Home" },
    line1:      { type: String, required: true },
    line2:      { type: String },
    city:       { type: String, required: true },
    province:   { type: String, required: true },
    postalCode: { type: String, required: true },
    country:    { type: String, required: true, default: "South Africa" },
    isDefault:  { type: Boolean, default: false },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
    lastName:  { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
    email:     { type: String, required: true, unique: true, lowercase: true, trim: true },

    // select:false keeps the hash out of every query result unless a caller
    // explicitly opts in with .select("+passwordHash"). This is what stops a
    // password hash leaking through an endpoint written in a hurry.
    passwordHash: { type: String, required: true, select: false },

    role:      { type: String, enum: ["customer", "admin"], default: "customer" },

    // Incremented on logout so outstanding refresh tokens stop verifying.
    tokenVersion: { type: Number, default: 0 },

    addresses: { type: [addressSchema], default: [] },
    isActive:  { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
