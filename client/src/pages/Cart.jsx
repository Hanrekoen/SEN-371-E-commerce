import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import { useCart } from "../context/CartContext";
import { formatCents } from "../utils/money";
import { summaryMessage } from "../utils/apiErrors";
import "./Cart.css";

export default function Cart() {
  const { cart, loading, removeItem, updateQuantity } = useCart();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  const items = cart?.items ?? [];

  // The server can refuse any mutation (stock, deactivated product, expired
  // session); without this the rejection is swallowed and the row silently
  // fails to change.
  async function run(action) {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(summaryMessage(err, "We could not update your cart."));
    }
  }

  function onQuantityChange(productId, raw) {
    const next = Number(raw);
    // A cleared field parses as 0, which the API refuses - treat it as "still
    // typing" rather than firing a request that must fail.
    if (!Number.isInteger(next) || next < 1) return;
    run(() => updateQuantity(productId, next));
  }

  if (items.length === 0) {
    return (
      <div className="gv-page gv-cart gv-cart--empty">
        <h1>Your cart is empty</h1>
        <p className="gv-cart__empty-sub">
          Nothing has been added yet. The catalogue is a good place to start.
        </p>
        <Button as={Link} to="/catalog" size="lg">Browse the catalogue</Button>
      </div>
    );
  }

  return (
    <div className="gv-page gv-cart">
      <h1 className="gv-cart__title">Your Cart</h1>

      {error && <div className="gv-cart__alert"><Alert tone="danger">{error}</Alert></div>}

      <ul className="gv-cart__list">
        {items.map((item) => (
          <li className="gv-cart__item" key={item.productId}>
            <div className="gv-cart__info">
              <p className="gv-cart__name">{item.name}</p>
              <p className="gv-cart__meta">
                {item.finish ? `${item.finish} · ` : ""}{formatCents(item.unitPriceCents)} each
              </p>
              {/* The server already flagged this line as unavailable, so say
                  so here rather than letting checkout be the one to refuse. */}
              {item.inStock === false && (
                <p className="gv-cart__oos">Out of stock — remove it to check out</p>
              )}
            </div>

            <div className="gv-cart__controls">
              <label className="gv-sr" htmlFor={`qty-${item.productId}`}>
                Quantity of {item.name}
              </label>
              <input
                id={`qty-${item.productId}`}
                className="gv-cart__qty"
                type="number"
                min="1"
                max="99"
                value={item.quantity}
                disabled={loading}
                onChange={(e) => onQuantityChange(item.productId, e.target.value)}
              />
              <span className="gv-cart__line-total">{formatCents(item.lineTotalCents)}</span>
              <button
                type="button"
                className="gv-cart__remove"
                disabled={loading}
                onClick={() => run(() => removeItem(item.productId))}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="gv-cart__summary">
        <dl className="gv-cart__totals">
          <div><dt>Subtotal</dt><dd>{formatCents(cart.subtotalCents)}</dd></div>
          <div>
            <dt>Shipping</dt>
            <dd className={cart.shippingCents === 0 ? "is-free" : ""}>
              {cart.shippingCents === 0 ? "FREE" : formatCents(cart.shippingCents)}
            </dd>
          </div>
          <div><dt>Tax</dt><dd>{formatCents(cart.taxCents)}</dd></div>
        </dl>

        <div className="gv-cart__grand">
          <span>Total</span>
          <strong>{formatCents(cart.totalCents)}</strong>
        </div>

        <Button size="lg" full loading={loading} onClick={() => navigate("/checkout")}>
          Checkout
        </Button>
        <Link className="gv-cart__continue" to="/catalog">Continue shopping</Link>
      </div>
    </div>
  );
}
