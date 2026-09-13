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

  test("it shows the amount being authorised", () => {
    renderOverlay({ run: () => new Promise(() => {}) });
    expect(screen.getByText(/785[,.]16/)).toBeInTheDocument();
  });

  test("it shows only the last four digits of the card", () => {
    renderOverlay({ run: () => new Promise(() => {}) });
    expect(screen.getByText(/4242/)).toBeInTheDocument();
    // The full number must never appear on screen.
    expect(screen.queryByText(/4242 4242 4242 4242/)).not.toBeInTheDocument();
  });

  test("it starts the request immediately rather than after the animation", () => {
    const run = vi.fn(() => new Promise(() => {}));
    renderOverlay({ run });
    expect(run).toHaveBeenCalledTimes(1);
  });

  // The core honesty property: the outcome is never announced early.
  test("it does not claim approval while the request is still outstanding", async () => {
    const { promise } = deferred();
    renderOverlay({ run: () => promise });

    await new Promise((r) => setTimeout(r, 1600));
    expect(screen.queryByText(/payment approved/i)).not.toBeInTheDocument();
  });

  test("it tells the customer not to close the window", () => {
    renderOverlay({ run: () => new Promise(() => {}) });
    expect(screen.getByText(/do not close this window/i)).toBeInTheDocument();
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

  test("it shows the provider's reference, which is the customer's proof", async () => {
    renderOverlay({ run: async () => makeOrder({ paymentReference: "PAY-TEST-123" }) });
    expect(await screen.findByText(/PAY-TEST-123/, {}, { timeout: 4000 })).toBeInTheDocument();
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

  test("a validation failure asks the customer to correct their details", async () => {
    renderOverlay({ run: async () => { throw new ApiError("Bad card", 400); } });
    expect(await screen.findByRole("alert", {}, { timeout: 4000 })).toHaveTextContent(/check your details/i);
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

  test("the steps are replaced by the outcome, not left looking mid-flight", async () => {
    renderOverlay({ run: async () => { throw new ApiError("Declined", 402); } });
    await screen.findByRole("alert", {}, { timeout: 4000 });
    expect(screen.queryByText(/establishing secure channel/i)).not.toBeInTheDocument();
  });
});

describe("dismissing", () => {
  test("it renders nothing when closed", () => {
    const { container } = renderOverlay({ open: false, run: async () => makeOrder() });
    expect(container).toBeEmptyDOMElement();
  });

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

  test("it is a modal dialog, so assistive tech treats it as one", () => {
    renderOverlay({ run: () => new Promise(() => {}) });
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });
});
