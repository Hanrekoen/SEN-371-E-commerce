"use strict";
const BaseRepository = require("./base.repository");
const Order = require("../models/order.model");

class OrderRepository extends BaseRepository {
  constructor() {
    super(Order);
  }

  async findByUser(userId, { page = 1, limit = 10 } = {}) {
    return this.find({ userId }, { sort: { createdAt: -1 }, page, limit });
  }

  async findByOrderNumber(orderNumber) {
    return this.findOne({ orderNumber });
  }

  async findAll({ status, page = 1, limit = 20 } = {}) {
    const filter = status ? { status } : {};
    return this.find(filter, { sort: { createdAt: -1 }, page, limit });
  }

  async setStatus(orderId, status) {
    return this.model.findByIdAndUpdate(orderId, { status }, { new: true }).exec();
  }
}

module.exports = new OrderRepository();
