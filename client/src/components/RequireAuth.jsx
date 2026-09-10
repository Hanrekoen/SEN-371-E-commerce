import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Route guard. Waits for the boot-time session restore before deciding -
// redirecting while auth is still "loading" would bounce a signed-in admin
// straight back to the login page on every refresh.
export default function RequireAuth({ children, role }) {
  const { isLoading, isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (isLoading) return <div className="gv-page" style={{ padding: "80px 0" }} role="status">Checking your session…</div>;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (role && user?.role !== role) {
    return (
      <div className="gv-page" style={{ padding: "80px 0" }}>
        <h1>Not your vault</h1>
        <p className="gv-muted">This area needs {role} access.</p>
      </div>
    );
  }

  return children;
}
