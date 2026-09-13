import { describe, expect, test, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, adminAuth, makeProduct } from "../test/renderWithProviders";

vi.mock("../api/admin.api", () => ({
  listProducts: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deactivateProduct: vi.fn(),
  reactivateProduct: vi.fn(),
  adjustStock: vi.fn(),
  getStats: vi.fn(),
  listOrders: vi.fn(),
  updateOrderStatus: vi.fn(),
  getProduct: vi.fn(),
}));
vi.mock("../api/categories.api", () => ({
  listCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
}));

import * as adminApi from "../api/admin.api";
import * as categoriesApi from "../api/categories.api";
import AdminProductsPage from "./AdminProductsPage";

// COMPONENT TESTS.
//
// The form's job is to turn what an admin types into the exact shape the API
// validates. The conversions are where that goes wrong - rands to cents, a
// name to a slug, lines of text to an array - so those are tested by asserting
// on the payload actually sent.

class ApiError extends Error {
  constructor(message, status, details = null) {
    super(message);
    this.status = status;
    this.code = "VALIDATION_ERROR";
    this.details = details;
  }
}

const ACTIVE = makeProduct({ stockQty: 12 });
const RETIRED = makeProduct({
  id: "p2", name: "Retired Mouse", slug: "retired-mouse", sku: "GV-MS-OLD",
  isActive: false, inStock: false, stockQty: 0,
});
const CATS = [{ id: "6716f0a1c2d3e4f5a6b7c8e2", name: "Audio Gear", slug: "audio-gear" }];

const renderPage = () =>
  renderWithProviders(<AdminProductsPage />, { auth: adminAuth, route: "/admin/products" });

const fill = async (user, label, value) => {
  const input = screen.getByLabelText(new RegExp(label, "i"));
  await user.clear(input);
  await user.type(input, value);
};

beforeEach(() => {
  vi.clearAllMocks();
  adminApi.listProducts.mockResolvedValue({ data: [ACTIVE, RETIRED], meta: { total: 2 } });
  adminApi.createProduct.mockResolvedValue({ id: "p9" });
  adminApi.updateProduct.mockResolvedValue({ id: "p1" });
  adminApi.adjustStock.mockResolvedValue({ id: "p1" });
  adminApi.deactivateProduct.mockResolvedValue({ id: "p1" });
  adminApi.reactivateProduct.mockResolvedValue({ id: "p2" });
  categoriesApi.listCategories.mockResolvedValue(CATS);
});

describe("the catalogue list", () => {
  test("lists products", async () => {
    renderPage();
    expect(await screen.findByText("Obsidian X-9 Headset")).toBeInTheDocument();
  });

  // An admin must see what they hid, or a soft delete is indistinguishable
  // from the product vanishing.
  test("includes deactivated products, and labels them in words", async () => {
    renderPage();
    const name = await screen.findByText("Retired Mouse");
    // The flag has to be on the hidden product's own row. A looser
    // /deactivated/i also matches the count line above the table ("2
    // products, including deactivated ones"), which would pass even if the
    // row itself were unlabelled.
    const row = name.closest("tr");
    expect(within(row).getByText("Deactivated")).toBeInTheDocument();
  });

  test("shows stock, which the public API never exposes", async () => {
    renderPage();
    expect(await screen.findByText("12")).toBeInTheDocument();
  });

  test("offers Reactivate for a hidden product and Deactivate for a live one", async () => {
    renderPage();
    await screen.findByText("Retired Mouse");
    expect(screen.getByRole("button", { name: /reactivate/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^deactivate$/i })).toBeInTheDocument();
  });
});

