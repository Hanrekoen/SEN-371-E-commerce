import { describe, expect, test, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, customerAuth, makeOrder } from "../test/renderWithProviders";

vi.mock("../api/orders.api", () => ({
  listMyOrders: vi.fn(),
  getMyOrder: vi.fn(),
  checkout: vi.fn(),
}));

import * as ordersApi from "../api/orders.api";
import OrderHistory from "./OrderHistory";

// COMPONENT TESTS.
//
// This is where a customer checks that the money left their account for
// something real, so the numbers matter more than the layout: the line total
// is unit price times quantity (the order model never stores a line total),
// and the order total comes from the server rather than being re-added here.

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.code = "ERROR";
  }
}

const page = (orders, meta = { total: orders.length, page: 1, limit: 10, totalPages: 1 }) =>
  ({ data: orders, meta });

const renderPage = () =>
  renderWithProviders(<OrderHistory />, { auth: customerAuth, route: "/orders" });

beforeEach(() => {
  vi.clearAllMocks();
  ordersApi.listMyOrders.mockResolvedValue(page([makeOrder()]));
});

describe("loading", () => {
  test("asks for the first page at the size the page renders", async () => {
    renderPage();
    await waitFor(() =>
      expect(ordersApi.listMyOrders).toHaveBeenCalledWith({ page: 1, limit: 10 })
    );
  });

  test("a failure is reported rather than shown as an empty history", async () => {
    ordersApi.listMyOrders.mockRejectedValue(new ApiError("Service unavailable", 503));
    renderPage();
    expect(await screen.findByText(/could not load your orders/i)).toBeInTheDocument();
    expect(screen.queryByText(/no orders yet/i)).not.toBeInTheDocument();
  });

  // Someone who has never ordered and someone whose orders failed to load are
  // in very different situations, and must not see the same screen.
  test("no orders says so, and offers the way out", async () => {
    ordersApi.listMyOrders.mockResolvedValue(page([]));
    renderPage();
    expect(await screen.findByText(/no orders yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /browse the catalogue/i }))
      .toHaveAttribute("href", "/catalog");
  });

  test("a response with no envelope does not crash the page", async () => {
    ordersApi.listMyOrders.mockResolvedValue(undefined);
    renderPage();
    expect(await screen.findByText(/no orders yet/i)).toBeInTheDocument();
  });
});

describe("an order card", () => {
  // The order model stores a unit price and a quantity, never a line total, so
  // the line total here IS the server's formula rather than a second opinion.
  test("a line total is the unit price times the quantity", async () => {
    ordersApi.listMyOrders.mockResolvedValue(page([
      makeOrder({
        items: [{ productId: "p1", name: "Obsidian X-9 Headset", quantity: 3, unitPriceCents: 34900 }],
      }),
    ]));
    renderPage();
    // 3 x R349,00
    expect(await screen.findByText("R 1 047,00")).toBeInTheDocument();
  });

  test("the order total comes from the server, not from re-adding the lines", async () => {
    ordersApi.listMyOrders.mockResolvedValue(page([
      makeOrder({ totalCents: 37692 }),
    ]));
    renderPage();
    expect(await screen.findByText(/total r 376,92/i)).toBeInTheDocument();
  });

  test("every order links to its own receipt", async () => {
    renderPage();
    expect(await screen.findByRole("link", { name: /view receipt/i }))
      .toHaveAttribute("href", "/orders/o1/confirmation");
  });

  // Each card carries its own order number and status, so two orders must not
  // collapse into one another's details.
  test("each order gets its own card", async () => {
    ordersApi.listMyOrders.mockResolvedValue(page([
      makeOrder(),
      makeOrder({ id: "o2", orderNumber: "ORD-2026-000092", status: "delivered" }),
    ]));
    renderPage();
    await screen.findByText("ORD-2026-000091");
    expect(screen.getByText("ORD-2026-000092")).toBeInTheDocument();
    expect(screen.getByText("delivered")).toBeInTheDocument();
  });
});

describe("the count line", () => {
  // The count is the all-time total from meta, not the length of this page, so
  // it does not shrink when someone pages forward.
  test("the count is the all-time total, not this page's length", async () => {
    ordersApi.listMyOrders.mockResolvedValue(page([makeOrder()], { total: 14, totalPages: 2 }));
    renderPage();
    expect(await screen.findByText("14 orders all time")).toBeInTheDocument();
  });
});

describe("paging", () => {
  test("Next fetches the following page", async () => {
    const user = userEvent.setup();
    ordersApi.listMyOrders.mockResolvedValue(page([makeOrder()], { total: 14, totalPages: 2 }));
    renderPage();
    await screen.findByText("ORD-2026-000091");

    await user.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() =>
      expect(ordersApi.listMyOrders).toHaveBeenLastCalledWith({ page: 2, limit: 10 })
    );
  });

  // The pager is a navigation landmark so a screen reader user can find it
  // rather than tabbing through every order card to reach the controls.
  test("the pager is a named navigation region", async () => {
    ordersApi.listMyOrders.mockResolvedValue(page([makeOrder()], { total: 14, totalPages: 2 }));
    renderPage();
    const pager = await screen.findByRole("navigation", { name: /order history pages/i });
    expect(within(pager).getByRole("button", { name: /next/i })).toBeInTheDocument();
  });
});
