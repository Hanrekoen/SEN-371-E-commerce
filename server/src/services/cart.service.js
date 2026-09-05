"use strict";
const cartRepository = require("../repositories/cart.repository");
const productRepository = require("../repositories/product.repository");
const { TAX_RATE, SHIPPING_FLAT_CENTS } = require("./order.factory");
const { NotFoundError, BusinessRuleError } = require("../errors/AppError");

/**
 * Business rules for the shopping cart (FR-06).
 *
 * Cart items REFERENCE a product rather than copying its price, so the cart
 * always reflects the current catalogue price. Totals are therefore computed
 * on read, from the live product documents - never stored on the cart and
 * never accepted from the client.
 */

async function loadProducts(cart) {
  const ids = cart.items.map((i) => i.productId);
  return ids.length ? productRepository.findManyByIds(ids) : [];
}

/**
 * Subtotal, tax, shipping and total, all in integer cents.
 * Tax and shipping come from order.factory so a cart and the order it
 * becomes can never quote different numbers.
 */
function calculateTotals(cart, products) {
  const lines = cart.items.map((item) => {
    const product = products.find((p) => String(p._id) === String(item.productId));
    const unitPriceCents = product ? product.priceCents : 0;
    return {
      productId: item.productId,
      name: product ? product.name : "Unavailable product",
      finish: item.finish,
      unitPriceCents,
      quantity: item.quantity,
      lineTotalCents: unitPriceCents * item.quantity,
      inStock: product ? product.stockQty >= item.quantity : false,
    };
  });

  const subtotalCents = lines.reduce((sum, l) => sum + l.lineTotalCents, 0);
  const taxCents = Math.round(subtotalCents * TAX_RATE);
  const itemCount = lines.reduce((count, l) => count + l.quantity, 0);

  return {
    lines,
    subtotalCents,
    shippingCents: SHIPPING_FLAT_CENTS,
    taxCents,
    totalCents: subtotalCents + SHIPPING_FLAT_CENTS + taxCents,
    itemCount,
  };
}

async function getCart(userId) {
  const cart = await cartRepository.findOrCreateByUser(userId);
  const products = await loadProducts(cart);
  return calculateTotals(cart, products);
}

/**
 * Adds a product, or increases the quantity if it is already in the cart.
 * The stock check uses the RESULTING quantity, not just the amount added.
 */
async function addItem(userId, { productId, quantity, finish }) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new BusinessRuleError("Quantity must be a whole number greater than 0");
  }

  const product = await productRepository.findById(productId);
  if (!product || !product.isActive) throw new NotFoundError("Product");

  const cart = await cartRepository.findOrCreateByUser(userId);
  const existing = cart.items.find((i) => String(i.productId) === String(productId));
  const resulting = (existing ? existing.quantity : 0) + quantity;

  if (resulting > product.stockQty) {
    throw new BusinessRuleError(
      `Only ${product.stockQty} of ${product.name} left in stock`
    );
  }

  const items = cart.items.map((i) => ({
    productId: i.productId,
    quantity: i.quantity,
    finish: i.finish,
  }));

  if (existing) {
    const line = items.find((i) => String(i.productId) === String(productId));
    line.quantity = resulting;
    if (finish) line.finish = finish;
  } else {
    items.push({ productId, quantity, finish });
  }

  const updated = await cartRepository.saveItems(userId, items);
  return calculateTotals(updated, await loadProducts(updated));
}

async function updateQuantity(userId, productId, quantity) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new BusinessRuleError("Quantity must be a whole number greater than 0");
  }

  const cart = await cartRepository.findOrCreateByUser(userId);
  const existing = cart.items.find((i) => String(i.productId) === String(productId));
  if (!existing) throw new NotFoundError("Item in cart");

  const product = await productRepository.findById(productId);
  if (!product || !product.isActive) throw new NotFoundError("Product");
  if (quantity > product.stockQty) {
    throw new BusinessRuleError(
      `Only ${product.stockQty} of ${product.name} left in stock`
    );
  }

  const items = cart.items.map((i) => ({
    productId: i.productId,
    quantity: String(i.productId) === String(productId) ? quantity : i.quantity,
    finish: i.finish,
  }));

  const updated = await cartRepository.saveItems(userId, items);
  return calculateTotals(updated, await loadProducts(updated));
}

async function removeItem(userId, productId) {
  const cart = await cartRepository.findOrCreateByUser(userId);
  const exists = cart.items.some((i) => String(i.productId) === String(productId));
  if (!exists) throw new NotFoundError("Item in cart");

  const items = cart.items
    .filter((i) => String(i.productId) !== String(productId))
    .map((i) => ({ productId: i.productId, quantity: i.quantity, finish: i.finish }));

  const updated = await cartRepository.saveItems(userId, items);
  return calculateTotals(updated, await loadProducts(updated));
}

async function clear(userId) {
  const updated = await cartRepository.clear(userId);
  return calculateTotals(updated || { items: [] }, []);
}

module.exports = {
  getCart,
  addItem,
  updateQuantity,
  removeItem,
  clear,
  calculateTotals,
};
