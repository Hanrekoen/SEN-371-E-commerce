import { Link, useLocation } from "react-router-dom";
import Button from "../components/ui/Button";
import { SearchIcon } from "../components/ui/Icons";
import "./NotFoundPage.css";

/**
 * The catch-all route. Anything that does not match a real path lands here:
 * a typo, a stale bookmark, a dead link from somewhere else.
 *
 * It says which path failed rather than a bare apology, because knowing the
 * URL is usually what tells someone whether they mistyped it or whether the
 * link they followed is wrong.
 */
export default function NotFoundPage() {
  const { pathname } = useLocation();

  return (
    <div className="gv-page gv-404">
      <p className="gv-404__code" aria-hidden="true">404</p>
      <h1 className="gv-404__title">This vault door leads nowhere</h1>
      <p className="gv-404__sub">
        There is nothing at <code className="gv-404__path">{pathname}</code>. It may have been
        moved, or the link that brought you here may be out of date.
      </p>

      <div className="gv-404__actions">
        <Button as={Link} to="/" size="lg">Back to the vault</Button>
        <Button as={Link} to="/catalog" size="lg" variant="outline">
          <SearchIcon /> Browse the catalogue
        </Button>
      </div>

      <ul className="gv-404__links">
        <li><Link to="/orders">Your orders</Link></li>
        <li><Link to="/cart">Your cart</Link></li>
        <li><Link to="/login">Sign in</Link></li>
      </ul>
    </div>
  );
}
