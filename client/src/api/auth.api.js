import { request } from "./httpClient";
import { setAccessToken, clearAccessToken } from "./tokenStore";

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
