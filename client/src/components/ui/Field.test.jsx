import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Field from "./Field";

// COMPONENT TESTS.
//
// Field is used by every form in the app, so how it reports a failure decides
// whether any form is usable by a screen reader. These tests assert on the
// accessible output - the label association and the ARIA wiring - rather than
// on class names, because that is what a person actually depends on.

describe("Field", () => {
  // Finding the input by its label is also how a screen reader finds it.
  test("the label is associated with the input, so clicking it focuses the field", async () => {
    const user = userEvent.setup();
    render(<Field label="Email address" />);

    await user.click(screen.getByText("Email address"));
    expect(screen.getByLabelText("Email address")).toHaveFocus();
  });

  describe("when the API rejects the value", () => {
    // Marked invalid, not merely coloured red - otherwise the failure is
    // invisible to anyone not looking at the colour.
    test("the input is marked invalid for assistive technology", () => {
      render(<Field label="Email address" error="Email is invalid" />);
      expect(screen.getByLabelText("Email address")).toHaveAttribute("aria-invalid", "true");
    });

    test("the input points at its own message, so the two are connected", () => {
      render(<Field label="Email address" error="Email is invalid" />);
      const input = screen.getByLabelText("Email address");
      const describedBy = input.getAttribute("aria-describedby");
      expect(describedBy).toBeTruthy();
      expect(document.getElementById(describedBy)).toHaveTextContent("Email is invalid");
    });

    test("the message is announced rather than silently appearing", () => {
      render(<Field label="Email address" error="Email is invalid" />);
      expect(screen.getByRole("alert")).toHaveTextContent("Email is invalid");
    });

    // A hint and an error in the same place would compete; the error wins.
    test("the error replaces the hint", () => {
      render(<Field label="Postal code" hint="Four digits" error="postalCode must be 4 digits" />);
      expect(screen.queryByText("Four digits")).not.toBeInTheDocument();
      expect(screen.getByText("postalCode must be 4 digits")).toBeInTheDocument();
    });
  });

  test("two fields on one page get distinct ids", () => {
    render(<><Field label="First name" /><Field label="Last name" /></>);
    const a = screen.getByLabelText("First name").id;
    const b = screen.getByLabelText("Last name").id;
    expect(a).not.toBe(b);
  });
});
