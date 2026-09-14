import { request } from "./httpClient";
import { setAccessToken, clearAccessToken } from "./tokenStore";

// The access token is in-memory only, so after a reload the app must ask who
// is signed in. Called once on boot, after the silent refresh.
export function me() {
  return request("/auth/me");
}

// Exchanges the httpOnly refresh cookie for a fresh access token. Rejects
// when there is no valid cookie, which simply means "not signed in".
export async function restoreSession() {
  const data = await request("/auth/refresh", { method: "POST", auth: false });
  setAccessToken(data.accessToken);
  return me();
}

export async function register({ firstName, lastName, email, password }) {
  const data = await request("/auth/register", {
    method: "POST",
    body: { firstName, lastName, email, password },
    auth: false,
  });
  setAccessToken(data.accessToken);
  return data.user;
}

export async function login({ email, password }) {
  const data = await request("/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });
  setAccessToken(data.accessToken);
  return data.user;
}

export async function logout() {
  try {
    await request("/auth/logout", { method: "POST" });
  } finally {
    // Clear client-side state even if the network call fails - the user
    // asked to log out, so the app should behave as logged-out regardless.
    clearAccessToken();
  }
}
