"use strict";

// Categories: validation, DTO and pagination, through the real app.
// These exist because this work first shipped as an unmounted duplicate route
// file - written, but unreachable, and nothing failed to say so.

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/sen371-test";
process.env.JWT_ACCESS_SECRET = "test-access-secret-not-a-real-key";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-not-a-real-key";

const mockCategories = [
  { _id: "507f1f77bcf86cd799439011", name: "Keyboards", slug: "keyboards", description: "Mechanical boards", __v: 0, createdAt: new Date(), updatedAt: new Date() },
  { _id: "507f1f77bcf86cd799439012", name: "Mice", slug: "mice", description: "Pointing devices", __v: 0, createdAt: new Date(), updatedAt: new Date() },
  { _id: "507f1f77bcf86cd799439013", name: "Headsets", slug: "headsets", description: "Audio", __v: 0, createdAt: new Date(), updatedAt: new Date() },
];

jest.mock("../../src/repositories/category.repository", () => ({
  list: jest.fn(async ({ page = 1, limit = 20 } = {}) => ({
    items: mockCategories.slice((page - 1) * limit, page * limit),
    total: mockCategories.length,
    page,
    limit,
  })),
  findByslug: jest.fn(async (slug) => mockCategories.find((c) => c.slug === slug) || null),
  findByName: jest.fn(async () => null),
  findById: jest.fn(async (id) => mockCategories.find((c) => c._id === id) || null),
  create: jest.fn(async (data) => ({ _id: "507f1f77bcf86cd799439099", __v: 0, ...data })),
  updateById: jest.fn(async (id, data) => {
    const found = mockCategories.find((c) => c._id === id);
    return found ? { ...found, ...data } : null;
  }),
  deleteById: jest.fn(async () => true),
}));

jest.mock("../../src/repositories/product.repository", () => ({
  count: jest.fn(async () => 0),
}));

const request = require("supertest");
const app = require("../../src/app");
const { signAccessToken } = require("../../src/utils/jwt");

const admin = "Bearer " + signAccessToken({ id: "507f191e810c19729de860ea", role: "admin" });
const customer = "Bearer " + signAccessToken({ id: "507f191e810c19729de860eb", role: "customer" });
const ID = "507f1f77bcf86cd799439011";

describe("the category routes are actually mounted", () => {
  test("GET /api/categories answers", async () => {
    const res = await request(app).get("/api/categories");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe("4.3 - categories paginate like products and orders", () => {
  test("the response carries meta, not a bare array", async () => {
    const res = await request(app).get("/api/categories");
    expect(res.body.meta).toMatchObject({ page: 1, limit: 20, total: 3, totalPages: 1 });
  });

  test("page and limit are honoured", async () => {
    const res = await request(app).get("/api/categories?page=2&limit=1");
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe("Mice");
    expect(res.body.meta).toMatchObject({ page: 2, limit: 1, total: 3, totalPages: 3 });
  });

  test("an unbounded limit is refused rather than served", async () => {
    const res = await request(app).get("/api/categories?limit=100000");
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe("limit");
  });

  test("page 0 is refused", async () => {
    const res = await request(app).get("/api/categories?page=0");
    expect(res.status).toBe(400);
  });
});

describe("4.2 - the category DTO", () => {
  test("id, not _id, and no internals", async () => {
    const res = await request(app).get("/api/categories");
    const item = res.body.data[0];
    expect(item.id).toBe(ID);
    expect(item._id).toBeUndefined();
    expect(item.__v).toBeUndefined();
    expect(item.createdAt).toBeUndefined();
    expect(Object.keys(item).sort()).toEqual(["description", "id", "name", "slug"]);
  });

  test("the detail endpoint uses the same shape", async () => {
    const res = await request(app).get("/api/categories/keyboards");
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(ID);
    expect(res.body.data._id).toBeUndefined();
  });
});

describe("4.2 - category validation", () => {
  test("a one-character name is rejected", async () => {
    const res = await request(app).post("/api/categories").set("Authorization", admin).send({ name: "A" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details[0].field).toBe("name");
  });

  test("a name over 60 characters is rejected", async () => {
    const res = await request(app).post("/api/categories").set("Authorization", admin).send({ name: "x".repeat(61) });
    expect(res.status).toBe(400);
  });

  test("a malformed slug is rejected", async () => {
    const res = await request(app).post("/api/categories").set("Authorization", admin)
      .send({ name: "Valid Name", slug: "Not A Slug" });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe("slug");
  });

  test("a description over 300 characters is rejected", async () => {
    const res = await request(app).post("/api/categories").set("Authorization", admin)
      .send({ name: "Valid Name", description: "x".repeat(301) });
    expect(res.status).toBe(400);
  });

  test("slug is optional - the service derives it from the name", async () => {
    // A name with no existing slug, so this exercises derivation rather than
    // the conflict check (an existing "Headsets" would correctly be a 409).
    const res = await request(app).post("/api/categories").set("Authorization", admin)
      .send({ name: "Webcams and Capture" });
    expect(res.status).toBe(201);
    expect(res.body.data.slug).toBe("webcams-and-capture");
    expect(res.body.data._id).toBeUndefined();
  });

  test("a duplicate slug is a 409, not a silent overwrite", async () => {
    const res = await request(app).post("/api/categories").set("Authorization", admin)
      .send({ name: "Keyboards" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  test("a malformed :id is rejected before it reaches the database", async () => {
    const res = await request(app).delete("/api/categories/not-an-id").set("Authorization", admin);
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe("id");
  });
});

describe("the admin guard still applies", () => {
  test("anonymous create is 401", async () => {
    const res = await request(app).post("/api/categories").send({ name: "Nope" });
    expect(res.status).toBe(401);
  });

  test("a customer create is 403", async () => {
    const res = await request(app).post("/api/categories").set("Authorization", customer).send({ name: "Nope" });
    expect(res.status).toBe(403);
  });
});

describe("Swagger", () => {
  test("the OpenAPI document is served as JSON", async () => {
    const res = await request(app).get("/api/openapi.json");
    expect(res.status).toBe(200);
    expect(res.body.openapi).toMatch(/^3\./);
    expect(res.body.paths).toBeDefined();
  });

  test("the browsable page is served at /api/docs", async () => {
    const res = await request(app).get("/api/docs/");
    expect(res.status).toBe(200);
    expect(res.text.toLowerCase()).toContain("swagger");
  });
});
