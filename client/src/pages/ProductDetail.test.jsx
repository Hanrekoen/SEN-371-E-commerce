import { describe, expect, test, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  renderWithProviders, customerAuth, adminAuth, makeProduct,
} from "../test/renderWithProviders";

vi.mock("../api/products.api", () => ({
  getProduct: vi.fn(),
  listProducts: vi.fn(),
  listBrands: vi.fn(),
  qs: () => "",
}));

import * as productsApi from "../api/products.api";
import ProductDetail from "./ProductDetail";

// COMPONENT TESTS.
//
// Two things here have bitten before and are pinned hard: availability must
// come from `inStock` (the public DTO never exposes stockQty, so reading it
// showed every product as out of stock), and an admin must not be offered a
// buy button the API would refuse.

class ApiError extends Error {
  constructor(message, status, code = "ERROR") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const renderPage = (auth = customerAuth, cartApi = {}) =>
  renderWithProviders(<ProductDetail />, {
    auth, cartApi, route: "/product/obsidian-x-9-headset", path: "/product/:slug",
  });

beforeEach(() => {
  vi.clearAllMocks();
  productsApi.getProduct.mockResolvedValue(makeProduct());
});

describe("loading", () => {
  test("fetches by the slug in the URL", async () => {
    renderPage();
    await waitFor(() => expect(productsApi.getProduct).toHaveBeenCalledWith("obsidian-x-9-headset"));
  });

  test("a missing product says so rather than showing an empty page", async () => {
    productsApi.getProduct.mockRejectedValue(new ApiError("Product not found", 404));
    renderPage();
    expect(await screen.findByText(/product not found/i)).toBeInTheDocument();
  });

  test("a server failure is reported separately from a missing product", async () => {
    productsApi.getProduct.mockRejectedValue(new ApiError("Service unavailable", 503));
    renderPage();
    expect(await screen.findByText(/could not load this product/i)).toBeInTheDocument();
  });
});

describe("availability", () => {
  // The public DTO exposes inStock as a boolean and never stockQty. Reading
  // stockQty here would make every product look out of stock to a customer.
  test("an in-stock product says so", async () => {
    renderPage();
    expect(await screen.findByText("In stock")).toBeInTheDocument();
  });

  // "Out of stock" deliberately appears twice - once as the availability line
  // and once on the disabled button - so each is asserted by its own role.
  test("an out-of-stock product says so and cannot be bought", async () => {
    productsApi.getProduct.mockResolvedValue(makeProduct({ inStock: false }));
    renderPage();
    const button = await screen.findByRole("button", { name: /out of stock/i });
    expect(button).toBeDisabled();
    expect(screen.getByRole("heading", { name: "Obsidian X-9 Headset" })).toBeInTheDocument();
  });

  test("a product with no stockQty field is still treated as available", async () => {
    const { stockQty, ...noQty } = { ...makeProduct(), stockQty: undefined };
    productsApi.getProduct.mockResolvedValue(noQty);
    renderPage();
    expect(await screen.findByText("In stock")).toBeInTheDocument();
  });
});

describe("adding to the cart", () => {
  test("adds the chosen quantity", async () => {
    const user = userEvent.setup();
    const addItem = vi.fn().mockResolvedValue({});
    renderPage(customerAuth, { addItem });
    await screen.findByRole("heading", { name: "Obsidian X-9 Headset" });

    await user.click(screen.getByRole("button", { name: /add to cart/i }));

    await waitFor(() => expect(addItem).toHaveBeenCalledWith({ productId: "p1", quantity: 1 }));
  });

  // Stock can run out between the page loading and the click, so the server's
  // refusal has to reach the screen rather than be swallowed.
  test("a refusal from the server is shown", async () => {
    const user = userEvent.setup();
    const addItem = vi.fn().mockRejectedValue(new ApiError("Not enough stock", 422));
    renderPage(customerAuth, { addItem });
    await screen.findByRole("heading", { name: "Obsidian X-9 Headset" });

    await user.click(screen.getByRole("button", { name: /add to cart/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/not enough stock/i);
  });
});

describe("an admin sees management, not shopping", () => {
  test("no buy controls are offered", async () => {
    renderPage(adminAuth);
    await screen.findByRole("heading", { name: "Obsidian X-9 Headset" });
    expect(screen.queryByRole("button", { name: /add to cart/i })).not.toBeInTheDocument();
  });

  test("the reason is explained rather than the button just missing", async () => {
    renderPage(adminAuth);
    expect(await screen.findByText(/cannot be bought from here/i)).toBeInTheDocument();
  });

  test("a link to the catalogue manager is offered instead", async () => {
    renderPage(adminAuth);
    expect(await screen.findByRole("link", { name: /manage the catalogue/i }))
      .toHaveAttribute("href", "/admin/products");
  });
});
