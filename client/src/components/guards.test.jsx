import { describe, expect, test } from "vitest";
import { screen } from "@testing-library/react";
import {
  renderWithProviders, anonymousAuth, customerAuth, adminAuth,
} from "../test/renderWithProviders";
import RequireAuth from "./RequireAuth";
import RequireShopper from "./RequireShopper";

// COMPONENT TESTS - the route guards.
//
// These are a courtesy, not the control. The API enforces all of this itself
// (requireAuth, requireRole and shoppersOnly), and these tests say so rather
// than implying the browser is what keeps an admin out of checkout. What is
// tested here is that the right person sees the right explanation, and one
// specific bug that is easy to reintroduce: deciding before the boot-time
// session restore has finished, which signs a real user out on every refresh.

const Protected = () => <div>the protected page</div>;

const renderGuard = (auth, ui = <RequireAuth><Protected /></RequireAuth>) =>
  renderWithProviders(ui, {
    auth,
    route: "/admin",
    path: "/admin",
    routes: [{ path: "/login", element: <div>the sign-in page</div> }],
  });

describe("RequireAuth", () => {
  // The session is restored from a refresh cookie on boot. Deciding during
  // that window sends a signed-in user to the login page every time they hit
  // refresh, which reads as being randomly signed out.
  test("waits for the session restore instead of deciding early", () => {
    renderGuard({ ...anonymousAuth, isLoading: true });
    expect(screen.getByRole("status")).toHaveTextContent(/checking your session/i);
    expect(screen.queryByText("the sign-in page")).not.toBeInTheDocument();
  });

  test("sends a signed-out visitor to sign in", () => {
    renderGuard(anonymousAuth);
    expect(screen.getByText("the sign-in page")).toBeInTheDocument();
  });

  test("lets a signed-in customer through", () => {
    renderGuard(customerAuth);
    expect(screen.getByText("the protected page")).toBeInTheDocument();
  });

  test("a customer at an admin route is told why, not bounced to sign in", () => {
    renderGuard(customerAuth, <RequireAuth role="admin"><Protected /></RequireAuth>);
    expect(screen.getByRole("heading", { name: /not your vault/i })).toBeInTheDocument();
    expect(screen.queryByText("the protected page")).not.toBeInTheDocument();
    expect(screen.queryByText("the sign-in page")).not.toBeInTheDocument();
  });

  test("an admin reaches an admin route", () => {
    renderGuard(adminAuth, <RequireAuth role="admin"><Protected /></RequireAuth>);
    expect(screen.getByText("the protected page")).toBeInTheDocument();
  });
});

describe("RequireShopper", () => {
  const shopper = (auth) =>
    renderGuard(auth, <RequireShopper><Protected /></RequireShopper>);

  test("a customer can reach the cart and checkout", () => {
    shopper(customerAuth);
    expect(screen.getByText("the protected page")).toBeInTheDocument();
  });

  // The API refuses an admin's cart writes and checkout outright, so without
  // this an admin typing the URL reaches a page whose every button answers
  // 403. Explaining it up front beats discovering it at the pay button.
  test("an admin is told this account does not shop, before the buttons fail", () => {
    shopper(adminAuth);
    expect(screen.getByRole("heading", { name: /admins do not shop here/i })).toBeInTheDocument();
    expect(screen.queryByText("the protected page")).not.toBeInTheDocument();
  });

  test("the admin is pointed at the two things they can actually do", () => {
    shopper(adminAuth);
    expect(screen.getByRole("link", { name: /go to the dashboard/i })).toHaveAttribute("href", "/admin");
    expect(screen.getByRole("link", { name: /browse the catalogue/i })).toHaveAttribute("href", "/catalog");
  });

  test("a signed-out visitor still goes to sign in first", () => {
    shopper(anonymousAuth);
    expect(screen.getByText("the sign-in page")).toBeInTheDocument();
  });
});
