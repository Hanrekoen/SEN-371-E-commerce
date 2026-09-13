import { Link } from "react-router-dom";
import Button from "./ui/Button";
import RequireAuth from "./RequireAuth";
import { useAuth } from "../context/AuthContext";

/**
 * Wraps the pages that only make sense for someone who can buy: the cart and
 * checkout. The API refuses an admin's cart writes and checkout outright, so
 * without this an admin typing the URL would reach a page whose every button
 * answers 403.
 *
 * This is a courtesy, not the control. The guard that matters is
 * shoppersOnly in the API - this only explains the situation before the
 * customer meets it.
 */
export default function RequireShopper({ children }) {
  return (
    <RequireAuth>
      <ShopperOnly>{children}</ShopperOnly>
    </RequireAuth>
  );
}

function ShopperOnly({ children }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return children;

  return (
    <div className="gv-page" style={{ maxWidth: 560, marginInline: "auto", paddingBlock: "80px 64px", textAlign: "center" }}>
      <h1 style={{ fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 700 }}>Admins do not shop here</h1>
      <p className="gv-muted" style={{ margin: "16px 0 32px" }}>
        This account manages the catalogue and the orders behind it. To place an
        order, sign in with a customer account.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12 }}>
        <Button as={Link} to="/admin" size="lg">Go to the dashboard</Button>
        <Button as={Link} to="/catalog" size="lg" variant="outline">Browse the catalogue</Button>
      </div>
    </div>
  );
}
