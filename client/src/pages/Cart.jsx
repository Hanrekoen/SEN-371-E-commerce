import { useCart } from "../context/CartContext";
import { useNavigate } from "react-router-dom";
import { formatCents } from "../utils/money";
import "./Cart.css";

function Cart() {
  const { cart, removeItem, updateQuantity } = useCart();
  const navigate = useNavigate();

  const items = cart?.items ?? [];

  if (items.length === 0) {
    return <p className="status-text">Your cart is empty</p>;
  }

  return (
    <div className="cart-page">
      <h1>Your Cart</h1>

      <div className="cart-list">
        {items.map((item) => (
          <div className="cart-item" key={item.productId}>
            <div className="cart-item-info">
              <p className="cart-item-name">{item.name}</p>
              <p className="cart-item-price">{formatCents(item.unitPriceCents)} Each</p>
              <p className="cart-item-total">{formatCents(item.lineTotalCents)}</p>
            </div>

            <div className="cart-item-controls">
              <input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(e) =>
                  updateQuantity(item.productId, Number(e.target.value))
                }
              />

              <button
                className="remove-btn"
                onClick={() => removeItem(item.productId)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="cart-total">
        <p>Total: {formatCents(cart.totalCents)}</p>
        <button
          className="checkout-btn"
          onClick={() => navigate("/checkout")}
        >
          Checkout
        </button>
      </div>
    </div>
  );
}

export default Cart;
