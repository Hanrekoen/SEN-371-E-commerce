import { describe, expect, test, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, adminAuth } from "../test/renderWithProviders";

// ---------------------------------------------------------------------------
// TEST-DRIVEN DEVELOPMENT — written BEFORE AdminCategoriesPage existed.
//
// The gap: the API has had full category CRUD since Milestone 3, but nothing
// in the app calls the write half. An admin with an empty database therefore
// cannot add a product at all, because the product form's category picker is
// required and has nothing in it.
//
// These tests describe the behaviour wanted, from the outside, in the terms a
// person using the page would use. They were run first and failed (see
// docs/TDD_LOG.md for the red output), and only then was the page written.
// ---------------------------------------------------------------------------

vi.mock("../api/categories.api", () => ({
  listCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
}));

import * as categoriesApi from "../api/categories.api";
import AdminCategoriesPage from "./AdminCategoriesPage";

class ApiError extends Error {
  constructor(message, { status = 400, code = "ERROR", details = null } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const AUDIO = { id: "c1", name: "Audio Gear", slug: "audio-gear", description: "Headphones and DACs" };
const KEYS = { id: "c2", name: "Modular Keyboards", slug: "modular-keyboards", description: null };

const renderPage = () =>
  renderWithProviders(<AdminCategoriesPage />, { auth: adminAuth, route: "/admin/categories" });

beforeEach(() => {
  vi.clearAllMocks();
  categoriesApi.listCategories.mockResolvedValue([AUDIO, KEYS]);
  categoriesApi.createCategory.mockResolvedValue({ id: "c3", name: "Cameras", slug: "cameras" });
  categoriesApi.deleteCategory.mockResolvedValue(undefined);
});

describe("listing categories", () => {
  test("shows every category the API returns", async () => {
    renderPage();
    expect(await screen.findByText("Audio Gear")).toBeInTheDocument();
    expect(screen.getByText("Modular Keyboards")).toBeInTheDocument();
  });

  test("shows the slug, because that is what appears in product URLs", async () => {
    renderPage();
    expect(await screen.findByText("audio-gear")).toBeInTheDocument();
  });

  // The whole reason this page exists: with no categories, no product can be
  // added. The empty state has to say that rather than just look bare.
  test("an empty list explains why it matters", async () => {
    categoriesApi.listCategories.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText(/no categories yet/i)).toBeInTheDocument();
    expect(screen.getByText(/cannot be added until/i)).toBeInTheDocument();
  });

  test("a failure to load is reported, not silently empty", async () => {
    categoriesApi.listCategories.mockRejectedValue(new ApiError("Service unavailable", { status: 503 }));
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not load/i);
  });
});

describe("creating a category", () => {
  test("sends the typed name to the API", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Audio Gear");

    await user.type(screen.getByLabelText(/name/i), "Cameras");
    await user.click(screen.getByRole("button", { name: /add category/i }));

    await waitFor(() => expect(categoriesApi.createCategory).toHaveBeenCalledTimes(1));
    expect(categoriesApi.createCategory).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Cameras" })
    );
  });

  test("refreshes the list afterwards, so the new category is visible", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Audio Gear");

    await user.type(screen.getByLabelText(/name/i), "Cameras");
    await user.click(screen.getByRole("button", { name: /add category/i }));

    await waitFor(() => expect(categoriesApi.listCategories).toHaveBeenCalledTimes(2));
  });

  test("an empty name does not reach the API", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Audio Gear");

    await user.click(screen.getByRole("button", { name: /add category/i }));

    expect(categoriesApi.createCategory).not.toHaveBeenCalled();
  });

  // The service raises 409 on a duplicate name or slug. That message names the
  // clash, so it is worth far more to the admin than "something went wrong".
  test("a duplicate name shows the message the server sent", async () => {
    const user = userEvent.setup();
    categoriesApi.createCategory.mockRejectedValue(
      new ApiError('Category with name "Audio Gear" already exists', { status: 409, code: "CONFLICT" })
    );
    renderPage();
    await screen.findByText("Audio Gear");

    await user.type(screen.getByLabelText(/name/i), "Audio Gear");
    await user.click(screen.getByRole("button", { name: /add category/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/already exists/i);
  });

  test("the field is cleared after a success but kept after a failure", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Audio Gear");
    const input = screen.getByLabelText(/name/i);

    await user.type(input, "Cameras");
    await user.click(screen.getByRole("button", { name: /add category/i }));
    await waitFor(() => expect(input).toHaveValue(""));

    categoriesApi.createCategory.mockRejectedValue(new ApiError("Nope", { status: 409 }));
    await user.type(input, "Audio Gear");
    await user.click(screen.getByRole("button", { name: /add category/i }));
    // Retyping a name the admin already typed is a small insult after a failure.
    await waitFor(() => expect(input).toHaveValue("Audio Gear"));
  });
});

describe("deleting a category", () => {
  test("asks before deleting", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderPage();
    await screen.findByText("Audio Gear");

    await user.click(screen.getAllByRole("button", { name: /delete/i })[0]);

    expect(confirm).toHaveBeenCalled();
    expect(categoriesApi.deleteCategory).not.toHaveBeenCalled();
  });

  test("deletes the chosen category once confirmed", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderPage();
    await screen.findByText("Audio Gear");

    await user.click(screen.getAllByRole("button", { name: /delete/i })[0]);

    await waitFor(() => expect(categoriesApi.deleteCategory).toHaveBeenCalledWith("c1"));
  });

  // category.service refuses to delete a category that still has products, and
  // says how many. That number is the useful part - it must reach the screen.
  test("a category still in use surfaces the server's refusal", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    categoriesApi.deleteCategory.mockRejectedValue(
      new ApiError('Cannot delete "Audio Gear" - 4 products still associated with this category',
        { status: 422, code: "RULE_VIOLATION" })
    );
    renderPage();
    await screen.findByText("Audio Gear");

    await user.click(screen.getAllByRole("button", { name: /delete/i })[0]);

    expect(await screen.findByRole("alert")).toHaveTextContent(/4 products still associated/i);
  });
});