describe("adding a product", () => {
  test("converts rands to integer cents", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Obsidian X-9 Headset");
    await user.click(screen.getByRole("button", { name: /add product/i }));

    await fill(user, "^name", "Vault Pro Headset");
    await fill(user, "^sku", "gv-hs-vp-01");
    await fill(user, "^brand", "Vault");
    await fill(user, "^description", "A headset.");
    await fill(user, "price", "1299.50");
    await fill(user, "^stock", "25");
    await fill(user, "^images", "/product-pictures/a.jpg");
    await user.click(screen.getAllByRole("button", { name: /add product/i }).pop());

    await waitFor(() => expect(adminApi.createProduct).toHaveBeenCalled());
    expect(adminApi.createProduct.mock.calls[0][0].priceCents).toBe(129950);
  });

  test("derives the slug from the name, in the format the API demands", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Obsidian X-9 Headset");
    await user.click(screen.getByRole("button", { name: /add product/i }));

    await fill(user, "^name", "Vault Pro Headset");

    expect(screen.getByLabelText(/^slug/i)).toHaveValue("vault-pro-headset");
  });

  test("uppercases the SKU, because the API only accepts uppercase", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Obsidian X-9 Headset");
    await user.click(screen.getByRole("button", { name: /add product/i }));

    await fill(user, "^name", "Vault Pro");
    await fill(user, "^sku", "gv-hs-vp-01");
    await fill(user, "^brand", "Vault");
    await fill(user, "^description", "A headset.");
    await fill(user, "price", "10");
    await fill(user, "^stock", "1");
    await fill(user, "^images", "/a.jpg");
    await user.click(screen.getAllByRole("button", { name: /add product/i }).pop());

    await waitFor(() => expect(adminApi.createProduct).toHaveBeenCalled());
    expect(adminApi.createProduct.mock.calls[0][0].sku).toBe("GV-HS-VP-01");
  });

  test("splits images by line and drops the blanks", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Obsidian X-9 Headset");
    await user.click(screen.getByRole("button", { name: /add product/i }));

    await fill(user, "^name", "Vault Pro");
    await fill(user, "^sku", "GV-1");
    await fill(user, "^brand", "Vault");
    await fill(user, "^description", "A headset.");
    await fill(user, "price", "10");
    await fill(user, "^stock", "1");
    await user.type(screen.getByLabelText(/^images/i), "/a.jpg\n\n/b.jpg");
    await user.click(screen.getAllByRole("button", { name: /add product/i }).pop());

    await waitFor(() => expect(adminApi.createProduct).toHaveBeenCalled());
    expect(adminApi.createProduct.mock.calls[0][0].images).toEqual(["/a.jpg", "/b.jpg"]);
  });

  // A validation failure must land on the input that caused it, not in a
  // banner the admin has to map back to a field themselves.
  test("a field error from the API lands on that field", async () => {
    const user = userEvent.setup();
    adminApi.createProduct.mockRejectedValue(
      new ApiError("Validation failed", 400, [{ field: "sku", message: "SKU already exists" }])
    );
    renderPage();
    await screen.findByText("Obsidian X-9 Headset");
    await user.click(screen.getByRole("button", { name: /add product/i }));

    await fill(user, "^name", "Vault Pro");
    await fill(user, "^sku", "GV-1");
    await fill(user, "^brand", "Vault");
    await fill(user, "^description", "A headset.");
    await fill(user, "price", "10");
    await fill(user, "^stock", "1");
    await fill(user, "^images", "/a.jpg");
    await user.click(screen.getAllByRole("button", { name: /add product/i }).pop());

    expect(await screen.findByText("SKU already exists")).toBeInTheDocument();
  });

  test("with no categories, it says so and points at where to add one", async () => {
    const user = userEvent.setup();
    categoriesApi.listCategories.mockResolvedValue([]);
    renderPage();
    await screen.findByText("Obsidian X-9 Headset");
    await user.click(screen.getByRole("button", { name: /add product/i }));

    expect(screen.getByText(/no categories yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /add one first/i })).toHaveAttribute("href", "/admin/categories");
  });
});

describe("editing a product", () => {
  test("the form opens with the product's current values", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Obsidian X-9 Headset");

    await user.click(screen.getAllByRole("button", { name: /^edit$/i })[0]);

    expect(screen.getByLabelText(/^name/i)).toHaveValue("Obsidian X-9 Headset");
    // 34900 cents must come back as 349.00 rands, not 34900.
    expect(screen.getByLabelText(/price/i)).toHaveValue("349.00");
  });

  test("saving updates rather than creating", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Obsidian X-9 Headset");

    await user.click(screen.getAllByRole("button", { name: /^edit$/i })[0]);
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(adminApi.updateProduct).toHaveBeenCalledWith("p1", expect.any(Object)));
    expect(adminApi.createProduct).not.toHaveBeenCalled();
  });
});

describe("stock and availability", () => {
  test("the restock button adjusts stock by a fixed step", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Obsidian X-9 Headset");

    await user.click(screen.getAllByRole("button", { name: /\+10/ })[0]);

    await waitFor(() => expect(adminApi.adjustStock).toHaveBeenCalledWith("p1", 10));
  });

  // Hiding a product from the shop is worth a confirmation, even though it
  // can be undone.
  test("deactivating asks first", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderPage();
    await screen.findByText("Obsidian X-9 Headset");

    await user.click(screen.getByRole("button", { name: /^deactivate$/i }));

    expect(confirm).toHaveBeenCalled();
    expect(adminApi.deactivateProduct).not.toHaveBeenCalled();
  });

  test("reactivating does not need a confirmation, since it only adds back", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Retired Mouse");

    await user.click(screen.getByRole("button", { name: /reactivate/i }));

    await waitFor(() => expect(adminApi.reactivateProduct).toHaveBeenCalledWith("p2"));
  });

  test("a failed change is reported rather than silently doing nothing", async () => {
    const user = userEvent.setup();
    adminApi.adjustStock.mockRejectedValue(new ApiError("Product not found", 404));
    renderPage();
    await screen.findByText("Obsidian X-9 Headset");

    await user.click(screen.getAllByRole("button", { name: /\+10/ })[0]);

    expect(await screen.findByRole("alert")).toHaveTextContent(/product not found/i);
  });
});
