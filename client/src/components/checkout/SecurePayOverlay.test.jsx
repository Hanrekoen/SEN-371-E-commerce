import { describe, expect, test, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, customerAuth, makeOrder } from "../../test/renderWithProviders";
import SecurePayOverlay from "./SecurePayOverlay";

// COMPONENT TESTS.
//
// This overlay narrates a payment while it is in flight. Its whole design
// rests on one promise: it never shows a step as finished before the thing it
// describes has actually happened, and it never claims an outcome the API has
// not given. Those are the properties tested hardest here, because a payment
// screen that lies is worse than no payment screen.

class ApiError extends Error {
  constructor(message, status, code = "ERROR") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const defaults = {
  open: true,
  amountCents: 78516,
  card: { last4: "4242", brand: "Visa" },
  onApproved: () => {},
  onDismiss: () => {},
};

const renderOverlay = (props = {}) =>
  renderWithProviders(<SecurePayOverlay {...defaults} {...props} />, { auth: customerAuth });

// A promise the test resolves by hand, so the component can be inspected
// while the request is genuinely still outstanding.
function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe("while the payment is in flight", () => {
  test("it says it is a sandbox, so nobody mistakes it for a real payment", () => {
    renderOverlay({ run: () => new Promise(() => {}) });
    expect(screen.getByText(/sandbox/i)).toBeInTheDocument();
    expect(screen.getByText(/no real money/i)).toBeInTheDocument();
  });

  test("it shows only the last four digits of the card", () => {
    renderOverlay({ run: () => new Promise(() => {}) });
    expect(screen.getByText(/4242/)).toBeInTheDocument();
    // The full number must never appear on screen.
    expect(screen.queryByText(/4242 4242 4242 4242/)).not.toBeInTheDocument();
  });

  // The core honesty property, and the one step-narration test worth keeping:
  // the narrated steps never run ahead of the real request, so the outcome is
  // never announced early.
  test("it does not claim approval while the request is still outstanding", async () => {
    const { promise } = deferred();
    renderOverlay({ run: () => promise });

    await new Promise((r) => setTimeout(r, 1600));
    expect(screen.queryByText(/payment approved/i)).not.toBeInTheDocument();
  });
});

describe("when the payment is approved", () => {
  test("it reports approval and hands the order back", async () => {
    const order = makeOrder();
    const onApproved = vi.fn();
    renderOverlay({ run: async () => order, onApproved });

    expect(await screen.findByText(/payment approved/i, {}, { timeout: 4000 })).toBeInTheDocument();
    await waitFor(() => expect(onApproved).toHaveBeenCalledWith(order), { timeout: 4000 });
  });

});

describe("when the payment fails", () => {
  // Each outcome needs its own wording: a decline means try another card, an
  // outage means wait. Saying "payment failed" for both is useless advice.
  test("a decline says the card was not charged and to try another", async () => {
    renderOverlay({ run: async () => { throw new ApiError("Insufficient funds.", 402); } });

    expect(await screen.findByRole("alert", {}, { timeout: 4000 })).toHaveTextContent(/declined/i);
    expect(screen.getByText(/try another card/i)).toBeInTheDocument();
  });

  test("an unreachable provider says nothing was charged and to wait", async () => {
    renderOverlay({ run: async () => { throw new ApiError("The provider is not responding.", 503); } });

    const alert = await screen.findByRole("alert", {}, { timeout: 4000 });
    expect(alert).toHaveTextContent(/unreachable/i);
    expect(screen.getByText(/nothing was charged/i)).toBeInTheDocument();
  });

  test("the failure is handed back on dismiss, so the page can repeat it", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    const failure = new ApiError("Insufficient funds.", 402);
    renderOverlay({ run: async () => { throw failure; }, onDismiss });

    await screen.findByRole("alert", {}, { timeout: 4000 });
    await user.click(screen.getByRole("button", { name: /back to checkout/i }));

    expect(onDismiss).toHaveBeenCalledWith(failure);
  });

});

describe("dismissing", () => {
  // Escape must not hide a payment that is still happening - the customer
  // would not know whether they had been charged.
  test("Escape does nothing while the payment is in flight", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    renderOverlay({ run: () => new Promise(() => {}), onDismiss });

    await user.keyboard("{Escape}");
    expect(onDismiss).not.toHaveBeenCalled();
  });

  test("Escape closes once the payment has failed", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    renderOverlay({ run: async () => { throw new ApiError("Declined", 402); }, onDismiss });

    await screen.findByRole("alert", {}, { timeout: 4000 });
    await user.keyboard("{Escape}");
    expect(onDismiss).toHaveBeenCalled();
  });
});
