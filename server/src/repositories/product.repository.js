"use strict";
const BaseRepository = require("./base.repository");
const Product = require("../models/product.model");

class ProductRepository extends BaseRepository {
  constructor() {
    super(Product);
  }

  // Catalogue search: text query, category and brand filters, pagination.
  async search({ q, categoryId, brand, minCents, maxCents, sort, page = 1, limit = 12 }) {
    const filter = { isActive: true };
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

  async findManyByIds(ids) {
    return this.model.find({ _id: { $in: ids } }).exec();
  }

  async listBrands() {
    return this.model.distinct("brand", { isActive: true });
  }

  /**
   * Atomic conditional decrement.
   * The stock condition lives INSIDE the query, so MongoDB checks and updates
   * in one operation. Reading the stock, comparing it in JavaScript and then
   * writing would let two shoppers both buy the last unit.
   * Returns null when there was not enough stock.
   */
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
