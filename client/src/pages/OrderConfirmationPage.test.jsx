import { describe, expect, test, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders, customerAuth, makeOrder } from "../test/renderWithProviders";

vi.mock("../api/orders.api", () => ({
  getMyOrder: vi.fn(),
  listMyOrders: vi.fn(),
  checkout: vi.fn(),
}));

import { getMyOrder } from "../api/orders.api";
import OrderConfirmationPage from "./OrderConfirmationPage";

// COMPONENT TESTS.
//
// This is the receipt, so it is fetched by id rather than read out of
// navigation state: a refresh, a bookmark or a link pasted to someone else
// all have to behave the same way. Checkout still hands the order over in
// state so the page can paint immediately, and the rule that follows from
// that is the one worth pinning - the fetched copy wins, because it is the
// one the server stands behind, but a failed refetch must never replace a
// receipt the customer is already looking at with an error.

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.code = "ERROR";
  }
}

const renderPage = ({ handedOver, orderId = "o1" } = {}) =>
  renderWithProviders(<OrderConfirmationPage />, {
    auth: customerAuth,
    route: handedOver
      ? { pathname: `/orders/${orderId}/confirmation`, state: { order: handedOver } }
      : `/orders/${orderId}/confirmation`,
    path: "/orders/:orderId/confirmation",
  });

beforeEach(() => {
  vi.clearAllMocks();
  getMyOrder.mockResolvedValue(makeOrder());
});

describe("getting the order", () => {
  test("fetches by the id in the URL, so a refresh still works", async () => {
    renderPage({ orderId: "o7" });
    await waitFor(() => expect(getMyOrder).toHaveBeenCalledWith("o7"));
  });

  // Checkout hands the order over so the receipt is on screen the instant the
  // payment clears, instead of a spinner after a payment that already worked.
  test("paints immediately when checkout handed the order over", () => {
    getMyOrder.mockReturnValue(new Promise(() => {}));
    renderPage({ handedOver: makeOrder() });
    expect(screen.getByRole("heading", { name: /vault dispatch authorized/i })).toBeInTheDocument();
  });

  // The server's copy is the authority - the hand-over copy is only a paint.
  test("the fetched copy replaces the handed-over one", async () => {
    getMyOrder.mockResolvedValue(makeOrder({ status: "shipped" }));
    renderPage({ handedOver: makeOrder({ status: "paid" }) });
    expect(await screen.findByText("SHIPPED")).toBeInTheDocument();
  });

  // Their money moved and their order exists. Replacing a valid receipt with
  // an error because a refetch failed would be alarming and wrong.
  test("a failed refetch does not replace a receipt already on screen", async () => {
    getMyOrder.mockRejectedValue(new ApiError("Service unavailable", 503));
    renderPage({ handedOver: makeOrder() });
    await waitFor(() => expect(getMyOrder).toHaveBeenCalled());
    expect(screen.getByRole("heading", { name: /vault dispatch authorized/i })).toBeInTheDocument();
  });
});

describe("when the order cannot be shown", () => {
  test("someone else's order says so plainly, without leaking its contents", async () => {
    getMyOrder.mockRejectedValue(new ApiError("Forbidden", 403));
    renderPage();
    expect(await screen.findByText(/belongs to a different account/i)).toBeInTheDocument();
  });

  test("an unknown id is reported as no such order", async () => {
    getMyOrder.mockRejectedValue(new ApiError("Not found", 404));
    renderPage();
    expect(await screen.findByText(/no record of an order/i)).toBeInTheDocument();
  });

  // Neither 403 nor 404, so the server's own words are shown rather than one
  // of the two specific explanations - telling someone their order does not
  // exist when the API is simply down is the failure being avoided here.
  test("a server failure is reported in the server's words, not as a missing order", async () => {
    getMyOrder.mockRejectedValue(new ApiError("Service unavailable", 503));
    renderPage();
    expect(await screen.findByText("Service unavailable")).toBeInTheDocument();
    expect(screen.queryByText(/no record of an order/i)).not.toBeInTheDocument();
  });

  // A dead end here is frightening after a payment, so the way to the order
  // history has to be on the error screen itself.
  test("offers the order history as the way out", async () => {
    getMyOrder.mockRejectedValue(new ApiError("Not found", 404));
    renderPage();
    expect(await screen.findByRole("link", { name: /view your orders/i }))
      .toHaveAttribute("href", "/orders");
  });
});

describe("the receipt itself", () => {
  // The order model stores a unit price and a quantity, never a line total, so
  // the line shown here IS the server's formula, and the items it lists are the
  // ones the server returned.
  test("a line is the unit price times the quantity", async () => {
    getMyOrder.mockResolvedValue(makeOrder({
      items: [{ productId: "p1", name: "Obsidian X-9 Headset", quantity: 3, unitPriceCents: 34900 }],
    }));
    renderPage();
    expect(await screen.findByText("Obsidian X-9 Headset")).toBeInTheDocument();
    expect(await screen.findByText("R 1 047,00")).toBeInTheDocument();
  });

  test("totals come from the order, and the grand total is the server's", async () => {
    renderPage();
    expect(await screen.findByText("R 376,92")).toBeInTheDocument();
    expect(screen.getByText("R 27,92")).toBeInTheDocument();
  });
});
