"use strict";
const productRepository = require("../repositories/product.repository");
const { NotFoundError, ConflictError } = require("../errors/AppError");

/**
 * Business rules for products.
 * No req, no res, no Mongoose. Only repositories and error classes.
 * That is what makes this file unit-testable with a fake repository.
 */

async function list(query) {
  return productRepository.search(query);
}

async function getBySlug(slug) {
  const product = await productRepository.findBySlug(slug);
  if (!product) throw new NotFoundError("Product");
  return product;
}

async function getById(id) {
  const product = await productRepository.findById(id);
  if (!product) throw new NotFoundError("Product");
  return product;
}

async function create(data) {
  const existing = await productRepository.findBySku(data.sku);
  if (existing) throw new ConflictError(`SKU ${data.sku} is already in use`);
  return productRepository.create(data);
}

async function update(id, data) {
  // SKU must stay unique across every other product.
  if (data.sku) {
    const clash = await productRepository.findBySku(data.sku);
    if (clash && String(clash._id) !== String(id)) {
      throw new ConflictError(`SKU ${data.sku} is already in use`);
    }
  }
  const updated = await productRepository.updateById(id, data);
  if (!updated) throw new NotFoundError("Product");
  return updated;
}

/**
 * Soft delete. The document is never removed, because historic orders
 * reference it and a hard delete would corrupt the order history.
 */
async function deactivate(id) {
  const updated = await productRepository.updateById(id, { isActive: false });
  if (!updated) throw new NotFoundError("Product");
  return updated;
}

async function listBrands() {
  return productRepository.listBrands();
}

module.exports = { list, getBySlug, getById, create, update, deactivate, listBrands };
