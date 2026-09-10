"use strict";

// The admin surface, through the real app. These exist mostly to pin down
// three defects that made admin product management impossible: a
// categoryID/categoryId typo that silently dropped the category, a call to a
// repository method that did not exist, and a catalogue search that hid
// deactivated products from the admin who deactivated them.

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/sen371-test";
process.env.JWT_ACCESS_SECRET = "test-access-secret-not-a-real-key";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-not-a-real-key";

const mockProductId = "6716f0a1c2d3e4f5a6b7c8d1";
const mockCategoryId = "6716f0a1c2d3e4f5a6b7c8e2";

let mockCreated = null;
let mockSearchArgs = null;

const mockProduct = () => ({
  _id: mockProductId,
  name: "Aurora Mechanical Keyboard",
  slug: "aurora-mechanical-keyboard",
  sku: "GV-KB-AUR-01",
  brand: "Aurora",
  description: "Hot-swappable 75% keyboard.",
  priceCents: 34900,
  categoryId: mockCategoryId,
  stockQty: 2,
  images: ["https://cdn.test/1.jpg"],
  variants: [], specs: [], ratingAverage: 4.8, ratingCount: 92,
  isActive: true, createdAt: new Date(), updatedAt: new Date(),
  toObject() { return { ...this }; },
});

jest.mock("../../src/repositories/product.repository", () => ({
  search: jest.fn(async (args) => {
    mockSearchArgs = args;
    return { items: [mockProduct()], total: 1, page: 1, limit: 20 };
  }),
  findById: jest.fn(async (id) => (id === mockProductId ? mockProduct() : null)),
  findBySku: jest.fn(async () => null),
  create: jest.fn(async (fields) => {
    mockCreated = fields;
    return { ...mockProduct(), ...fields };
  }),
  updateById: jest.fn(async (id, fields) =>
    id === mockProductId ? { ...mockProduct(), ...fields } : null
  ),
  adjustStock: jest.fn(async (id, delta) =>
    id === mockProductId ? { ...mockProduct(), stockQty: 2 + delta } : null
  ),
  findLowStock: jest.fn(async () => [mockProduct()]),
  listBrands: jest.fn(async () => ["Aurora"]),
}));

jest.mock("../../src/repositories/order.repository", () => ({
  dailySeries: jest.fn(async () => [
    { date: "2026-09-04", revenueCents: 100000, orders: 2 },
    { date: "2026-09-05", revenueCents: 150000, orders: 3 },
  ]),
  countByStatus: jest.fn(async () => ({ pending: 1, paid: 4, shipped: 2, delivered: 6, cancelled: 1 })),
  recentWithCustomer: jest.fn(async () => [
    { _id: "6716f0a1c2d3e4f5a6b7c8f3", orderNumber: "ORD-2026-000042",
      userId: { email: "vance@soma.test" }, items: [{ name: "AeroPulse ANC Headset" }],
      totalCents: 34900, status: "paid", createdAt: new Date() },
  ]),
}));

jest.mock("../../src/repositories/user.repository", () => ({
  countCustomers: jest.fn(async () => 100),
  countCreatedSince: jest.fn(async () => 6),
}));

const request = require("supertest");
const app = require("../../src/app");
const { signAccessToken } = require("../../src/utils/jwt");

const admin = "Bearer " + signAccessToken({ id: "6716f0a1c2d3e4f5a6b7c904", role: "admin" });
const customer = "Bearer " + signAccessToken({ id: "6716f0a1c2d3e4f5a6b7c905", role: "customer" });

const validProduct = {
  name: "Aurora Mechanical Keyboard",
  slug: "aurora-mechanical-keyboard",
  sku: "GV-KB-AUR-01",
  brand: "Aurora",
  description: "Hot-swappable 75% keyboard with PBT keycaps.",
  priceCents: 34900,
  categoryId: mockCategoryId,
  stockQty: 12,
  images: ["https://cdn.test/1.jpg"],
};

beforeEach(() => { mockCreated = null; mockSearchArgs = null; });

describe("the admin surface is admin-only", () => {
  test.each([
    ["GET", "/api/admin/stats"],
    ["GET", "/api/admin/products"],
    ["GET", `/api/admin/products/${mockProductId}`],
  ])("%s %s is 401 anonymous and 403 for a customer", async (method, path) => {
    const anon = await request(app)[method.toLowerCase()](path);
    expect(anon.status).toBe(401);
    const cust = await request(app)[method.toLowerCase()](path).set("Authorization", customer);
    expect(cust.status).toBe(403);
  });
});

