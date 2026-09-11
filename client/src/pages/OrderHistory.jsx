import { useState, useEffect } from "react";
import apiRequest from "../utils/api";
import "./OrderHistory.css";

function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadOrders() {
      try {
        setLoading(true);
        const data = await apiRequest("/orders");
        setOrders(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, []);

  if (loading) {
    return <p className="status-text">loading your orders...</p>;
  }

  if (error) {
    return <p className="status-text error">{error}</p>;
  }

  if (orders.length === 0) {
    return <p className="status-text">you have no past orders yet</p>;
  }

  return (
    <div className="order-history">
      <h1>order history</h1>

      <div className="order-list">
        {orders.map((order) => (
          <div className="order-card" key={order.id}>
            <div className="order-header">
              <p className="order-id">order #{order.id}</p>
              <span className={"order-status status-" + order.status}>
                {order.status}
              </span>
            </div>

            <p className="order-date">
              placed on {new Date(order.createdAt).toLocaleDateString()}
            </p>

            <ul className="order-items">
              {order.items.map((item, index) => (
                <li key={index}>
                  {item.name} x{item.quantity}
                </li>
              ))}
            </ul>

            <p className="order-total">total: R{order.total}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default OrderHistory;
