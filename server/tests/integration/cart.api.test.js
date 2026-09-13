"use strict";

// Cart validation and DTO, through the real app - so these cover middleware
// order too, not just behaviour. Repositories are faked; everything above
// them is real.

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/sen371-test";
process.env.JWT_ACCESS_SECRET = "test-access-secret-not-a-real-key";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-not-a-real-key";

// jest.mock() factories are hoisted above the file, so anything they close
// over must be named mock* - that prefix is jest's allow-list.
const mockProductId = "507f1f77bcf86cd799439011";
const mockProduct = {
  _id: mockProductId,
  name: "Aurora Mechanical Keyboard",
  priceCents: 34900,
  stockQty: 12,
  isActive: true,
};
let mockCartItems = [];

jest.mock("../../src/repositories/cart.repository", () => ({
  findOrCreateByUser: jest.fn(async () => ({ items: mockCartItems })),
  saveItems: jest.fn(async (_userId, items) => {
    mockCartItems = items;
    return { items: mockCartItems };
  }),
  clear: jest.fn(async () => {
    mockCartItems = [];
    return { items: mockCartItems };
  }),
}));

jest.mock("../../src/repositories/product.repository", () => ({
  findById: jest.fn(async (id) => (String(id) === mockProductId ? mockProduct : null)),
  findManyByIds: jest.fn(async (ids) =>
    ids.map(String).includes(mockProductId) ? [mockProduct] : []
  ),
}));

const PRODUCT_ID = mockProductId;
const OTHER_ID = "507f1f77bcf86cd799439012";
const USER_ID = "507f191e810c19729de860ea";

const request = require("supertest");
const app = require("../../src/app");
const { signAccessToken } = require("../../src/utils/jwt");

const token = signAccessToken({ id: USER_ID, role: "customer" });
const auth = (r) => r.set("Authorization", `Bearer ${token}`);

beforeEach(() => {
  mockCartItems = [];
});

describe("the cart is not reachable without a token", () => {
  test("GET /api/cart is 401", async () => {
    const res = await request(app).get("/api/cart");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});

describe("validation rejects malformed input before the business rules see it", () => {
  test.each([
    ["quantity 0", { productId: PRODUCT_ID, quantity: 0 }, "quantity"],
    ["quantity 500", { productId: PRODUCT_ID, quantity: 500 }, "quantity"],
    ["quantity as a string", { productId: PRODUCT_ID, quantity: "many" }, "quantity"],
    ["a productId that is not an ObjectId", { productId: "not-an-id", quantity: 1 }, "productId"],
    ["a missing productId", { quantity: 1 }, "productId"],
  ])("POST /api/cart/items with %s is a 400 naming the field", async (_label, body, field) => {
    const res = await auth(request(app).post("/api/cart/items")).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details.map((d) => d.field)).toContain(field);
  });

  // The injection backstop and the validator, together, on a real route.
  test("an operator-shaped productId is stripped and then rejected", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const res = await auth(request(app).post("/api/cart/items"))
      .send({ productId: { $gt: "" }, quantity: 1 });

    expect(res.status).toBe(400);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("productId.$gt"));
    warn.mockRestore();
  });
});

// What a filled cart looks like - the prices, the totals and the item DTO - is
// proven end to end by the "filling a cart" block of
// tests/function/shopping.journey.test.js. What is left here is the part of
// the cart API that journey never touches: changing and removing lines, and
// emptying the cart.
describe("the cart response is a DTO, not a Mongoose document", () => {
  beforeEach(async () => {
    await auth(request(app).post("/api/cart/items")).send({ productId: PRODUCT_ID, quantity: 2 });
  });

  test("every cart endpoint returns the same shape", async () => {
    const shape = (body) => Object.keys(body.data).sort().join(",");
    const get = await auth(request(app).get("/api/cart"));
    const patch = await auth(request(app).patch(`/api/cart/items/${PRODUCT_ID}`)).send({ quantity: 3 });
    const del = await auth(request(app).delete(`/api/cart/items/${PRODUCT_ID}`));
    const cleared = await auth(request(app).delete("/api/cart"));

    expect(patch.status).toBe(200);
    expect(del.status).toBe(200);
    expect(cleared.status).toBe(200);
    expect(new Set([shape(get.body), shape(patch.body), shape(del.body), shape(cleared.body)]).size).toBe(1);
  });

  test("an emptied cart is an empty items array and zero totals, not null", async () => {
    const res = await auth(request(app).delete("/api/cart"));
    expect(res.body.data.items).toEqual([]);
    expect(res.body.data.itemCount).toBe(0);
    expect(res.body.data.subtotalCents).toBe(0);
  });
});

describe("business rules still run behind validation", () => {
  test("a well-formed id for a product that does not exist is a 404", async () => {
    const res = await auth(request(app).post("/api/cart/items"))
      .send({ productId: OTHER_ID, quantity: 1 });
    expect(res.status).toBe(404);
  });
});
