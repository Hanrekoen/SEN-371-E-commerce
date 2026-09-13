"use strict";
process.env.NODE_ENV = "test";
process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sen371-test";
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test-access-secret-not-a-real-key";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-refresh-secret-not-a-real-key";

const { authenticate, requireRole, denyRole, shoppersOnly } = require("../../src/middleware/auth");
const { signAccessToken } = require("../../src/utils/jwt");

// UNIT TESTS - the middleware in isolation, with a fake req/res/next rather
// than a running app. Everything in the API that is protected at all is
// protected by these three functions, so they are worth testing alone as well
// as through the routes.

const runMiddleware = (mw, req) => new Promise((resolve) => {
  mw(req, {}, (err) => resolve(err));
});

const withToken = (payload) => ({ headers: { authorization: "Bearer " + signAccessToken(payload) } });

describe("authenticate", () => {
  test("attaches the id and role from a valid token", async () => {
    const req = withToken({ id: "u1", role: "customer" });
    const err = await runMiddleware(authenticate, req);
    expect(err).toBeUndefined();
    expect(req.user).toEqual({ id: "u1", role: "customer" });
  });

  test.each([
    ["no header at all", {}],
  ])("%s is rejected as unauthorised", async (_label, headers) => {
    const err = await runMiddleware(authenticate, { headers });
    expect(err).toBeDefined();
    expect(err.status).toBe(401);
  });

  // A token signed with someone else's secret must not be honoured - this is
  // the difference between a signature check and a decode. A token this
  // middleware cannot verify is a 401 whatever is wrong with it.
  test("a token signed with a different secret is rejected", async () => {
    const jwt = require("jsonwebtoken");
    const forged = jwt.sign({ id: "u1", role: "admin" }, "a-different-secret");
    const err = await runMiddleware(authenticate, { headers: { authorization: "Bearer " + forged } });
    expect(err.status).toBe(401);
  });

  // The role is read from the signed payload, so a header cannot supply one.
  test("a role cannot be injected through a header", async () => {
    const req = { headers: { authorization: "Bearer " + signAccessToken({ id: "u1", role: "customer" }), "x-role": "admin" } };
    await runMiddleware(authenticate, req);
    expect(req.user.role).toBe("customer");
  });
});

describe("requireRole", () => {
  // The guard lets the named role through and refuses every other one.
  test("refuses a different role with 403, not 401", async () => {
    expect(
      await runMiddleware(requireRole("admin"), { user: { id: "u1", role: "admin" } })
    ).toBeUndefined();

    const err = await runMiddleware(requireRole("admin"), { user: { id: "u1", role: "customer" } });
    expect(err.status).toBe(403);
  });

  // 401 means "who are you", 403 means "not you" - a caller with no user at
  // all has not failed the role check, they have failed to authenticate.
  test("no user is 401, because that is a missing identity not a wrong one", async () => {
    const err = await runMiddleware(requireRole("admin"), {});
    expect(err.status).toBe(401);
  });
});

describe("denyRole / shoppersOnly", () => {
  test("blocks a named role", async () => {
    const err = await runMiddleware(denyRole("admin"), { user: { id: "u1", role: "admin" } });
    expect(err.status).toBe(403);
  });

  // The point of denying rather than allowing: a role added later can shop
  // without anyone remembering to edit the guard.
  test("a role invented later can still shop without changing this guard", async () => {
    const err = await runMiddleware(shoppersOnly, { user: { id: "u1", role: "wholesaler" } });
    expect(err).toBeUndefined();
  });
});
