"use strict";
const { buildOrder, TAX_RATE, SHIPPING_FLAT_CENTS } = require("../../src/services/order.factory");

describe("order factory", () => {
  const products = [
    { _id: "p1", name: "AeroPulse ANC Headset", priceCents: 34900 },
    { _id: "p2", name: "NovaKey MX60 Mechanical", priceCents: 18900 },
  ];
  const cartItems = [
    { productId: "p1", quantity: 1, finish: "Obsidian Black" },
    { productId: "p2", quantity: 2, finish: "Frost" },
  ];
  const shippingAddress = {
    line1: "1 Test Road", city: "Pretoria", province: "Gauteng",
    postalCode: "0001", country: "South Africa",
  };

  // FR-07: the order captures a price snapshot
  test("copies name and price onto each line item", () => {
    const order = buildOrder({ userId: "u1", cartItems, products, shippingAddress });
    expect(order.items[0].name).toBe("AeroPulse ANC Headset");
    expect(order.items[0].unitPriceCents).toBe(34900);
    expect(order.items[0].finish).toBe("Obsidian Black");
  });

  // FR-07: totals are calculated server side
  test("subtotal is the sum of line items and total adds shipping and tax", () => {
    const order = buildOrder({ userId: "u1", cartItems, products, shippingAddress });
    const expectedSubtotal = 34900 + 18900 * 2;
    expect(order.subtotalCents).toBe(expectedSubtotal);
    expect(order.taxCents).toBe(Math.round(expectedSubtotal * TAX_RATE));
    expect(order.totalCents).toBe(
      expectedSubtotal + SHIPPING_FLAT_CENTS + order.taxCents
    );
  });

  test("new orders start as pending with a generated order number", () => {
    const order = buildOrder({ userId: "u1", cartItems, products, shippingAddress });
    expect(order.status).toBe("pending");
    expect(order.orderNumber).toMatch(/^ORD-\d{4}-\d{6}$/);
  });
});
