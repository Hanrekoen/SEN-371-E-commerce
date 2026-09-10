"use strict";
const request = require("supertest");

// PERSON 2 - the security middleware as it is actually wired in app.js.
//
// These load the real application, not a stand-in, so the assertions cover
// middleware ORDER as well as behaviour. /api/health is used throughout
// because it is the one route that touches no database.

function loadApp({ nodeEnv = "test", rateLimits = false } = {}) {
  jest.resetModules();
  process.env.NODE_ENV = nodeEnv;
  process.env.RATE_LIMIT_IN_TESTS = rateLimits ? "true" : "false";
  process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/sen371-test";
  process.env.JWT_ACCESS_SECRET = "a".repeat(64);
  process.env.JWT_REFRESH_SECRET = "b".repeat(64);
  return require("../../src/app");
}

afterAll(() => {
  process.env.NODE_ENV = "test";
  process.env.RATE_LIMIT_IN_TESTS = "false";
});

describe("helmet", () => {
  test("security headers are set, and the Express fingerprint is gone", async () => {
    const res = await request(loadApp()).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBeDefined();
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});

describe("the response envelope holds on failures too", () => {
  test("an unknown route returns the project envelope, not Express's HTML", async () => {
    const res = await request(loadApp()).get("/api/no-such-route");
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, data: null });
    expect(res.body.error.code).toBeDefined();
  });

  test("malformed JSON is a 400 in the same shape", async () => {
    const res = await request(loadApp())
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{not json");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_JSON");
  });
});

describe("rate limiting", () => {
  test("the global limiter answers 429 in the project envelope", async () => {
    const app = loadApp({ rateLimits: true });
    let last;
    // 300 is the budget; the 301st must be refused.
    for (let i = 0; i < 301; i += 1) {
      last = await request(app).get("/api/health");
    }
    expect(last.status).toBe(429);
    expect(last.body).toMatchObject({
      success: false,
      error: { code: "TOO_MANY_REQUESTS" },
    });
    expect(last.headers["ratelimit-remaining"]).toBeDefined();
  }, 60000);

  test("limiters are skipped in the test suite unless asked for", async () => {
    const app = loadApp({ rateLimits: false });
    for (let i = 0; i < 320; i += 1) await request(app).get("/api/health");
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
  }, 60000);
});

describe("production error handling", () => {
  test("development leaks a stack trace, on purpose", async () => {
    const res = await request(loadApp({ nodeEnv: "development" })).get("/api/no-such-route");
    expect(res.body.error.stack).toBeDefined();
  });

  test("production does not", async () => {
    const res = await request(loadApp({ nodeEnv: "production" })).get("/api/no-such-route");
    expect(res.body.error.stack).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toMatch(/at .*\.js:\d+/);
  });
});
