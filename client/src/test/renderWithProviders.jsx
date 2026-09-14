import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { CartContext } from "../context/CartContext";

/**
 * Almost every component in this app reads the router, the signed-in user or
 * the cart. Rendering one bare throws, so this wraps it the way the real app
 * does - but with the contexts supplied directly, so a test can say "this is
 * an admin with two things in their cart" in one line instead of mocking the
 * network and waiting for it to settle.
 */

export const anonymousAuth = {
  status: "anonymous",
  isLoading: false,
  isAuthenticated: false,
  isAdmin: false,
  user: null,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
};

export const customerAuth = {
  ...anonymousAuth,
  status: "authenticated",
  isAuthenticated: true,
  user: { id: "u1", firstName: "Hanre", lastName: "Koen", email: "hanre@sen371.test", role: "customer" },
};

export const adminAuth = {
  ...customerAuth,
  isAdmin: true,
  user: { ...customerAuth.user, role: "admin" },
};

export const emptyCart = {
  items: [], itemCount: 0, subtotalCents: 0, shippingCents: 0, taxCents: 0, totalCents: 0,
};

export function cartWith(items) {
  const subtotalCents = items.reduce((sum, i) => sum + i.lineTotalCents, 0);
  const taxCents = Math.round(subtotalCents * 0.08);
  return {
    items,
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    subtotalCents,
    shippingCents: 0,
    taxCents,
    totalCents: subtotalCents + taxCents,
  };
}

export function cartLine(over = {}) {
  return {
    productId: "p1",
    name: "Obsidian X-9 Headset",
    finish: "Carbon Black",
    unitPriceCents: 34900,
    quantity: 1,
    lineTotalCents: 34900,
    inStock: true,
    ...over,
  };
}

export function makeProduct(over = {}) {
  return {
    id: "p1",
    name: "Obsidian X-9 Headset",
    slug: "obsidian-x-9-headset",
    sku: "GV-HS-OB9-01",
    brand: "Obsidian",
    description: "Active noise cancelling over-ear headset.",
    priceCents: 34900,
    images: ["/product-pictures/Obsidian%20x9%20black.jpg"],
    specs: [],
    variants: [],
    ratingAverage: 4.8,
    ratingCount: 92,
    inStock: true,
    isActive: true,
    category: { id: "c1", name: "Audio Gear", slug: "audio-gear" },
    ...over,
  };
}

export function makeOrder(over = {}) {
  return {
    id: "o1",
    orderNumber: "ORD-2026-000091",
    status: "paid",
    paymentReference: "PAY-MJ2K91-A7F3",
    items: [{ productId: "p1", name: "Obsidian X-9 Headset", finish: null, quantity: 1, unitPriceCents: 34900 }],
    subtotalCents: 34900,
    shippingCents: 0,
    taxCents: 2792,
    totalCents: 37692,
    shippingAddress: {
      line1: "440 Silicon Pass", city: "Centurion", province: "Gauteng",
      postalCode: "0157", country: "South Africa",
    },
    createdAt: "2026-09-13T10:00:00.000Z",
    ...over,
  };
}

/**
 * @param ui              the element under test
 * @param options.auth    one of anonymousAuth / customerAuth / adminAuth
 * @param options.cart    a cart object, or one built with cartWith()
 * @param options.route   the URL to start at - a string, or a location object
 *                        like { pathname, state }, for a component that reads
 *                        location.state (a guard's "where they came from")
 * @param options.path    a route pattern, when the component reads useParams()
 * @param options.routes  extra { path, element } routes, so a test can assert
 *                        it navigated somewhere specific, not just "away"
 */
export function renderWithProviders(ui, {
  auth = anonymousAuth,
  cart = emptyCart,
  route = "/",
  path,
  routes = [],
  cartApi = {},
  ...options
} = {}) {
  const cartValue = {
    cart,
    loading: false,
    error: null,
    refresh: async () => cart,
    addItem: async () => cart,
    updateQuantity: async () => cart,
    removeItem: async () => cart,
    clear: async () => cart,
    setCart: () => {},
    ...cartApi,
  };

  function Wrapper({ children }) {
    return (
      <MemoryRouter initialEntries={[route]}>
        <AuthContext.Provider value={auth}>
          <CartContext.Provider value={cartValue}>
            {path ? (
              <Routes>
                <Route path={path} element={children} />
                {routes.map((r) => (
                  <Route key={r.path} path={r.path} element={r.element} />
                ))}
                {/* So a test can assert "it navigated away" by looking for
                    this, rather than asserting on an implementation detail. */}
                <Route path="*" element={<div data-testid="navigated-away" />} />
              </Routes>
            ) : children}
          </CartContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}
