"use strict";

/**
 * Factory pattern. The ONLY place an order document is constructed.
 * Centralising it means price snapshots, totals and order numbering cannot be
 * done two different ways in two different places.
 */

// The prototype shows free shipping and an 8% tax line.
// For South African VAT, change TAX_RATE to 0.15.
const SHIPPING_FLAT_CENTS = 0;
const TAX_RATE = 0.08;

function generateOrderNumber(now = new Date()) {
  const year = now.getFullYear();
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, "0");
  return `ORD-${year}-${random}`;
}

/**
 * @param {Object}   input
 * @param {ObjectId} input.userId
 * @param {Array}    input.cartItems  [{ productId, quantity, finish }]
 * @param {Array}    input.products   the matching product documents
 * @param {Object}   input.shippingAddress
 */
function buildOrder({ userId, cartItems, products, shippingAddress }) {
  const items = cartItems.map((cartItem) => {
    const product = products.find(
      (p) => String(p._id) === String(cartItem.productId)
    );
    if (!product) {
      throw new Error(`Product ${cartItem.productId} missing while building order`);
    }
    return {
      productId:      product._id,
      name:           product.name,        // copied, not referenced
      finish:         cartItem.finish,
      unitPriceCents: product.priceCents,  // copied, not referenced
      quantity:       cartItem.quantity,
    };
  });

  // Totals are calculated here from the database price and nowhere else.
  // A total supplied by the client is a price-tampering vulnerability.
  const subtotalCents = items.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0
  );
  const shippingCents = SHIPPING_FLAT_CENTS;
  const taxCents = Math.round(subtotalCents * TAX_RATE);

  return {
    orderNumber: generateOrderNumber(),
    userId,
    items,
    subtotalCents,
    shippingCents,
    taxCents,
    totalCents: subtotalCents + shippingCents + taxCents,
    status: "pending",
    shippingAddress,
  };
}

module.exports = { buildOrder, generateOrderNumber, SHIPPING_FLAT_CENTS, TAX_RATE };
