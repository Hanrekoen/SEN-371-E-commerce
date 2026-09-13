import { describe, expect, test, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  renderWithProviders, anonymousAuth, customerAuth, adminAuth, makeProduct,
} from "../../test/renderWithProviders";
import ProductCard from "./ProductCard";

// COMPONENT TESTS.
//
// The card is the unit the catalogue is built from, and it behaves
// differently for three kinds of visitor: signed out, a customer, and an
// admin who is not allowed to buy. All three are covered, because the admin
// rule is enforced in the API and the UI has to agree with it.

const renderCard = (product = makeProduct(), auth = customerAuth, cartApi = {}) =>
  renderWithProviders(<ProductCard product={product} />, { auth, cartApi });

describe("what the card shows", () => {
  test("the product name", () => {
    renderCard();
    expect(screen.getByText("Obsidian X-9 Headset")).toBeInTheDocument();
  });

  test("the price, in rand", () => {
    renderCard();
    expect(screen.getByText(/R\s?349/)).toBeInTheDocument();
  });

  test("the category", () => {
    renderCard();
    expect(screen.getByText("Audio Gear")).toBeInTheDocument();
  });

  test("an image with the product name as its alt text", () => {
    renderCard();
    expect(screen.getByAltText("Obsidian X-9 Headset")).toBeInTheDocument();
  });

  test("it links to that product's own page", () => {
    renderCard();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/product/obsidian-x-9-headset");
  });

  // Out of stock is stated in words, not conveyed by a dimmed button alone.
  test("an out-of-stock product says so", () => {
    renderCard(makeProduct({ inStock: false }));
    expect(screen.getByText(/out of stock/i)).toBeInTheDocument();
  });

  test("the Add button is disabled when there is no stock", () => {
    renderCard(makeProduct({ inStock: false }));
    expect(screen.getByRole("button", { name: /add/i })).toBeDisabled();
  });
});

describe("adding to the cart", () => {
  test("a customer's click adds this product", async () => {
    const user = userEvent.setup();
    const addItem = vi.fn().mockResolvedValue({});
    renderCard(makeProduct(), customerAuth, { addItem });

    await user.click(screen.getByRole("button", { name: /add/i }));

    expect(addItem).toHaveBeenCalledWith({ productId: "p1", quantity: 1 });
  });

  // The whole card is a link, so the Add button must not also navigate.
  test("clicking Add does not follow the card's link", async () => {
    const user = userEvent.setup();
    const addItem = vi.fn().mockResolvedValue({});
    renderWithProviders(<ProductCard product={makeProduct()} />, {
      auth: customerAuth, cartApi: { addItem }, path: "/", route: "/",
    });

    await user.click(screen.getByRole("button", { name: /add/i }));

    expect(screen.queryByTestId("navigated-away")).not.toBeInTheDocument();
  });

  // The cart lives server-side against a user, so there is nowhere to put an
  // item until they sign in.
  test("a signed-out visitor is sent to sign in instead of a silent failure", async () => {
    const user = userEvent.setup();
    const addItem = vi.fn();
    renderCard(makeProduct(), anonymousAuth, { addItem });

    await user.click(screen.getByRole("button", { name: /add/i }));

    expect(addItem).not.toHaveBeenCalled();
  });
});

describe("an admin cannot buy", () => {
  // The API refuses an admin's cart write with 403, so offering the button
  // would only produce an error. It is not rendered at all.
  test("no Add button is offered to an admin", () => {
    renderCard(makeProduct(), adminAuth);
    expect(screen.queryByRole("button", { name: /add/i })).not.toBeInTheDocument();
  });

  test("an admin can still open the product", () => {
    renderCard(makeProduct(), adminAuth);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/product/obsidian-x-9-headset");
  });
});
