import { describe, expect, test, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, anonymousAuth } from "../test/renderWithProviders";
import LoginPage from "./LoginPage";

// COMPONENT TESTS.
//
// One page is both the sign-in and the register form, which is where the risk
// is: the wrong mode sends the wrong call, or leaves a stale error from the
// other form on screen. The 401 case is pinned too - the API deliberately
// refuses to say which half of the pair was wrong, and the form must not
// invent a field-level answer the server did not give.

class ApiError extends Error {
  constructor(message, status, details = null) {
    super(message);
    this.status = status;
    this.code = status === 401 ? "INVALID_CREDENTIALS" : "VALIDATION_ERROR";
    this.details = details;
  }
}

let login;
let register;

const renderPage = (route = "/login", state) =>
  renderWithProviders(<LoginPage />, {
    auth: { ...anonymousAuth, login, register },
    route: state ? { pathname: route, state } : route,
    path: "/login",
  });

const fill = async (user, label, value) => {
  const input = screen.getByLabelText(new RegExp(label, "i"));
  await user.clear(input);
  await user.type(input, value);
};

beforeEach(() => {
  login = vi.fn().mockResolvedValue({});
  register = vi.fn().mockResolvedValue({});
});

describe("signing in", () => {
  test("opens on the sign-in form, not the register one", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/first name/i)).not.toBeInTheDocument();
  });

  test("sends exactly the email and password typed", async () => {
    const user = userEvent.setup();
    renderPage();

    await fill(user, "email", "hanre@sen371.test");
    await fill(user, "^password$", "Correct-Horse-9");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() =>
      expect(login).toHaveBeenCalledWith({
        email: "hanre@sen371.test",
        password: "Correct-Horse-9",
      })
    );
  });

  test("leaves the page once the sign-in succeeds", async () => {
    const user = userEvent.setup();
    renderPage();

    await fill(user, "email", "hanre@sen371.test");
    await fill(user, "^password$", "Correct-Horse-9");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(await screen.findByTestId("navigated-away")).toBeInTheDocument();
  });

  // A guard sends people here with where they were headed. Dropping that and
  // dumping them on the home page is the small betrayal that makes a sign-in
  // wall feel broken.
  test("returns to the page a guard interrupted", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />, {
      auth: { ...anonymousAuth, login, register },
      route: { pathname: "/login", state: { from: "/checkout" } },
      path: "/login",
      routes: [{ path: "/checkout", element: <div>checkout reached</div> }],
    });

    await fill(user, "email", "hanre@sen371.test");
    await fill(user, "^password$", "Correct-Horse-9");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(await screen.findByText("checkout reached")).toBeInTheDocument();
  });

  // A 401 carries no field details on purpose - saying "no such email" tells
  // an attacker which addresses are registered.
  test("a rejected sign-in is shown as one message, not blamed on a field", async () => {
    const user = userEvent.setup();
    login.mockRejectedValue(new ApiError("Email or password is incorrect", 401));
    renderPage();

    await fill(user, "email", "hanre@sen371.test");
    await fill(user, "^password$", "wrong");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(await screen.findByText(/email or password is incorrect/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).not.toHaveAttribute("aria-invalid", "true");
  });

  test("a failed sign-in keeps them on the form", async () => {
    const user = userEvent.setup();
    login.mockRejectedValue(new ApiError("Email or password is incorrect", 401));
    renderPage();

    await fill(user, "email", "hanre@sen371.test");
    await fill(user, "^password$", "wrong");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    await screen.findByText(/email or password is incorrect/i);
    expect(screen.queryByTestId("navigated-away")).not.toBeInTheDocument();
  });
});

describe("registering", () => {
  test("switching to register asks for a name as well", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("tab", { name: /register/i }));

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
  });

  test("register sends the name fields, and does not call login", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("tab", { name: /register/i }));

    await fill(user, "first name", "Hanre");
    await fill(user, "last name", "Koen");
    await fill(user, "email", "hanre@sen371.test");
    await fill(user, "^password$", "Correct-Horse-9");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() =>
      expect(register).toHaveBeenCalledWith({
        firstName: "Hanre",
        lastName: "Koen",
        email: "hanre@sen371.test",
        password: "Correct-Horse-9",
      })
    );
    expect(login).not.toHaveBeenCalled();
  });

  // The password rule lives on the server. Stating it up front is cheaper than
  // a round trip that comes back saying the same thing.
  test("the password rule is stated before it is broken", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("tab", { name: /register/i }));

    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
  });

  test("a validation failure lands on the field the API named", async () => {
    const user = userEvent.setup();
    register.mockRejectedValue(
      new ApiError("Validation failed", 400, [
        { field: "email", message: "That email is already registered" },
      ])
    );
    renderPage();
    await user.click(screen.getByRole("tab", { name: /register/i }));

    await fill(user, "first name", "Hanre");
    await fill(user, "last name", "Koen");
    await fill(user, "email", "taken@sen371.test");
    await fill(user, "^password$", "Correct-Horse-9");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/already registered/i)).toBeInTheDocument();
  });

  // Switching tabs with an error on screen used to leave the sign-in failure
  // sitting above the register form, where it read as a register failure.
  test("switching tabs clears the other form's error", async () => {
    const user = userEvent.setup();
    login.mockRejectedValue(new ApiError("Email or password is incorrect", 401));
    renderPage();

    await fill(user, "email", "hanre@sen371.test");
    await fill(user, "^password$", "wrong");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));
    await screen.findByText(/email or password is incorrect/i);

    await user.click(screen.getByRole("tab", { name: /register/i }));

    expect(screen.queryByText(/email or password is incorrect/i)).not.toBeInTheDocument();
  });
});

describe("the password field", () => {
  test("is masked until asked otherwise", () => {
    renderPage();
    expect(screen.getByLabelText(/^password$/i)).toHaveAttribute("type", "password");
  });

  test("can be revealed, and the control says which way it will go", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /show password/i }));

    expect(screen.getByLabelText(/^password$/i)).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: /hide password/i })).toBeInTheDocument();
  });

  test("typing clears the error already sitting on the field", async () => {
    const user = userEvent.setup();
    login.mockRejectedValue(
      new ApiError("Validation failed", 400, [{ field: "password", message: "Password is required" }])
    );
    renderPage();

    await fill(user, "email", "hanre@sen371.test");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));
    await screen.findByText(/password is required/i);

    await user.type(screen.getByLabelText(/^password$/i), "x");

    expect(screen.queryByText(/password is required/i)).not.toBeInTheDocument();
  });
});
