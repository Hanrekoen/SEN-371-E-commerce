import { useState, useEffect } from "react";
import * as ordersApi from "../api/orders.api";
import { formatCents } from "../utils/money";
import "./OrderHistory.css";

function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadOrders() {
      try {
        setLoading(true);
        setError(null);
        const response = await ordersApi.listMyOrders();
        setOrders(response?.data ?? response ?? []);
      } catch (err) {
        setError(err.message || "Could not load order history");
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, []);

  if (loading) {
    return <p className="status-text">Loading your orders...</p>;
  }

  if (error) {
    return <p className="status-text error">{error}</p>;
  }

  if (orders.length === 0) {
    return <p className="status-text">You have no past orders yet</p>;
  }

  return (
    <div className="order-history">
      <h1>Order History</h1>

      <div className="order-list">
        {orders.map((order) => (
          <div className="order-card" key={order.id}>
            <div className="order-header">
              <p className="order-id">Order #{order.orderNumber || order.id}</p>
              <span className={"order-status status-" + order.status}>
                {order.status}
              </span>
            </div>

            <p className="order-date">
              Placed on {new Date(order.createdAt).toLocaleDateString()}
            </p>

            <ul className="order-items">
              {order.items?.map((item, index) => (
                <li key={`${order.id}-${item.productId ?? index}`}>
                  {item.name} x{item.quantity}
                </li>
              ))}
            </ul>

            <p className="order-total">Total: {formatCents(order.totalCents)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default OrderHistory;
