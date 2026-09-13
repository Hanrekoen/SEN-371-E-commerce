"use strict";

// FUNCTION TESTS - the whole shopping feature, start to finish.
//
// One customer, one catalogue, one continuous sequence: fill a cart, check
// out, see the order in the history, and watch an admin move it along. Only
// the database is faked; the in-memory collections below hold real state, so
// stock taken in one request is gone in the next and an order placed in one
// test is the same order the next request reads back. The payment provider is
// the project's own stub, which answers on the same test card numbers as the
// real gateway - a decline here is triggered the way it is in a demo.
//
// The things worth proving are the ones that cost money when they are wrong:
// the server prices the order (never the browser), stock moves exactly once,
// and a failed payment leaves the customer exactly where they started.

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/sen371-test";
process.env.JWT_ACCESS_SECRET = "test-access-secret-not-a-real-key";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-not-a-real-key";
process.env.PAYMENT_PROVIDER = "stub";

const mockCustomerId = "6716f0a1c2d3e4f5a6b7c905";
const mockAdminId = "6716f0a1c2d3e4f5a6b7c904";
const mockHeadsetId = "6716f0a1c2d3e4f5a6b7c8d1";
const mockKeyboardId = "6716f0a1c2d3e4f5a6b7c8d2";

// --- the fake collections --------------------------------------------------

let mockProducts = [];
let mockCarts = new Map();
let mockOrders = [];

const mockFindProduct = (id) => mockProducts.find((p) => String(p._id) === String(id)) || null;

jest.mock("../../src/repositories/product.repository", () => ({
  findById: jest.fn(async (id) => mockFindProduct(id)),
  findManyByIds: jest.fn(async (ids) => ids.map(mockFindProduct).filter(Boolean)),

  // The real one is an atomic conditional update - it only decrements when
  // there is enough, and answers null when there is not. That condition is
  // what stops two shoppers buying the same last unit, so the fake keeps it.
  decrementStock: jest.fn(async (id, quantity) => {
    const product = mockFindProduct(id);
    if (!product || product.stockQty < quantity) return null;
    product.stockQty -= quantity;
    return product;
  }),
  incrementStock: jest.fn(async (id, quantity) => {
    const product = mockFindProduct(id);
    if (product) product.stockQty += quantity;
    return product;
  }),
  findLowStock: jest.fn(async () => []),
  countLowStock: jest.fn(async () => 0),
}));

jest.mock("../../src/repositories/cart.repository", () => ({
  findByUser: jest.fn(async (userId) => mockCarts.get(String(userId)) || null),
  findOrCreateByUser: jest.fn(async (userId) => {
    const key = String(userId);
    if (!mockCarts.has(key)) mockCarts.set(key, { userId: key, items: [] });
    return mockCarts.get(key);
  }),
  saveItems: jest.fn(async (userId, items) => {
    const cart = { userId: String(userId), items };
    mockCarts.set(String(userId), cart);
    return cart;
  }),
  clear: jest.fn(async (userId) => {
    const cart = { userId: String(userId), items: [] };
    mockCarts.set(String(userId), cart);
    return cart;
  }),
}));

jest.mock("../../src/repositories/order.repository", () => ({
  create: jest.fn(async (data) => {
    const order = {
      _id: `6716f0a1c2d3e4f5a6b7c9f${mockOrders.length}`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
      toObject() { return { ...this }; },
    };
    mockOrders.push(order);
    return order;
  }),
  findById: jest.fn(async (id) => mockOrders.find((o) => String(o._id) === String(id)) || null),
  findByUser: jest.fn(async (userId, { page = 1, limit = 10 } = {}) => {
    const items = mockOrders.filter((o) => String(o.userId) === String(userId));
    return { items, total: items.length, page, limit, totalPages: Math.ceil(items.length / limit) || 1 };
  }),
  findAll: jest.fn(async ({ status, page = 1, limit = 20 } = {}) => {
    const items = status ? mockOrders.filter((o) => o.status === status) : mockOrders;
    return { items, total: items.length, page, limit, totalPages: Math.ceil(items.length / limit) || 1 };
  }),
  setStatus: jest.fn(async (id, status) => {
    const order = mockOrders.find((o) => String(o._id) === String(id));
    if (order) order.status = status;
    return order;
  }),
  countByStatus: jest.fn(async () => ({})),
  dailySeries: jest.fn(async () => []),
  recentWithCustomer: jest.fn(async () => []),
}));

