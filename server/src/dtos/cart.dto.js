"use strict";

/**
 * Cart response shape (3.2). cart.service.calculateTotals() already avoids
 * leaking a raw Mongoose document - it's a plain object built line by line -
 * so this isn't fixing a leak the way the product/order DTOs are. It exists
 * to (a) guarantee productId is always a plain string, never a Mongoose
 * ObjectId instance, regardless of what the service returns in future, and
 * (b) rename `lines` -> `items`.
 *
 * That rename is deliberate, not cosmetic: order.factory.js already calls
 * its array `items`. Cart called the same concept `lines`. A client
 * consuming both would need two different field names for the same shape
 * depending on which screen it's rendering - exactly the kind of mismatch
 * 3.3 asks to catch before the contract freezes. See
 * docs/minutes/contract-freeze-notes.md.
 */

function toCartItemDto(line) {
  return {
    productId: String(line.productId),
    name: line.name,
    finish: line.finish || null,
    unitPriceCents: line.unitPriceCents,
    quantity: line.quantity,
    lineTotalCents: line.lineTotalCents,
    inStock: line.inStock,
  };
}

function toCartDto(totals) {
  return {
    items: totals.lines.map(toCartItemDto),
    itemCount: totals.itemCount,
    subtotalCents: totals.subtotalCents,
    shippingCents: totals.shippingCents,
    taxCents: totals.taxCents,
    totalCents: totals.totalCents,
  };
}

module.exports = { toCartDto, toCartItemDto };
