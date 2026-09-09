import { useEffect, useState } from "react";
import { request } from "./api/httpClient";
import * as authApi from "./api/auth.api";
import * as cartApi from "./api/cart.api";
import { ApiError } from "./api/ApiError";

/**
 * This is NOT Milestone 4's 13 screens - it's a working proof that the
 * facade (base URL, Bearer header, 401 refresh, error normalisation) is
 * wired correctly, per 3.4: "Start the React API client". Three things it
 * demonstrates:
 *   1. a public call (health) that needs no token
 *   2. login, which stores the access token in memory via tokenStore
 *   3. an authenticated call (cart) that sends the Bearer header, and
 *      would transparently survive an access-token expiry via the 401
 *      refresh-and-retry path in httpClient.js
 */
export default function App() {
  const [health, setHealth] = useState(null);
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    request("/health", { auth: false })
      .then(setHealth)
      .catch((e) => setError(e));
  }, []);

  async function run(fn) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(e.message));
    } finally {
      setBusy(false);
    }
  }

  const handleLogin = () =>
    run(async () => {
      const loggedInUser = await authApi.login({ email, password });
      setUser(loggedInUser);
      setCart(await cartApi.getCart());
    });

  const handleLogout = () =>
    run(async () => {
      await authApi.logout();
      setUser(null);
      setCart(null);
    });

  const handleRefreshCart = () => run(async () => setCart(await cartApi.getCart()));

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 480, margin: "3rem auto" }}>
      <h1>GadgetVault — API client scaffold</h1>

      <section>
        <h2>Health check (public, no token)</h2>
        <pre>{health ? JSON.stringify(health, null, 2) : "loading..."}</pre>
      </section>

      {error && (
        <p style={{ color: "#b91c1c", border: "1px solid #b91c1c", padding: "0.5rem" }}>
          [{error.code}] {error.message}
        </p>
      )}

      {!user ? (
        <section>
          <h2>Login</h2>
          <input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input
            placeholder="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button disabled={busy} onClick={handleLogin}>
            Log in
          </button>
        </section>
      ) : (
        <section>
          <h2>Signed in as {user.email}</h2>
          <button disabled={busy} onClick={handleRefreshCart}>
            Reload cart
          </button>
          <button disabled={busy} onClick={handleLogout}>
            Log out
          </button>
          <pre>{cart ? JSON.stringify(cart, null, 2) : "no cart loaded yet"}</pre>
        </section>
      )}
    </main>
  );
}