jest.mock("../../src/repositories/user.repository", () => ({
  findById: jest.fn(async (id) => ({
    _id: id, firstName: "Hanre", lastName: "Koen", email: "hanre@sen371.test",
    role: String(id) === "6716f0a1c2d3e4f5a6b7c904" ? "admin" : "customer",
    isActive: true, tokenVersion: 0, toObject() { return { ...this }; },
  })),
  countCustomers: jest.fn(async () => 1),
  countCreatedSince: jest.fn(async () => 0),
}));

const request = require("supertest");
const app = require("../../src/app");
const { signAccessToken } = require("../../src/utils/jwt");
const { TAX_RATE } = require("../../src/services/order.factory");

const customer = "Bearer " + signAccessToken({ id: mockCustomerId, role: "customer" });
const admin = "Bearer " + signAccessToken({ id: mockAdminId, role: "admin" });

// --- the journey, as request helpers ---------------------------------------

const APPROVED_CARD = "4242424242424242";
const DECLINED_CARD = "4000000000009995";
const UNAVAILABLE_CARD = "4000000000000119";

const addToCart = (productId, quantity = 1, auth = customer) =>
  request(app).post("/api/cart/items").set("Authorization", auth).send({ productId, quantity });

const viewCart = (auth = customer) =>
  request(app).get("/api/cart").set("Authorization", auth);

const payWith = (number = APPROVED_CARD, auth = customer) =>
  request(app).post("/api/orders").set("Authorization", auth).send({
    shippingAddress: {
      line1: "440 Silicon Pass", city: "Centurion", province: "Gauteng",
      postalCode: "0157", country: "South Africa",
    },
    card: { number, expMonth: 8, expYear: 2029, cvc: "123" },
  });

const moveTo = (orderId, status) =>
  request(app).patch(`/api/admin/orders/${orderId}/status`).set("Authorization", admin).send({ status });

beforeEach(() => {
  mockProducts = [
    { _id: mockHeadsetId, name: "Obsidian X-9 Headset", slug: "obsidian-x-9-headset",
      priceCents: 34900, stockQty: 5, isActive: true },
    { _id: mockKeyboardId, name: "Vault Mechanical Keyboard", slug: "vault-mechanical-keyboard",
      priceCents: 189900, stockQty: 2, isActive: true },
  ];
  mockCarts = new Map();
  mockOrders = [];
  jest.clearAllMocks();
});

describe("filling a cart", () => {
  test("a product added shows up with the catalogue's price", async () => {
    await addToCart(mockHeadsetId, 2);

    const { body } = await viewCart();
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0]).toMatchObject({
      name: "Obsidian X-9 Headset", unitPriceCents: 34900, quantity: 2, lineTotalCents: 69800,
    });
  });

  // The check is on the resulting quantity, not on the amount added, or three
  // separate adds of two would get past a stock of five - which also means a
  // second add of the same product raises the line rather than duplicating it.
  test("the stock limit is applied to the total in the cart, not to each add", async () => {
    await addToCart(mockKeyboardId, 2); // exactly the stock
    const res = await addToCart(mockKeyboardId, 1);

    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/only 2/i);
  });
});

describe("checking out", () => {
  beforeEach(async () => {
    await addToCart(mockHeadsetId, 2);
  });

  // There is no such thing as a pending order in this system: an order exists
  // only once the money has been taken, which is why status has no default on
  // the model and only checkout sets it.
  test("an approved payment creates a paid order", async () => {
    const res = await payWith();

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("paid");
    expect(res.body.data.paymentReference).toBeTruthy();
  });

  // Price tampering, the classic one. The browser sends an address and a card
  // and nothing else; the total comes from the catalogue.
  test("a total sent by the client is ignored - the server prices the order", async () => {
    const res = await request(app).post("/api/orders").set("Authorization", customer).send({
      shippingAddress: {
        line1: "440 Silicon Pass", city: "Centurion", province: "Gauteng",
        postalCode: "0157", country: "South Africa",
      },
      card: { number: APPROVED_CARD, expMonth: 8, expYear: 2029, cvc: "123" },
      totalCents: 1,
      subtotalCents: 1,
    });

    expect(res.body.data.totalCents).toBe(69800 + Math.round(69800 * TAX_RATE));
  });

  test("stock is taken exactly once", async () => {
    await payWith();

    expect(mockFindProduct(mockHeadsetId).stockQty).toBe(3);
  });

  test("the cart is emptied, so a refresh cannot buy the same thing twice", async () => {
    await payWith();

    const { body } = await viewCart();
    expect(body.data.items).toHaveLength(0);
  });

  test.each([
    ["a postal code that is not four digits", { postalCode: "15" }],
  ])("%s is refused before the card is touched", async (_label, over) => {
    const res = await request(app).post("/api/orders").set("Authorization", customer).send({
      shippingAddress: {
        line1: "440 Silicon Pass", city: "Centurion", province: "Gauteng",
        postalCode: "0157", country: "South Africa", ...over,
      },
      card: { number: APPROVED_CARD, expMonth: 8, expYear: 2029, cvc: "123" },
    });

    expect(res.status).toBe(400);
    expect(mockOrders).toHaveLength(0);
  });
});

