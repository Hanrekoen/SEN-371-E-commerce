import { describe, expect, test } from "vitest";
import { fieldErrors, summaryMessage } from "./apiErrors";

// UNIT TESTS.
//
// Every form in the app reports failures through these two functions, so a
// silent failure here means a customer sees a form that appears to do nothing.

const err = (over = {}) => ({ status: 400, code: "VALIDATION_ERROR", message: "Validation failed", ...over });

describe("fieldErrors", () => {
  test("maps API details onto form field names", () => {
    expect(fieldErrors(err({ details: [{ field: "email", message: "Email is invalid" }] })))
      .toEqual({ email: "Email is invalid" });
  });

  // Forms are flat; the API is not. Without this, a shipping address error
  // would attach to no input at all and simply vanish.
  test("flattens a nested field path onto the input's own name", () => {
    expect(fieldErrors(err({ details: [{ field: "shippingAddress.line1", message: "line1 is required" }] })))
      .toEqual({ line1: "line1 is required" });
  });

  test("keeps the first message when one field fails several rules", () => {
    const out = fieldErrors(err({ details: [
      { field: "password", message: "Too short" },
      { field: "password", message: "Needs a number" },
    ]}));
    expect(out.password).toBe("Too short");
  });

  test.each([
    ["no details", err()],
    ["null", null],
  ])("%s yields an empty object rather than throwing", (_label, input) => {
    expect(fieldErrors(input)).toEqual({});
  });
});

describe("summaryMessage", () => {
  test("shows the server's own message, which is usually the useful one", () => {
    expect(summaryMessage(err({ message: "Insufficient funds" }))).toBe("Insufficient funds");
  });

  // "Something went wrong" is useless when the real problem is that the API
  // is not running - a very common state during development.
  test("a network failure says the server could not be reached", () => {
    expect(summaryMessage({ code: "NETWORK_ERROR", message: "fetch failed" }))
      .toMatch(/could not reach the server/i);
  });

  test("falls back when the error carries no message", () => {
    expect(summaryMessage({ status: 500 }, "Could not save.")).toBe("Could not save.");
  });
});
