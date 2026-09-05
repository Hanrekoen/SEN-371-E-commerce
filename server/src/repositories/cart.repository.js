"use strict";
const BaseRepository = require("./base.repository");
const Cart = require("../models/cart.model");

class CartRepository extends BaseRepository {
  constructor() {
    super(Cart);
  }

  async findByUser(userId) {
    return this.findOne({ userId });
  }

  // A user always has a cart from their point of view - create it lazily on
  // first access rather than making every caller handle "no cart yet".
  async findOrCreateByUser(userId) {
    const existing = await this.findOne({ userId });
    if (existing) return existing;
    return this.create({ userId, items: [] });
  }

  async saveItems(userId, items) {
    return this.model
      .findOneAndUpdate({ userId }, { items }, { new: true, upsert: true })
      .exec();
  }

  async clear(userId) {
    return this.model.findOneAndUpdate({ userId }, { items: [] }, { new: true }).exec();
  }
}

module.exports = new CartRepository();
