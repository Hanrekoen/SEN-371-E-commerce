"use strict";
const baseRepository = require("./base.repository");
const Category = require("../models/category.model");

// PERSON 4 OWNS THIS FILE

class CategoryRepository extends baseRepository {
  constructor() {
    super(Category);
  }
  async findByslug(slug) {
    return this.findOne({ slug });
  }
  async findByName(name) {
    return this.findOne({ name });
  }

  async list() {
    return this.model.find().sort({ name: 1 }).exec();
  }
}

module.exports = new CategoryRepository;