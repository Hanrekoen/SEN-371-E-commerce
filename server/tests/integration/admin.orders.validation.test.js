"use strict";

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/sen371-test";
process.env.JWT_ACCESS_SECRET = "a".repeat(64);
process.env.JWT_REFRESH_SECRET = "b".repeat(64);

const request = require("supertest");
const { signAccessToken } = require("../../src/utils/jwt");

jest.mock("../../src/controllers/order.controller", () => ({
  listAll: jest.fn((_req, res) =>
    res.status(200).json({ success: true, data: [], error: null, meta: null })
  ),
  updateStatus: jest.fn(),
}));

const app = require("../../src/app");
const orderController = require("../../src/controllers/order.controller");

const token = signAccessToken({ id: "507f191e810c19729de860ea", role: "admin" });

describe("admin order list validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("GET /api/admin/orders accepts valid query params without a body", async () => {
    const res = await request(app)
      .get("/api/admin/orders")
      .set("Authorization", `Bearer ${token}`)
      .query({ page: 1, limit: 10, status: "paid" });

    expect(res.status).toBe(200);
    expect(orderController.listAll).toHaveBeenCalledTimes(1);
  });

  test("GET /api/admin/orders rejects invalid status in the query string", async () => {
    const res = await request(app)
      .get("/api/admin/orders")
      .set("Authorization", `Bearer ${token}`)
      .query({ status: "not-a-status" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details.some((detail) => detail.field === "status")).toBe(true);
  });
});
