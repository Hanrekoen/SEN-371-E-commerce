"use strict";

/**
 * Cart response shape (3.2). Guarantees productId is a plain string, and
 * renames `lines` -> `items` to match order.factory - a client rendering both
 * should not need two field names for the same concept. See
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
