import { describe, expect, test } from "vitest";
import { formatCents, formatCentsCompact, formatDate, CURRENCY } from "./money";

// UNIT TESTS - pure functions, no DOM, no network.
//
// Money formatting gets its own suite because it is the one place the client
// is allowed to divide by 100, and because the currency has already been wrong
// once: prices rendered as US dollars while the gateway authorised in rand.

describe("formatCents", () => {
  test("renders whole rands", () => {
    expect(formatCents(34900)).toMatch(/349[,.]00/);
  });

  test("keeps both decimal places", () => {
    expect(formatCents(78516)).toMatch(/785[,.]16/);
  });

  test("uses the South African rand, matching the server's PAYMENT_CURRENCY", () => {
    expect(CURRENCY).toBe("ZAR");
    expect(formatCents(1000)).toContain("R");
    expect(formatCents(1000)).not.toContain("$");
  });

  test("zero is a price, not a blank", () => {
    expect(formatCents(0)).toMatch(/0[,.]00/);
  });

  // A missing figure must not render as "NaN" on a receipt.
  test.each([
    ["undefined", undefined],
    ["null", null],
    ["a string", "oops"],
    ["NaN", NaN],
  ])("%s falls back to zero rather than NaN", (_label, value) => {
    const out = formatCents(value);
    expect(out).not.toMatch(/nan/i);
    expect(out).toMatch(/0[,.]00/);
  });

  test("a large amount is grouped so it can be read at a glance", () => {
    // 1 234 567 cents = R12 345.67 - the grouping separator varies by
    // platform ICU build, so the assertion is that grouping happened at all.
    const out = formatCents(1234567);
    expect(out).toMatch(/12.?345[,.]67/);
  });

  test("negative amounts are not silently shown as positive", () => {
    expect(formatCents(-34900)).toMatch(/-|\(/);
  });
});

describe("formatCentsCompact", () => {
  test("drops the decimals for headline figures", () => {
    expect(formatCentsCompact(4825000)).not.toMatch(/[,.]00\b/);
    expect(formatCentsCompact(4825000)).toMatch(/48.?250/);
  });

  test("rounds rather than truncating", () => {
    expect(formatCentsCompact(19999)).toMatch(/200/);
  });
});

describe("formatDate", () => {
  test("formats an ISO date readably", () => {
    expect(formatDate("2026-09-13T10:00:00.000Z")).toMatch(/2026/);
  });

  // Order rows render this, and an order with no date must not print
  // "Invalid Date" in the middle of the table.
  test.each([
    ["an empty string", ""],
    ["null", null],
    ["undefined", undefined],
  ])("%s renders a dash", (_label, value) => {
    expect(formatDate(value)).toBe("-");
  });
});
