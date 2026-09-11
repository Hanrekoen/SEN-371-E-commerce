import React from "react";
import { Link, useLocation } from "react-router-dom";

/**
 * Mounted as the catch-all route (path="*") in App.jsx, so this renders
 * for any URL that doesn't match a real route - a typo, a stale bookmark,
 * a bad link from another page.
 */
export default function NotFoundPage() {
  const location = useLocation();

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 480, margin: "4rem auto", textAlign: "center" }}>
      <p style={{ fontSize: "3rem", fontWeight: 700, color: "#028090", margin: 0 }}>404</p>
      <h1 style={{ margin: "0.5rem 0" }}>Page not found</h1>
      <p style={{ color: "#5c6b70" }}>
        There's nothing at <code>{location.pathname}</code>.
      </p>
      <p>
        <Link to="/">Back to the homepage</Link>
      </p>
    </main>
  );
}
