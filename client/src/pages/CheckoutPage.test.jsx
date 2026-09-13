import { describe, expect, test, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  renderWithProviders, customerAuth, emptyCart, cartWith, cartLine, makeOrder,
} from "../test/renderWithProviders";

vi.mock("../api/orders.api", () => ({
  checkout: vi.fn(),
  listMyOrders: vi.fn(),
  getMyOrder: vi.fn(),
}));

import { checkout } from "../api/orders.api";
import CheckoutPage from "./CheckoutPage";

// COMPONENT TESTS - the highest-stakes screen in the app.
//
// The card details never reach our server in a usable shape unless this page
// converts them correctly, and every conversion here is one the customer
// cannot see: spaces stripped from the number, "08 / 29" split into a month
// and a four-digit year. Those are asserted on the payload actually sent.
//
// The declined path is tested as hard as the approved one. A payment that
// fails silently, or one that empties the cart anyway, is worse than a
// payment that never started.

class ApiError extends Error {
  constructor(message, status, details = null) {
    super(message);
    this.status = status;
    this.code = status === 402 ? "PAYMENT_DECLINED" : "ERROR";
    this.details = details;
  }
}

const FULL_CART = cartWith([cartLine({ quantity: 2, lineTotalCents: 69800 })]);

let setCart;

const renderPage = (cart = FULL_CART) =>
  renderWithProviders(<CheckoutPage />, {
    auth: customerAuth,
    cart,
    cartApi: { setCart },
    route: "/checkout",
    path: "/checkout",
    routes: [{ path: "/orders/:orderId/confirmation", element: <div>receipt for o1</div> }],
  });

const fill = async (user, label, value) => {
  const input = screen.getByLabelText(new RegExp(label, "i"));
  await user.clear(input);
  await user.type(input, value);
};

// The details a real customer would type, spaces and all.
async function fillTheForm(user, over = {}) {
  const v = {
    line1: "440 Silicon Pass",
    city: "Centurion",
    province: "Gauteng",
    postalCode: "0157",
    cardName: "Hanre Koen",
    cardNumber: "4242424242424242",
    expiry: "0829",
    cvc: "123",
    ...over,
  };
  await fill(user, "street address", v.line1);
  await fill(user, "^city", v.city);
  await fill(user, "^province", v.province);
  await fill(user, "postal code", v.postalCode);
  await fill(user, "cardholder name", v.cardName);
  await fill(user, "card number", v.cardNumber);
  await fill(user, "^expiry", v.expiry);
  await fill(user, "^cvc", v.cvc);
}

const pay = (user) => user.click(screen.getByRole("button", { name: /execute transaction/i }));

beforeEach(() => {
  vi.clearAllMocks();
  setCart = vi.fn();
  checkout.mockResolvedValue(makeOrder());
  // The overlay skips its pacing timers under reduced motion, so the whole
  // payment resolves as fast as the mocked request. This keeps the tests
  // about the outcome rather than about the animation.
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query.includes("reduced-motion"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  }));
});

