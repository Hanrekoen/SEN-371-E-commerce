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

  /**
   * Milestone 3 (4.3): categories used to return the whole collection with no
   * pagination while products and orders both paged and returned meta. The
   * shape now matches theirs - { items, total, page, limit } - so one client
   * pagination helper works against every list endpoint.
   */
  async list({ page = 1, limit = 20 } = {}) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (safePage - 1) * safeLimit;

    const [items, total] = await Promise.all([
      this.model.find().sort({ name: 1 }).skip(skip).limit(safeLimit).exec(),
      this.model.countDocuments().exec(),
    ]);

    return { items, total, page: safePage, limit: safeLimit };
  }
}

module.exports = new CategoryRepository;
