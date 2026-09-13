import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import StatusPill from "./StatusPill";
import { ORDER_STATUSES } from "../../test/orderStatuses";

// COMPONENT TESTS.
//
// One pill renders an order's status in both the customer's history and the
// admin dashboard. If the two ever disagree, the same order looks like two
// different things to the two people discussing it.

describe("StatusPill", () => {
  test("shows the status as text, so it does not rely on colour alone", () => {
    render(<StatusPill status="paid" />);
    expect(screen.getByText("paid")).toBeInTheDocument();
  });

  // Every status the model allows must have a tone. A missed one renders
  // unstyled, which is exactly what happened when "paid" had no rule.
  test.each(ORDER_STATUSES)("%s gets a deliberate tone, not the fallback", (status) => {
    const { container } = render(<StatusPill status={status} />);
    const pill = container.querySelector(".gv-pill");
    expect(pill.className).not.toContain("gv-pill--neutral");
  });

  test("an unknown status falls back to neutral instead of rendering unstyled", () => {
    const { container } = render(<StatusPill status="teleported" />);
    expect(container.querySelector(".gv-pill").className).toContain("gv-pill--neutral");
  });

  test("the tone is case-insensitive, since the API could shout", () => {
    const { container } = render(<StatusPill status="DELIVERED" />);
    expect(container.querySelector(".gv-pill").className).toContain("gv-pill--success");
  });

  test.each([
    ["null", null],
    ["undefined", undefined],
  ])("%s does not crash the row it sits in", (_label, status) => {
    const { container } = render(<StatusPill status={status} />);
    expect(container.querySelector(".gv-pill")).toBeInTheDocument();
  });
});
