import { useCart } from "../context/CartContext";
import { useNavigate } from "react-router-dom";
import "./Cart.css";

function Cart() {
  const { cartItems, removeFromCart, updateQuantity } = useCart();
  const navigate = useNavigate();

  const total = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  if (cartItems.length === 0) {
    return <p className="status-text">your cart is empty</p>;
  }

  return (
    <div className="cart-page">
      <h1>your cart</h1>

      <div className="cart-list">
        {cartItems.map((item) => (
          <div className="cart-item" key={item.id}>
            <div className="cart-item-info">
              <p className="cart-item-name">{item.name}</p>
              <p className="cart-item-price">R{item.price} each</p>
            </div>

            <div className="cart-item-controls">
              <input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(e) =>
                  updateQuantity(item.id, Number(e.target.value))
                }
              />

              <button
                className="remove-btn"
                onClick={() => removeFromCart(item.id)}
              >
                remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="cart-total">
        <p>total: R{total.toFixed(2)}</p>
        <button
          className="checkout-btn"
          onClick={() => navigate("/checkout")}
        >
          go to checkout
        </button>
      </div>
    </div>
  );
}

export default Cart;
