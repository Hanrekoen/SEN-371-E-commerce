"use strict";
process.env.NODE_ENV = "test";
process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sen371-test";
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test-access-secret-not-a-real-key";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-refresh-secret-not-a-real-key";
const { TRANSITIONS } = require("../../src/services/order.service");

// FR-10: order status follows the state machine
describe("order status transitions", () => {
  test("pending may become paid or cancelled", () => {
    expect(TRANSITIONS.pending).toEqual(expect.arrayContaining(["paid", "cancelled"]));
  });

  test("pending may not jump straight to delivered", () => {
    expect(TRANSITIONS.pending).not.toContain("delivered");
  });

  test("delivered and cancelled are terminal", () => {
    expect(TRANSITIONS.delivered).toHaveLength(0);
    expect(TRANSITIONS.cancelled).toHaveLength(0);
  });
});
