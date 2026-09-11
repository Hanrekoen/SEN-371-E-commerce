import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import Logo from "./Logo";
import { CartIcon, SearchIcon, MenuIcon, CloseIcon } from "../ui/Icons";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import "./Navbar.css";

const LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/catalog", label: "Catalog" },
  // The Figma nav lists every frame, this one included. It points at a
  // representative product rather than a real "product detail" section.
  { to: "/product/obsidian-x-9-headset", label: "Product Detail" },
  { to: "/cart", label: "Cart" },
  { to: "/checkout", label: "Checkout" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const { cart } = useCart();
  const panelRef = useRef(null);

  // Close the mobile panel on Escape - a drawer with no keyboard exit is a trap.
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function onSearch(e) {
    e.preventDefault();
    const q = term.trim();
    navigate(q ? `/catalog?q=${encodeURIComponent(q)}` : "/catalog");
    setOpen(false);
  }

  const count = cart?.itemCount ?? 0;

  return (
    <header className="gv-nav">
      <div className="gv-nav__inner gv-page">
        <Logo />

        <button
          type="button"
          className="gv-nav__burger"
          aria-expanded={open}
          aria-controls="gv-nav-panel"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <CloseIcon /> : <MenuIcon />}
          <span className="gv-sr">{open ? "Close menu" : "Open menu"}</span>
        </button>

        <div id="gv-nav-panel" ref={panelRef} className={`gv-nav__panel ${open ? "is-open" : ""}`}>
          <nav className="gv-nav__links" aria-label="Primary">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) => `gv-nav__link ${isActive ? "is-active" : ""}`}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) => `gv-nav__link ${isActive ? "is-active" : ""}`}
                onClick={() => setOpen(false)}
              >
                Admin
              </NavLink>
            )}
          </nav>

          <div className="gv-nav__actions">
            <form className="gv-nav__search" role="search" onSubmit={onSearch}>
              <SearchIcon className="gv-nav__search-icon" />
              <label className="gv-sr" htmlFor="gv-nav-search">Search products</label>
              <input
                id="gv-nav-search"
                type="search"
                placeholder="Search tech..."
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              />
            </form>

            <NavLink to="/cart" className="gv-nav__cart" onClick={() => setOpen(false)}>
              <CartIcon />
              <span className="gv-sr">Cart</span>
              {count > 0 && <span className="gv-nav__badge" aria-label={`${count} items in cart`}>{count}</span>}
            </NavLink>

            {isAuthenticated ? (
              <div className="gv-nav__account">
                <NavLink to="/orders" className="gv-nav__account-name" onClick={() => setOpen(false)}>
                  {user?.firstName || "Account"}
                </NavLink>
                <button type="button" className="gv-nav__signout" onClick={() => { logout(); setOpen(false); }}>
                  Sign out
                </button>
              </div>
            ) : (
              <NavLink to="/login" className="gv-nav__signin" onClick={() => setOpen(false)}>
                Sign in
              </NavLink>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
