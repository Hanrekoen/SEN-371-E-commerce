"use strict";
const BaseRepository = require("./base.repository");
const Product = require("../models/product.model");

class ProductRepository extends BaseRepository {
  constructor() {
    super(Product);
  }

  // Catalogue search: text query, category and brand filters, pagination.
  async search({ q, categoryId, brand, minCents, maxCents, sort, page = 1, limit = 12, includeInactive = false }) {
    // Customers only ever see active products; admins manage all of them.
    const filter = includeInactive ? {} : { isActive: true };
    if (q) filter.$text = { $search: q };
    if (categoryId) filter.categoryId = categoryId;
    if (brand) filter.brand = brand;
    if (minCents != null || maxCents != null) {
      filter.priceCents = {};
      if (minCents != null) filter.priceCents.$gte = minCents;
      if (maxCents != null) filter.priceCents.$lte = maxCents;
    }

    const sortMap = {
      priceAsc:  { priceCents: 1 },
      priceDesc: { priceCents: -1 },
      rating:    { ratingAverage: -1 },
      newest:    { createdAt: -1 },
    };

    return this.find(filter, {
      sort: sortMap[sort] || { createdAt: -1 },
      page,
      limit,
      populate: "categoryId",
    });
  }

  async findBySlug(slug) {
    return this.model.findOne({ slug, isActive: true }).populate("categoryId").exec();
  }

  async findBySku(sku) {
    return this.findOne({ sku });
  }

  // Conditional so stock can never be driven below zero by a bad delta.
  async adjustStock(productId, delta) {
    const guard = delta < 0 ? { stockQty: { $gte: Math.abs(delta) } } : {};
    return this.model
      .findOneAndUpdate({ _id: productId, ...guard }, { $inc: { stockQty: delta } }, { new: true })
      .exec();
  }

  async countLowStock(threshold) {
    return this.model.countDocuments({ isActive: true, stockQty: { $lte: threshold } }).exec();
  }

  async findLowStock(threshold, limit = 5) {
    return this.model
      .find({ isActive: true, stockQty: { $lte: threshold } })
      .sort({ stockQty: 1 })
      .limit(limit)
      .exec();
  }

  async findManyByIds(ids) {
    return this.model.find({ _id: { $in: ids } }).exec();
  }

  async listBrands() {
    return this.model.distinct("brand", { isActive: true });
  }

  // Atomic: the stock condition is inside the query, so MongoDB checks and updates
  // in one op and two shoppers cannot both buy the last unit. Null if not enough.
  async decrementStock(productId, quantity) {
    return this.model
      .findOneAndUpdate(
        { _id: productId, stockQty: { $gte: quantity } },
        { $inc: { stockQty: -quantity } },
        { new: true }
      )
      .exec();
  }

  // Used to undo a decrement when a later item in the same checkout fails.
  async incrementStock(productId, quantity) {
    return this.model.findByIdAndUpdate(productId, { $inc: { stockQty: quantity } }).exec();
  }
}

module.exports = new ProductRepository();
