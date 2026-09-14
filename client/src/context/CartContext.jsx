import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as cartApi from "../api/cart.api";
import { useAuth } from "./AuthContext";

// Exported so tests can supply a context directly rather than mock the network
// and wait for a provider to settle. Application code uses the hook below.
export const CartContext = createContext(null);

const EMPTY = { items: [], itemCount: 0, subtotalCents: 0, shippingCents: 0, taxCents: 0, totalCents: 0 };

export function CartProvider({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [cart, setCart] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) { setCart(EMPTY); return EMPTY; }
    setLoading(true);
    try {
      const next = await cartApi.getCart();
      setCart(next || EMPTY);
      setError(null);
      return next;
    } catch (err) {
      setError(err);
      return EMPTY;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // The cart belongs to the signed-in user, so it is loaded once auth settles
  // and cleared on sign-out.
  useEffect(() => { if (!isLoading) refresh(); }, [isLoading, refresh]);

  // Every mutation returns the whole recalculated cart, so the client never
  // computes totals itself - the server is the only place they are worked out.
  const run = useCallback(async (fn) => {
    setLoading(true);
    try {
      const next = await fn();
      setCart(next || EMPTY);
      setError(null);
      return next;
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      cart, loading, error, refresh,
      addItem: (payload) => run(() => cartApi.addItem(payload)),
      updateQuantity: (productId, quantity) => run(() => cartApi.updateQuantity(productId, quantity)),
      removeItem: (productId) => run(() => cartApi.removeItem(productId)),
      clear: () => run(() => cartApi.clearCart()),
      setCart,
    }),
    [cart, loading, error, refresh, run]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
