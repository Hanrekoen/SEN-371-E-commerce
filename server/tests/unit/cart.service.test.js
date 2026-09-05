"use strict";

// Person 3's cart rules, ported to the project's layered structure.
// The service is exercised against fake repositories, so no database is
// needed - which is the whole reason repositories exist (see ARCHITECTURE.md).

jest.mock("../../src/repositories/cart.repository");
jest.mock("../../src/repositories/product.repository");

const cartRepository = require("../../src/repositories/cart.repository");
const productRepository = require("../../src/repositories/product.repository");
const cartService = require("../../src/services/cart.service");

const PRODUCT = {
  _id: "p1",
  name: "AeroPulse ANC Headset",
  priceCents: 34900,
  stockQty: 10,
  isActive: true,
};

function fakeCart(items = []) {
  return { userId: "u1", items };
}

beforeEach(() => {
  jest.resetAllMocks();
  productRepository.findById.mockResolvedValue(PRODUCT);
  productRepository.findManyByIds.mockResolvedValue([PRODUCT]);
  cartRepository.saveItems.mockImplementation(async (_u, items) => fakeCart(items));
});

describe("cart service", () => {
  // FR-06
  test("adds a new item to an empty cart", async () => {
    cartRepository.findOrCreateByUser.mockResolvedValue(fakeCart([]));
    const result = await cartService.addItem("u1", { productId: "p1", quantity: 2 });
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].quantity).toBe(2);
  });

  test("adding the same product twice merges into one line", async () => {
    cartRepository.findOrCreateByUser.mockResolvedValue(
      fakeCart([{ productId: "p1", quantity: 2, finish: "Obsidian Black" }])
    );
    const result = await cartService.addItem("u1", { productId: "p1", quantity: 3 });
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].quantity).toBe(5);
  });

  test("rejects a quantity of zero or less", async () => {
    cartRepository.findOrCreateByUser.mockResolvedValue(fakeCart([]));
    await expect(
      cartService.addItem("u1", { productId: "p1", quantity: 0 })
    ).rejects.toThrow(/greater than 0/);
  });

  // FR-06: quantity cannot exceed available stock
  test("rejects an amount that would exceed stock", async () => {
    cartRepository.findOrCreateByUser.mockResolvedValue(fakeCart([]));
    await expect(
      cartService.addItem("u1", { productId: "p1", quantity: 11 })
    ).rejects.toThrow(/left in stock/);
  });

  test("counts what is already in the cart when checking stock", async () => {
    cartRepository.findOrCreateByUser.mockResolvedValue(
      fakeCart([{ productId: "p1", quantity: 9 }])
    );
    await expect(
      cartService.addItem("u1", { productId: "p1", quantity: 2 })
    ).rejects.toThrow(/left in stock/);
  });

  test("updating the quantity of an item not in the cart is a 404", async () => {
    cartRepository.findOrCreateByUser.mockResolvedValue(fakeCart([]));
    await expect(cartService.updateQuantity("u1", "p1", 3)).rejects.toThrow(/not found/i);
  });

  test("removing an item that is not in the cart is a 404", async () => {
    cartRepository.findOrCreateByUser.mockResolvedValue(fakeCart([]));
    await expect(cartService.removeItem("u1", "p1")).rejects.toThrow(/not found/i);
  });

  test("totals are subtotal plus tax, in cents, from the live product price", async () => {
    const cart = fakeCart([{ productId: "p1", quantity: 2 }]);
    const totals = cartService.calculateTotals(cart, [PRODUCT]);
    expect(totals.subtotalCents).toBe(69800);
    expect(totals.taxCents).toBe(Math.round(69800 * 0.08));
    expect(totals.totalCents).toBe(69800 + totals.shippingCents + totals.taxCents);
    expect(totals.itemCount).toBe(2);
  });
});
