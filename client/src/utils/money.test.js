import { describe, expect, test } from "vitest";
import { formatCents, formatCentsCompact, formatDate, CURRENCY } from "./money";

// UNIT TESTS - pure functions, no DOM, no network.
//
// Money formatting gets its own suite because it is the one place the client
// is allowed to divide by 100, and because the currency has already been wrong
// once: prices rendered as US dollars while the gateway authorised in rand.

describe("formatCents", () => {
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
  test("a missing amount falls back to zero rather than NaN", () => {
    const out = formatCents(undefined);
    expect(out).not.toMatch(/nan/i);
    expect(out).toMatch(/0[,.]00/);
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
});

describe("formatDate", () => {
  test("formats an ISO date readably", () => {
    expect(formatDate("2026-09-13T10:00:00.000Z")).toMatch(/2026/);
  });

  // Order rows render this, and an order with no date must not print
  // "Invalid Date" in the middle of the table.
  test("a missing date renders a dash", () => {
    expect(formatDate(null)).toBe("-");
  });
});
