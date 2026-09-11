"use strict";
process.env.NODE_ENV = "test";
process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sen371-test";
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test-access-secret-not-a-real-key";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-refresh-secret-not-a-real-key";
const { TRANSITIONS } = require("../../src/services/order.service");
const { ORDER_STATUSES } = require("../../src/models/order.model");

// FR-10: order status follows the state machine
describe("order status transitions", () => {
  // An order only exists once payment is authorised, so paid is the first
  // state - there is no pending order sitting around unpaid.
  test("there is no pending state", () => {
    expect(ORDER_STATUSES).not.toContain("pending");
    expect(TRANSITIONS.pending).toBeUndefined();
  });

  test("paid may become shipped or cancelled", () => {
    expect(TRANSITIONS.paid).toEqual(expect.arrayContaining(["shipped", "cancelled"]));
  });

  test("paid may not jump straight to delivered", () => {
    expect(TRANSITIONS.paid).not.toContain("delivered");
  });

  test("delivered and cancelled are terminal", () => {
    expect(TRANSITIONS.delivered).toHaveLength(0);
    expect(TRANSITIONS.cancelled).toHaveLength(0);
  });

  // Guards against the table and the enum drifting apart, which is how a
  // status becomes unreachable or unmovable without anyone noticing.
  test("the transition table covers exactly the statuses the model allows", () => {
    expect(Object.keys(TRANSITIONS).sort()).toEqual([...ORDER_STATUSES].sort());
  });
});
