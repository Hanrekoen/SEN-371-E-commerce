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

  /**
   * Orders that represent money actually taken. A pending order has been
   * built but not authorised, and a cancelled one has been refunded in
   * stock, so neither counts as revenue.
   */
  static get EARNING_STATUSES() {
    return ["paid", "shipped", "delivered"];
  }

  // Daily revenue and order count for the last `days` days, oldest first,
  // with empty days filled in - a sparkline with holes in it lies.
  async dailySeries(days = 7, now = new Date()) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    const rows = await this.model.aggregate([
      { $match: { createdAt: { $gte: start }, status: { $in: OrderRepository.EARNING_STATUSES } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenueCents: { $sum: "$totalCents" },
          orders: { $sum: 1 },
        },
      },
    ]).exec();

    const byDay = new Map(rows.map((r) => [r._id, r]));
    const series = [];
    for (let i = 0; i < days; i += 1) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      const key = day.toISOString().slice(0, 10);
      const row = byDay.get(key);
      series.push({
        date: key,
        revenueCents: row ? row.revenueCents : 0,
        orders: row ? row.orders : 0,
      });
    }
    return series;
  }

  async countByStatus() {
    const rows = await this.model.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]).exec();
    return rows.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {});
  }

  // The dashboard's order stream shows the customer's email, which lives on
  // the user document - populated here rather than with a second round trip.
  async recentWithCustomer(limit = 5) {
    return this.model
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("userId", "email firstName lastName")
      .exec();
  }

  async setStatus(orderId, status) {
    return this.model.findByIdAndUpdate(orderId, { status }, { new: true }).exec();
  }
}

module.exports = new OrderRepository();
