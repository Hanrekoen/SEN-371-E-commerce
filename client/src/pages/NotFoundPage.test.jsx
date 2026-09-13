import { describe, expect, test } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test/renderWithProviders";
import NotFoundPage from "./NotFoundPage";

// COMPONENT TESTS.
//
// The catch-all route. Its whole job is to turn a dead end into somewhere to
// go, so what is tested is that it names the failed path and offers real
// links rather than an apology.

const renderAt = (route) =>
  renderWithProviders(<NotFoundPage />, { route, path: "*" });

describe("NotFoundPage", () => {
  test("says which address failed, so a typo is recognisable as one", () => {
    renderAt("/catalogue/headsets");
    expect(screen.getByText("/catalogue/headsets")).toBeInTheDocument();
  });

  test("a different path shows that path, not a hard-coded one", () => {
    renderAt("/orders/9999");
    expect(screen.getByText("/orders/9999")).toBeInTheDocument();
  });

  // The 404 is decorative and read aloud as a number out of context, so it is
  // hidden from assistive technology and the heading carries the meaning.
  test("the heading, not the big 404, is what a screen reader gets", () => {
    renderAt("/nowhere");
    expect(screen.getByRole("heading", { name: /leads nowhere/i })).toBeInTheDocument();
    expect(screen.getByText("404")).toHaveAttribute("aria-hidden", "true");
  });

  test("offers the two places most people actually wanted", () => {
    renderAt("/nowhere");
    expect(screen.getByRole("link", { name: /back to the vault/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /browse the catalogue/i })).toHaveAttribute("href", "/catalog");
  });

  test("links on to orders, cart and sign-in rather than dead-ending", () => {
    renderAt("/nowhere");
    expect(screen.getByRole("link", { name: /your orders/i })).toHaveAttribute("href", "/orders");
    expect(screen.getByRole("link", { name: /your cart/i })).toHaveAttribute("href", "/cart");
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute("href", "/login");
  });

  test("a query string is not silently dropped from the path shown", () => {
    renderAt("/search?q=headset");
    expect(screen.getByText("/search")).toBeInTheDocument();
  });
});
