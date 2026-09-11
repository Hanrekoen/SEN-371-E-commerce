"use strict";
const adminService = require("../services/admin.service");
const productService = require("../services/product.service");
const validate = require("../middleware/validate");
const { ok } = require("../utils/response");

async function stats(_req, res) {
  return ok(res, await adminService.stats());
}

// The admin catalogue: same list as the storefront, but including products
// that have been deactivated. isAdmin is read from the verified token.
async function listProducts(req, res) {
  const { q, categoryId, brand, sort, page = 1, limit = 20 } = req.query;
  const result = await productService.list(
    { q, categoryId, brand, sort, page: Number(page), limit: Number(limit) },
    { isAdmin: true }
  );
  return res.status(200).json({
    success: true,
    data: result.items,
    error: null,
    meta: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: Math.max(1, Math.ceil(result.total / result.limit)),
    },
  });
}

// By id, not slug: the edit form has the id, and a deactivated product is
// not reachable by slug.
async function getProduct(req, res) {
  return ok(res, await productService.getById(req.params.id, { isAdmin: true }));
}

async function reactivateProduct(req, res) {
  return ok(res, await productService.reactivate(req.params.id));
}

// Restock, from the dashboard's low-stock panel.
async function adjustStock(req, res) {
  const { delta } = validate.data(req);
  return ok(res, await productService.adjustStock(req.params.id, delta));
}

module.exports = { stats, listProducts, getProduct, reactivateProduct, adjustStock };
