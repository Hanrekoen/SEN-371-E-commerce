import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import * as authApi from "../api/auth.api";

// Exported so tests can supply a context directly rather than mock the network
// and wait for a provider to settle. Application code uses the hook below.
export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // "loading" until the boot-time session restore settles. Without this the
  // app briefly renders as signed-out and bounces the user off /admin.
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;
    authApi
      .restoreSession()
      .then((restored) => { if (!cancelled) { setUser(restored); setStatus("authenticated"); } })
      .catch(() => { if (!cancelled) { setUser(null); setStatus("anonymous"); } });
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (credentials) => {
    const signedIn = await authApi.login(credentials);
    setUser(signedIn);
    setStatus("authenticated");
    return signedIn;
  }, []);

  const register = useCallback(async (details) => {
    const created = await authApi.register(details);
    setUser(created);
    setStatus("authenticated");
    return created;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setStatus("anonymous");
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      isLoading: status === "loading",
      isAuthenticated: status === "authenticated",
      isAdmin: user?.role === "admin",
      login, register, logout,
    }),
    [user, status, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
