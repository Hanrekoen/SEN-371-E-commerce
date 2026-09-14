"use strict";

// Moving an order along by hand from the dashboard: paid -> shipped ->
// delivered, and cancelling. The rules live in order.service's TRANSITIONS
// table; these tests pin both that the legal moves work and that the illegal
// ones are refused rather than quietly applied.

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/sen371-test";
process.env.JWT_ACCESS_SECRET = "test-access-secret-not-a-real-key";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-not-a-real-key";

const mockOrderId = "6716f0a1c2d3e4f5a6b7c8f3";
const mockProductId = "6716f0a1c2d3e4f5a6b7c8d1";

let mockStatus = "paid";
let mockSetTo = null;
let mockReturnedStock = [];

const mockOrder = () => ({
  _id: mockOrderId,
  orderNumber: "ORD-2026-000042",
  userId: "6716f0a1c2d3e4f5a6b7c905",
  items: [
    { productId: mockProductId, name: "AeroPulse ANC Headset", quantity: 2,
      unitPriceCents: 34900, lineTotalCents: 69800 },
  ],
  subtotalCents: 69800, shippingCents: 0, taxCents: 0, totalCents: 69800,
  status: mockStatus,
  shippingAddress: { line1: "440 Silicon Pass", city: "Centurion", postalCode: "0157", country: "ZA" },
  createdAt: new Date(), updatedAt: new Date(),
  toObject() { return { ...this }; },
});

jest.mock("../../src/repositories/order.repository", () => ({
  findById: jest.fn(async (id) => (id === mockOrderId ? mockOrder() : null)),
  setStatus: jest.fn(async (id, status) => {
    mockSetTo = status;
    return { ...mockOrder(), status };
  }),
  dailySeries: jest.fn(async () => [
    { date: "2026-09-09", revenueCents: 100000, orders: 2 },
    { date: "2026-09-10", revenueCents: 150000, orders: 3 },
  ]),
  countByStatus: jest.fn(async () => ({ paid: 4, shipped: 2, delivered: 6, cancelled: 1 })),
  recentWithCustomer: jest.fn(async () => [
    { _id: mockOrderId, orderNumber: "ORD-2026-000042",
      userId: { email: "vance@soma.test" }, items: [{ name: "AeroPulse ANC Headset" }],
      totalCents: 69800, status: mockStatus, createdAt: new Date() },
  ]),
}));

jest.mock("../../src/repositories/product.repository", () => ({
  incrementStock: jest.fn(async (productId, quantity) => {
    mockReturnedStock.push({ productId, quantity });
    return { _id: productId, stockQty: 10 + quantity };
  }),
  findLowStock: jest.fn(async () => []),
}));

jest.mock("../../src/repositories/user.repository", () => ({
  countCustomers: jest.fn(async () => 100),
  countCreatedSince: jest.fn(async () => 6),
}));

const request = require("supertest");
const app = require("../../src/app");
const { signAccessToken } = require("../../src/utils/jwt");
const { TRANSITIONS } = require("../../src/services/order.service");

const admin = "Bearer " + signAccessToken({ id: "6716f0a1c2d3e4f5a6b7c904", role: "admin" });

const move = (status) =>
  request(app)
    .patch(`/api/admin/orders/${mockOrderId}/status`)
    .set("Authorization", admin)
    .send({ status });

beforeEach(() => {
  mockStatus = "paid";
  mockSetTo = null;
  mockReturnedStock = [];
});

// The transition rules themselves - paid -> shipped -> delivered, cancelling,
// and the illegal moves - are walked end to end in the "an admin moving the
// order along" block of tests/function/shopping.journey.test.js. What is left
// here is what that journey does not reach.

describe("the status itself is validated before any rule runs", () => {
  test("a status outside the enum is a validation error (400), not a rule error (422)", async () => {
    const res = await move("refunded");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(mockSetTo).toBeNull();
  });
});

describe("cancelling returns the stock", () => {
  test("a shipped order cannot be cancelled - the stock is gone", async () => {
    mockStatus = "shipped";
    const res = await move("cancelled");
    expect(res.status).toBe(422);
    expect(mockReturnedStock).toEqual([]);
  });
});

describe("only admins may move orders", () => {
  test("anonymous is 401", async () => {
    const res = await request(app)
      .patch(`/api/admin/orders/${mockOrderId}/status`)
      .send({ status: "shipped" });
    expect(res.status).toBe(401);
    expect(mockSetTo).toBeNull();
  });
});

describe("the dashboard is told which moves are legal", () => {
  // The buttons are rendered from this list, so it has to agree with the
  // table the service actually enforces - otherwise the dashboard offers a
  // move that always fails.
  test("stats reports allowedTransitions for each order", async () => {
    mockStatus = "paid";
    const res = await request(app).get("/api/admin/stats").set("Authorization", admin);
    expect(res.status).toBe(200);
    expect(res.body.data.recentOrders[0].allowedTransitions).toEqual(TRANSITIONS.paid);
  });

  test("a terminal order offers no moves", async () => {
    mockStatus = "delivered";
    const res = await request(app).get("/api/admin/stats").set("Authorization", admin);
    expect(res.body.data.recentOrders[0].allowedTransitions).toEqual([]);
  });

  test("every advertised move is one the service accepts", async () => {
    for (const [from, nexts] of Object.entries(TRANSITIONS)) {
      for (const next of nexts) {
        mockStatus = from;
        mockSetTo = null;
        const res = await move(next);
        expect([from, next, res.status]).toEqual([from, next, 200]);
      }
    }
  });
});