describe("when the payment fails", () => {
  beforeEach(async () => {
    await addToCart(mockHeadsetId, 2);
  });

  test("a declined card is answered with 402, not a generic 500", async () => {
    const res = await payWith(DECLINED_CARD);

    expect(res.status).toBe(402);
    expect(res.body.error.code).toBe("PAYMENT_DECLINED");
  });

  test("no order is created for a payment that did not go through", async () => {
    await payWith(DECLINED_CARD);

    expect(mockOrders).toHaveLength(0);
  });

  // The compensating write. Stock is decremented before the card is charged,
  // so a decline that did not put it back would quietly destroy inventory on
  // every failed payment.
  test("stock taken for the attempt is put back", async () => {
    await payWith(DECLINED_CARD);

    expect(mockFindProduct(mockHeadsetId).stockQty).toBe(5);
  });

  // A gateway that never answers is not a decline. The customer needs to know
  // whether to try a different card or simply wait.
  test("an unreachable gateway is a 503, kept distinct from a decline", async () => {
    const res = await payWith(UNAVAILABLE_CARD);

    expect(res.status).toBe(503);
    expect(mockFindProduct(mockHeadsetId).stockQty).toBe(5);
    expect(mockOrders).toHaveLength(0);
  });

  // Stock can run out between filling the cart and paying.
  test("stock that ran out in the meantime is refused, and nothing is charged", async () => {
    mockFindProduct(mockHeadsetId).stockQty = 1;

    const res = await payWith();

    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/not enough stock/i);
    expect(mockOrders).toHaveLength(0);
  });
});

describe("after the order is placed", () => {
  let orderId;

  beforeEach(async () => {
    await addToCart(mockHeadsetId, 2);
    const { body } = await payWith();
    orderId = body.data.id;
  });

  // Broken object-level authorisation, the most exploited API flaw there is.
  // The id in the URL is not trusted; ownership is re-checked against the
  // token on every read.
  test("another account cannot read it by guessing the id", async () => {
    const someoneElse = "Bearer " + signAccessToken({ id: "6716f0a1c2d3e4f5a6b7c999", role: "customer" });

    const res = await request(app).get(`/api/orders/${orderId}`).set("Authorization", someoneElse);

    expect(res.status).toBe(403);
  });
});

describe("an admin moving the order along", () => {
  let orderId;

  beforeEach(async () => {
    await addToCart(mockHeadsetId, 2);
    const { body } = await payWith();
    orderId = body.data.id;
  });

  test("paid to shipped to delivered, in that order", async () => {
    expect((await moveTo(orderId, "shipped")).body.data.status).toBe("shipped");
    expect((await moveTo(orderId, "delivered")).body.data.status).toBe("delivered");
  });

  test("a paid order cannot skip straight to delivered", async () => {
    const res = await moveTo(orderId, "delivered");

    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/cannot move an order from paid to delivered/i);
  });

  // Otherwise the catalogue slowly sells stock it still has on the shelf.
  test("cancelling puts the stock back", async () => {
    expect(mockFindProduct(mockHeadsetId).stockQty).toBe(3);

    await moveTo(orderId, "cancelled");

    expect(mockFindProduct(mockHeadsetId).stockQty).toBe(5);
  });

  test("a customer cannot move their own order along", async () => {
    const res = await request(app)
      .patch(`/api/admin/orders/${orderId}/status`)
      .set("Authorization", customer)
      .send({ status: "shipped" });

    expect(res.status).toBe(403);
  });
});

describe("an admin is not a shopper", () => {
  // The API is the control. The client's RequireShopper guard only explains
  // this earlier; these are the refusals that actually enforce it.
  test("an admin cannot add to a cart", async () => {
    expect((await addToCart(mockHeadsetId, 1, admin)).status).toBe(403);
  });

  test("an admin cannot check out", async () => {
    expect((await payWith(APPROVED_CARD, admin)).status).toBe(403);
  });

  // Reading is deliberately allowed: the navbar asks for the cart on every
  // page, and a 403 on every page load would be worse than an empty cart.
  test("an admin can still read a cart, and it is empty", async () => {
    const res = await viewCart(admin);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(0);
  });
});
