"use strict";
const productRepository = require("../repositories/product.repository");
const { NotFoundError, ConflictError } = require("../errors/AppError");
const { toProductDTO, toProductListDTO } = require("../dtos/product.dto");

// Product business rules. No req, res or Mongoose - only repositories and error
// classes - which is what makes this unit-testable with a fake repository.

const WRITABLE_FIELDS = [
    "name", "slug", "sku", "brand", "description", "priceCents",
    "categoryId", "stockQty", "images", "variants", "specs", "isActive",
];

function pickWriteable(data) {
  const picked = {};
  for (const field of WRITABLE_FIELDS) {
    if (data[field] !== undefined) picked[field] = data[field];
  }
  return picked;
}

async function list(query, { isAdmin = false } = {}) {
  // Admins manage the catalogue, so they see deactivated products too -
  // a soft delete that hides a product from its own manager is a trap.
  const result = await productRepository.search({ ...query, includeInactive: isAdmin });
  return { ...result, items: toProductListDTO(result.items, { isAdmin }) };
}

async function getBySlug(slug) {
  const product = await productRepository.findBySlug(slug);
  if (!product) throw new NotFoundError(`Product ${slug} not found`);
  return toProductDTO(product);
}

async function getById(id, { isAdmin = false } = {}) {
  const product = await productRepository.findById(id);
  if (!product) throw new NotFoundError(`Product with id ${id} not found`);
  return toProductDTO(product, { isAdmin });
}

async function create(data) {
  const fields = pickWriteable(data);
  const existing = await productRepository.findBySku(fields.sku);
  if (existing) throw new ConflictError(`Product with sku ${fields.sku} already exists`);
  const product = await productRepository.create(fields);
  return toProductDTO(product, { isAdmin: true });
}

async function update(id, data) {
  const fields = pickWriteable(data);
  if (fields.sku) {
    const clash = await productRepository.findBySku(fields.sku);
    if (clash && String(clash._id) !== String(id)) {
      throw new ConflictError(`Product with sku ${fields.sku} already exists`);
    }
  }
  const updated = await productRepository.updateById(id, fields);
  if (!updated) throw new NotFoundError(`Product with id ${id} not found`);
  return toProductDTO(updated, { isAdmin: true });
}

async function deactivate(id) {
  const updated = await productRepository.updateById(id, { isActive: false });
  if (!updated) throw new NotFoundError(`Product with id ${id} not found`);
  return toProductDTO(updated, { isAdmin: true });
}

// Undo a deactivation. Without this a soft delete is one-way.
async function reactivate(id) {
  const updated = await productRepository.updateById(id, { isActive: true });
  if (!updated) throw new NotFoundError(`Product with id ${id} not found`);
  return toProductDTO(updated, { isAdmin: true });
}

// Restock from the dashboard's low-stock panel.
async function adjustStock(id, delta) {
  if (!Number.isInteger(delta) || delta === 0) {
    throw new Error("adjustStock needs a non-zero integer delta");
  }
  const updated = await productRepository.adjustStock(id, delta);
  if (!updated) throw new NotFoundError(`Product with id ${id} not found`);
  return toProductDTO(updated, { isAdmin: true });
}

async function listBrands() {
  return productRepository.listBrands();
}

module.exports = { list, getBySlug, getById, create, update, deactivate, reactivate, adjustStock, listBrands };