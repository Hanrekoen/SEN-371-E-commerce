"use strict";
const orderService = require("../services/order.service");
const { ok, created, paginated } = require("../utils/response");

// req.user is attached by Person 2's authenticate middleware.

async function checkout(req, res) {
  const order = await orderService.checkout(req.user.id, req.body.shippingAddress);
  return created(res, order);
}

async function listMine(req, res) {
  const { page = 1, limit = 10 } = req.query;
  const result = await orderService.listForUser(req.user.id, {
    page: Number(page),
    limit: Number(limit),
  });
  return paginated(res, result.items, result);
}

async function getMine(req, res) {
  return ok(res, await orderService.getForUser(req.params.id, req.user.id));
}

async function listAll(req, res) {
  const { status, page = 1, limit = 20 } = req.query;
  const result = await orderService.listAll({
    status,
    page: Number(page),
    limit: Number(limit),
  });
  return paginated(res, result.items, result);
}

async function updateStatus(req, res) {
  return ok(res, await orderService.updateStatus(req.params.id, req.body.status));
}

module.exports = { checkout, listMine, getMine, listAll, updateStatus };
