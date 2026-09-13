"use strict";

// GET /auth/me. This exists because the endpoint was silently lost in a merge
// once: nothing covered it, so the whole suite stayed green while every
// client page load 404'd and every signed-in session died on refresh.
//
// The client calls this on every page load, so it is load-bearing for
// "am I still signed in?" and deserves its own test.

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/sen371-test";
process.env.JWT_ACCESS_SECRET = "test-access-secret-not-a-real-key";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-not-a-real-key";

const mockUserId = "6716f0a1c2d3e4f5a6b7c904";

let mockUser = null;

jest.mock("../../src/repositories/user.repository", () => ({
  findById: jest.fn(async (id) => (id === mockUserId ? mockUser : null)),
  findByEmail: jest.fn(async () => null),
  create: jest.fn(async (u) => u),
  incrementTokenVersion: jest.fn(async () => ({})),
}));

const request = require("supertest");
const app = require("../../src/app");
const { signAccessToken } = require("../../src/utils/jwt");

const tokenFor = (id = mockUserId, role = "customer") =>
  "Bearer " + signAccessToken({ id, role });

beforeEach(() => {
  mockUser = {
    _id: mockUserId,
    firstName: "Hanre",
    lastName: "Koen",
    email: "hanre@sen371.test",
    role: "customer",
    isActive: true,
    tokenVersion: 0,
    passwordHash: "$2b$12$notarealhashnotarealhashnotarealhashnotarealhashnotar",
    toObject() { return { ...this }; },
  };
});

describe("GET /api/auth/me", () => {
  test("the route exists - it is not a 404", async () => {
    const res = await request(app).get("/api/auth/me").set("Authorization", tokenFor());
    expect(res.status).not.toBe(404);
  });

  test("returns the signed-in user", async () => {
    const res = await request(app).get("/api/auth/me").set("Authorization", tokenFor());
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      email: "hanre@sen371.test",
      firstName: "Hanre",
      role: "customer",
    });
  });

  test("never returns the password hash or the token version", async () => {
    const res = await request(app).get("/api/auth/me").set("Authorization", tokenFor());
    const body = JSON.stringify(res.body);
    expect(body).not.toContain("passwordHash");
    expect(body).not.toContain("tokenVersion");
    expect(body).not.toContain("$2b$");
  });

  test("anonymous callers get 401, not a user", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.data).toBeNull();
  });

  // The record is re-read rather than trusted from the token, so a role
  // change or a deactivation takes effect on the next page load instead of
  // whenever the token happens to expire.
  test("the role comes from the record, not from the token", async () => {
    mockUser.role = "customer";
    const res = await request(app).get("/api/auth/me").set("Authorization", tokenFor(mockUserId, "admin"));
    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe("customer");
  });

  test("a deactivated account is refused even with a valid token", async () => {
    mockUser.isActive = false;
    const res = await request(app).get("/api/auth/me").set("Authorization", tokenFor());
    expect(res.status).toBe(401);
  });

  test("a token for a user who no longer exists is refused", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", tokenFor("6716f0a1c2d3e4f5a6b7c999"));
    expect(res.status).toBe(401);
  });
});
