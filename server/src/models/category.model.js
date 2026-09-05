"use strict";
const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, unique: true, trim: true, maxlength: 60 },
    slug:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, maxlength: 300 },
    icon:        { type: String },              // icon key used by the catalogue tiles
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", categorySchema);