describe("creating a product persists the category", () => {
  // The bug: WRITABLE_FIELDS listed "categoryID", so the field was dropped
  // before Mongoose saw it and every create failed the required check.
  test("categoryId reaches the repository", async () => {
    const res = await request(app).post("/api/products").set("Authorization", admin).send(validProduct);
    expect(res.status).toBe(201);
    expect(mockCreated).not.toBeNull();
    expect(mockCreated.categoryId).toBe(mockCategoryId);
  });

  test("a category change on update is not silently dropped", async () => {
    const other = "6716f0a1c2d3e4f5a6b7c8e9";
    const res = await request(app)
      .put(`/api/products/${mockProductId}`)
      .set("Authorization", admin)
      .send({ ...validProduct, categoryId: other });
    expect(res.status).toBe(200);
    expect(res.body.data.category.id).toBe(other);
  });

  test("unknown fields are still refused - the whitelist did not widen", async () => {
    const res = await request(app).post("/api/products").set("Authorization", admin)
      .send({ ...validProduct, ratingAverage: 5, ratingCount: 9999 });
    expect(res.status).toBe(201);
    expect(mockCreated.ratingAverage).toBeUndefined();
    expect(mockCreated.ratingCount).toBeUndefined();
  });
});

describe("admins can manage what they deactivated", () => {
  test("the admin list asks the repository for inactive products too", async () => {
    const res = await request(app).get("/api/admin/products").set("Authorization", admin);
    expect(res.status).toBe(200);
    expect(mockSearchArgs.includeInactive).toBe(true);
  });

  test("the storefront list does not", async () => {
    const res = await request(app).get("/api/products");
    expect(res.status).toBe(200);
    expect(mockSearchArgs.includeInactive).toBe(false);
  });

  test("fetch by id works - it used to call a method that did not exist", async () => {
    const res = await request(app).get(`/api/admin/products/${mockProductId}`).set("Authorization", admin);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(mockProductId);
    expect(res.body.data.stockQty).toBeDefined(); // admin view
  });

  test("a deactivation can be undone", async () => {
    const res = await request(app)
      .patch(`/api/admin/products/${mockProductId}/reactivate`)
      .set("Authorization", admin);
    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(true);
    expect(res.body.data._id).toBeUndefined(); // a DTO, not a raw document
  });
});

describe("restocking", () => {
  test("a positive delta raises stock", async () => {
    const res = await request(app).patch(`/api/admin/products/${mockProductId}/stock`)
      .set("Authorization", admin).send({ delta: 25 });
    expect(res.status).toBe(200);
    expect(res.body.data.stockQty).toBe(27);
  });

  test("a zero delta is refused", async () => {
    const res = await request(app).patch(`/api/admin/products/${mockProductId}/stock`)
      .set("Authorization", admin).send({ delta: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe("delta");
  });

  test("a non-integer delta is refused", async () => {
    const res = await request(app).patch(`/api/admin/products/${mockProductId}/stock`)
      .set("Authorization", admin).send({ delta: "lots" });
    expect(res.status).toBe(400);
  });
});

describe("dashboard statistics", () => {
  test("it returns every panel the dashboard renders", async () => {
    const res = await request(app).get("/api/admin/stats").set("Authorization", admin);
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(Object.keys(d).sort()).toEqual([
      "conversion", "customers", "lowStock", "orders", "recentOrders", "revenue", "thresholds", "trend",
    ]);
  });

  test("revenue reports today and a delta against yesterday", async () => {
    const res = await request(app).get("/api/admin/stats").set("Authorization", admin);
    // 100000 -> 150000 is +50%
    expect(res.body.data.revenue.todayCents).toBe(150000);
    expect(res.body.data.revenue.deltaPct).toBe(50);
    expect(res.body.data.revenue.series).toEqual([100000, 150000]);
  });

  test("only paid, shipped and delivered orders count as conversions", async () => {
    const res = await request(app).get("/api/admin/stats").set("Authorization", admin);
    // 4 paid + 2 shipped + 6 delivered = 12 of 100 customers
    expect(res.body.data.conversion.paidOrders).toBe(12);
    expect(res.body.data.conversion.rate).toBe(12);
  });

  test("low stock and the order stream carry what the panels display", async () => {
    const res = await request(app).get("/api/admin/stats").set("Authorization", admin);
    expect(res.body.data.lowStock[0]).toMatchObject({ name: "Aurora Mechanical Keyboard", stockQty: 2 });
    expect(res.body.data.recentOrders[0]).toMatchObject({
      orderNumber: "ORD-2026-000042",
      customerEmail: "vance@soma.test",
      status: "paid",
    });
  });
});
