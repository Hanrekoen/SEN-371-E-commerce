"use strict";

// Cart response shape (3.2): productId is always a plain string, and `lines` is renamed
// `items` to match order.factory so a client needs one field name, not two. See
// docs/minutes/contract-freeze-notes.md.

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
