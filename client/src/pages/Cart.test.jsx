import { describe, expect, test, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  renderWithProviders, customerAuth, cartWith, cartLine, emptyCart,
} from "../test/renderWithProviders";
import Cart from "./Cart";

// COMPONENT TESTS.
//
// The cart is where money first becomes visible, so the figures shown must be
// the server's and never the client's arithmetic. It is also where a refused
// change is easiest to swallow silently, which is the failure these tests are
// mostly aimed at.

class ApiError extends Error {
  constructor(message, status, code = "ERROR") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const twoLines = cartWith([
  cartLine(),
  cartLine({ productId: "p2", name: "NovaKey MX60", finish: null, unitPriceCents: 18900, quantity: 2, lineTotalCents: 37800 }),
]);

const renderCart = (cart = twoLines, cartApi = {}) =>
  renderWithProviders(<Cart />, { auth: customerAuth, cart, cartApi, route: "/cart" });

describe("an empty cart", () => {
  test("says so and offers a way out rather than showing a blank page", () => {
    renderCart(emptyCart);
    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /browse the catalogue/i })).toBeInTheDocument();
  });
});

describe("what the cart shows", () => {
  // The client must never recompute money. These are the server's figures.
  test("the server's line total, not a figure worked out here", () => {
    renderCart();
    expect(screen.getByText(/R\s?378[,.]00/)).toBeInTheDocument();
  });

  test("the server's grand total", () => {
    renderCart();
    // 34900 + 37800 = 72700 subtotal, plus 8% tax = 78516
    expect(screen.getByText(/R\s?785[,.]16/)).toBeInTheDocument();
  });

  // Checkout would refuse this line anyway; saying so here saves the customer
  // a failed payment attempt.
  test("an out-of-stock line is flagged before checkout refuses it", () => {
    renderCart(cartWith([cartLine({ inStock: false })]));
    expect(screen.getByText(/out of stock/i)).toBeInTheDocument();
  });
});

describe("changing a quantity", () => {
  // fireEvent.change rather than type(): the input is controlled by the cart
  // that came from the server, so its value does not follow keystrokes until
  // the server answers. This models "the field's value became 3", which is
  // what the component actually reacts to.
  test("sends the new quantity to the API", async () => {
    const updateQuantity = vi.fn().mockResolvedValue({});
    renderCart(twoLines, { updateQuantity });

    fireEvent.change(screen.getAllByRole("spinbutton")[0], { target: { value: "3" } });

    await waitFor(() => expect(updateQuantity).toHaveBeenCalledWith("p1", 3));
  });

  // Clearing the field parses as 0, which the API refuses. Sending it would
  // produce an error the customer did not cause.
  test.each([
    ["an empty field", ""],
    ["a zero", "0"],
    ["a negative number", "-2"],
  ])("%s is not sent, because the API refuses it", async (_label, value) => {
    const updateQuantity = vi.fn().mockResolvedValue({});
    renderCart(twoLines, { updateQuantity });

    fireEvent.change(screen.getAllByRole("spinbutton")[0], { target: { value } });

    expect(updateQuantity).not.toHaveBeenCalled();
  });

  // Without this the promise rejects into nothing and the row simply fails to
  // change, with no explanation at all.
  test("a refusal from the server is shown, not swallowed", async () => {
    const updateQuantity = vi.fn().mockRejectedValue(new ApiError("Only 2 left in stock", 422));
    renderCart(twoLines, { updateQuantity });

    fireEvent.change(screen.getAllByRole("spinbutton")[0], { target: { value: "9" } });

    expect(await screen.findByRole("alert")).toHaveTextContent(/only 2 left in stock/i);
  });
});

describe("removing a line", () => {
  test("removes the right product", async () => {
    const user = userEvent.setup();
    const removeItem = vi.fn().mockResolvedValue({});
    renderCart(twoLines, { removeItem });

    await user.click(screen.getAllByRole("button", { name: /remove/i })[1]);

    expect(removeItem).toHaveBeenCalledWith("p2");
  });
});
