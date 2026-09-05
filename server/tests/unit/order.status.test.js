"use strict";
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
