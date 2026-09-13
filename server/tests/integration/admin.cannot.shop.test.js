"use strict";

// An admin account administers the shop; it does not buy from it. That has to
// be refused by the API, not merely hidden in the UI - a hidden button is a
// suggestion, and anyone can send the request by hand.
//
// These tests also pin the parts that must KEEP working for an admin, so the
// guard cannot quietly grow into "admins can't use the site".

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/sen371-test";
process.env.JWT_ACCESS_SECRET = "test-access-secret-not-a-real-key";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-not-a-real-key";

const mockProductId = "6716f0a1c2d3e4f5a6b7c8d1";

let mockCheckoutCalls = 0;
let mockCartWrites = 0;

// cart.service returns the shape toCartDto expects - `lines`, not `items`.
// The DTO renames it, so a mock that returns the DTO shape 500s in the
// controller instead of testing anything.
const mockTotals = () => ({
  lines: [], itemCount: 0, subtotalCents: 0, shippingCents: 0, taxCents: 0, totalCents: 0,
});

jest.mock("../../src/services/cart.service", () => ({
  getCart: jest.fn(async () => mockTotals()),
  addItem: jest.fn(async () => { mockCartWrites += 1; return mockTotals(); }),
  updateQuantity: jest.fn(async () => { mockCartWrites += 1; return mockTotals(); }),
  removeItem: jest.fn(async () => { mockCartWrites += 1; return mockTotals(); }),
  clear: jest.fn(async () => { mockCartWrites += 1; return mockTotals(); }),
}));

jest.mock("../../src/services/order.service", () => ({
  checkout: jest.fn(async () => { mockCheckoutCalls += 1; return { id: "o1", status: "paid" }; }),
  listForUser: jest.fn(async () => ({ items: [], page: 1, limit: 10, total: 0 })),
  getForUser: jest.fn(async () => ({ id: "o1" })),
  listAll: jest.fn(async () => ({ items: [], page: 1, limit: 10, total: 0 })),
  updateStatus: jest.fn(async () => ({ id: "o1", status: "shipped" })),
  TRANSITIONS: { paid: ["shipped", "cancelled"], shipped: ["delivered"], delivered: [], cancelled: [] },
}));

const request = require("supertest");
const app = require("../../src/app");
const { signAccessToken } = require("../../src/utils/jwt");

const admin = "Bearer " + signAccessToken({ id: "6716f0a1c2d3e4f5a6b7c904", role: "admin" });
const customer = "Bearer " + signAccessToken({ id: "6716f0a1c2d3e4f5a6b7c905", role: "customer" });

const validCheckout = {
  shippingAddress: {
    line1: "440 Silicon Pass", city: "Centurion", province: "Gauteng",
    postalCode: "0157", country: "South Africa",
  },
  card: { number: "4242424242424242", expMonth: 4, expYear: 2030, cvc: "123" },
};

beforeEach(() => { mockCheckoutCalls = 0; mockCartWrites = 0; });

describe("an admin cannot place an order", () => {
  test("POST /api/orders is 403 for an admin", async () => {
    const res = await request(app).post("/api/orders").set("Authorization", admin).send(validCheckout);
    expect(res.status).toBe(403);
    expect(mockCheckoutCalls).toBe(0);
  });

  test("the refusal explains what to do instead", async () => {
    const res = await request(app).post("/api/orders").set("Authorization", admin).send(validCheckout);
    expect(res.body.error.message).toMatch(/customer account/i);
  });

  // The guard runs before validation, so an admin probing the endpoint learns
  // nothing about the request shape it would have needed.
  test("an admin is refused even with a malformed body", async () => {
    const res = await request(app).post("/api/orders").set("Authorization", admin).send({});
    expect(res.status).toBe(403);
    expect(mockCheckoutCalls).toBe(0);
  });

  test("a customer can still check out", async () => {
    const res = await request(app).post("/api/orders").set("Authorization", customer).send(validCheckout);
    expect(res.status).toBe(201);
    expect(mockCheckoutCalls).toBe(1);
  });
});

describe("an admin cannot fill a cart either", () => {
  // Letting an admin build a basket it can never check out is a trap, so the
  // refusal happens at the first write rather than at the till.
  test.each([
    ["post",   "/api/cart/items",                        { productId: mockProductId, quantity: 1 }],
    ["patch",  `/api/cart/items/${mockProductId}`,       { quantity: 2 }],
    ["delete", `/api/cart/items/${mockProductId}`,       undefined],
    ["delete", "/api/cart",                              undefined],
  ])("%s %s is 403 for an admin", async (method, path, body) => {
    const req = request(app)[method](path).set("Authorization", admin);
    const res = await (body ? req.send(body) : req);
    expect(res.status).toBe(403);
    expect(mockCartWrites).toBe(0);
  });

  test("a customer can still add to their cart", async () => {
    const res = await request(app)
      .post("/api/cart/items")
      .set("Authorization", customer)
      .send({ productId: mockProductId, quantity: 1 });
    expect(res.status).toBeLessThan(400);
    expect(mockCartWrites).toBe(1);
  });
});

describe("the guard does not lock admins out of the rest of the site", () => {
  // The navbar asks for the cart on every page, so a 403 here would make the
  // whole app look broken to an admin.
  test("an admin can still READ a cart", async () => {
    const res = await request(app).get("/api/cart").set("Authorization", admin);
    expect(res.status).toBe(200);
  });

  test("an admin can still see their order list", async () => {
    const res = await request(app).get("/api/orders").set("Authorization", admin);
    expect(res.status).toBe(200);
  });

  test("an admin can still manage orders", async () => {
    const res = await request(app)
      .patch("/api/admin/orders/6716f0a1c2d3e4f5a6b7c8f3/status")
      .set("Authorization", admin)
      .send({ status: "shipped" });
    expect(res.status).toBe(200);
  });

  test("anonymous callers are still 401, not 403", async () => {
    const res = await request(app).post("/api/orders").send(validCheckout);
    expect(res.status).toBe(401);
  });
});