describe("an empty cart", () => {
  // Checking out nothing would create a R0 order, so the page refuses to be a
  // checkout at all rather than validating its way out of it later.
  test("offers the catalogue instead of a payment form", () => {
    renderPage(emptyCart);
    expect(screen.getByRole("heading", { name: /vault is empty/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/card number/i)).not.toBeInTheDocument();
  });
});

describe("the order summary", () => {
  test("lists each line at the total the server calculated", () => {
    const { container } = renderPage();
    expect(screen.getByText("Obsidian X-9 Headset")).toBeInTheDocument();
    // A one-line cart makes the line price and the subtotal the same number,
    // so this asserts on the line itself rather than on "R 698,00 appears
    // somewhere", which the subtotal alone would satisfy.
    expect(container.querySelector(".gv-checkout__price")).toHaveTextContent("R 698,00");
    expect(screen.getByText("2x")).toBeInTheDocument();
  });

  test("free shipping is said in words, not as R 0,00", () => {
    renderPage();
    expect(screen.getByText("FREE")).toBeInTheDocument();
  });

  test("the charge shown is the cart total from the server", () => {
    renderPage();
    // 69800 subtotal + 8% tax
    expect(screen.getByText("R 753,84")).toBeInTheDocument();
  });

  test("the name on file is prefilled, since it is almost always right", () => {
    renderPage();
    expect(screen.getByLabelText(/first name/i)).toHaveValue("Hanre");
    expect(screen.getByLabelText(/last name/i)).toHaveValue("Koen");
  });
});

describe("what the card fields do while typing", () => {
  test("the card number is grouped in fours so it can be checked by eye", async () => {
    const user = userEvent.setup();
    renderPage();

    await fill(user, "card number", "4242424242424242");

    expect(screen.getByLabelText(/card number/i)).toHaveValue("4242 4242 4242 4242");
  });

  test("the expiry becomes MM / YY", async () => {
    const user = userEvent.setup();
    renderPage();

    await fill(user, "^expiry", "0829");

    expect(screen.getByLabelText(/^expiry/i)).toHaveValue("08 / 29");
  });

  test("the CVC takes digits only, and no more than four", async () => {
    const user = userEvent.setup();
    renderPage();

    await fill(user, "^cvc", "12a34567");

    expect(screen.getByLabelText(/^cvc/i)).toHaveValue("1234");
  });

  test("the CVC is masked, like the card entry screens people already trust", () => {
    renderPage();
    expect(screen.getByLabelText(/^cvc/i)).toHaveAttribute("type", "password");
  });
});

describe("paying", () => {
  // The formatting that makes the number readable would make it invalid, so
  // the spaces must come off before it is sent.
  test("sends the card number with the display spaces stripped", async () => {
    const user = userEvent.setup();
    renderPage();
    await fillTheForm(user);
    await pay(user);

    await waitFor(() => expect(checkout).toHaveBeenCalled());
    expect(checkout.mock.calls[0][0].card.number).toBe("4242424242424242");
  });

  // The form takes two digits; the API wants a full year. Sending 29 would
  // expire every card in the year 29 AD.
  test("splits the expiry into a month and a four-digit year", async () => {
    const user = userEvent.setup();
    renderPage();
    await fillTheForm(user);
    await pay(user);

    await waitFor(() => expect(checkout).toHaveBeenCalled());
    expect(checkout.mock.calls[0][0].card).toMatchObject({ expMonth: 8, expYear: 2029 });
  });

  test("sends the shipping address as typed", async () => {
    const user = userEvent.setup();
    renderPage();
    await fillTheForm(user);
    await pay(user);

    await waitFor(() => expect(checkout).toHaveBeenCalled());
    expect(checkout.mock.calls[0][0].shippingAddress).toEqual({
      line1: "440 Silicon Pass",
      city: "Centurion",
      province: "Gauteng",
      postalCode: "0157",
      country: "South Africa",
    });
  });

  // No amount is sent. The server prices the order from the live catalogue,
  // so a tampered total in the browser cannot change what is charged.
  test("sends no amount - the server prices the order", async () => {
    const user = userEvent.setup();
    renderPage();
    await fillTheForm(user);
    await pay(user);

    await waitFor(() => expect(checkout).toHaveBeenCalled());
    const body = checkout.mock.calls[0][0];
    expect(body).not.toHaveProperty("totalCents");
    expect(body).not.toHaveProperty("amountCents");
  });

  test("the payment screen names the card being charged", async () => {
    const user = userEvent.setup();
    checkout.mockReturnValue(new Promise(() => {}));
    renderPage();
    await fillTheForm(user);
    await pay(user);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent(/visa/i);
    expect(dialog).toHaveTextContent(/4242/);
  });

  // Anyone looking at this screen should be able to tell no real money moves.
  test("the payment screen says it is a simulation", async () => {
    const user = userEvent.setup();
    checkout.mockReturnValue(new Promise(() => {}));
    renderPage();
    await fillTheForm(user);
    await pay(user);

    expect(await screen.findByText(/sandbox/i)).toBeInTheDocument();
  });
});

describe("an approved payment", () => {
  test("takes the customer to the receipt for that order", async () => {
    const user = userEvent.setup();
    renderPage();
    await fillTheForm(user);
    await pay(user);

    expect(await screen.findByText("receipt for o1")).toBeInTheDocument();
  });

  // Checkout empties the cart server-side. Not mirroring that leaves a stale
  // count in the navbar until the next page load.
  test("empties the local cart to match what the server did", async () => {
    const user = userEvent.setup();
    renderPage();
    await fillTheForm(user);
    await pay(user);

    await waitFor(() => expect(setCart).toHaveBeenCalled());
    expect(setCart.mock.calls[0][0]).toMatchObject({ items: [], itemCount: 0, totalCents: 0 });
  });
});

describe("a declined payment", () => {
  const decline = () =>
    checkout.mockRejectedValue(new ApiError("Your card was declined.", 402));

  test("says so on the payment screen rather than closing it silently", async () => {
    const user = userEvent.setup();
    decline();
    renderPage();
    await fillTheForm(user);
    await pay(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(/declined/i);
  });

  // The single most important reassurance on a failed payment.
  test("says nothing was charged and the cart is untouched", async () => {
    const user = userEvent.setup();
    decline();
    renderPage();
    await fillTheForm(user);
    await pay(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(/nothing was charged/i);
  });

  test("does not empty the cart", async () => {
    const user = userEvent.setup();
    decline();
    renderPage();
    await fillTheForm(user);
    await pay(user);

    await screen.findByRole("alert");
    expect(setCart).not.toHaveBeenCalled();
  });

  test("does not navigate away from checkout", async () => {
    const user = userEvent.setup();
    decline();
    renderPage();
    await fillTheForm(user);
    await pay(user);

    await screen.findByRole("alert");
    expect(screen.queryByText("receipt for o1")).not.toBeInTheDocument();
  });

  // Closing the payment screen has to leave the reason behind, or the
  // customer is back on a form with no idea what went wrong.
  test("closing leaves the reason on the checkout page, with the form intact", async () => {
    const user = userEvent.setup();
    decline();
    renderPage();
    await fillTheForm(user);
    await pay(user);
    await screen.findByRole("alert");

    await user.click(screen.getByRole("button", { name: /back to checkout/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(await screen.findByText(/try another card/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/card number/i)).toHaveValue("4242 4242 4242 4242");
  });
});

describe("other failures a customer can hit", () => {
  test("an unreachable gateway is distinguished from a decline", async () => {
    const user = userEvent.setup();
    checkout.mockRejectedValue(new ApiError("The payment service did not respond.", 503));
    renderPage();
    await fillTheForm(user);
    await pay(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(/unreachable/i);
  });

  // Stock can go between adding to the cart and paying. The order is refused,
  // and the customer needs to know which of the two happened.
  test("a stock refusal is passed through in the server's own words", async () => {
    const user = userEvent.setup();
    checkout.mockRejectedValue(new ApiError("Obsidian X-9 Headset only has 1 left.", 422));
    renderPage();
    await fillTheForm(user);
    await pay(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(/only has 1 left/i);
  });

  test("a rejected field is marked on the field itself once the screen closes", async () => {
    const user = userEvent.setup();
    checkout.mockRejectedValue(
      new ApiError("Validation failed", 400, [
        { field: "postalCode", message: "Postal code must be four digits" },
      ])
    );
    renderPage();
    await fillTheForm(user, { postalCode: "15" });
    await pay(user);
    await screen.findByRole("alert");

    await user.click(screen.getByRole("button", { name: /back to checkout/i }));

    expect(await screen.findByText(/must be four digits/i)).toBeInTheDocument();
  });
});
