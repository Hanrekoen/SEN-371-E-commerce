import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import StatusPill from "../components/ui/StatusPill";
import * as ordersApi from "../api/orders.api";
import { formatCents, formatDate } from "../utils/money";
import { summaryMessage } from "../utils/apiErrors";
import "./OrderHistory.css";

const PAGE_SIZE = 10;

export default function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      setLoading(true);
      setError(null);
      try {
        // listMyOrders is a paginated endpoint, so it resolves { data, meta }.
        const response = await ordersApi.listMyOrders({ page, limit: PAGE_SIZE });
        if (cancelled) return;
        setOrders(response?.data ?? []);
        setMeta(response?.meta ?? null);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadOrders();
    return () => { cancelled = true; };
  }, [page]);

  if (loading) {
    return (
      <div className="gv-page gv-orders gv-orders--message">
        <p className="gv-orders__status" role="status">Loading your orders…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gv-page gv-orders gv-orders--message">
        <Alert tone="danger" title="We could not load your orders">
          {summaryMessage(error, "Please try again in a moment.")}
        </Alert>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="gv-page gv-orders gv-orders--message">
        <h1>No orders yet</h1>
        <p className="gv-orders__empty-sub">
          Anything you order will appear here, with its status and full receipt.
        </p>
        <Button as={Link} to="/catalog" size="lg">Browse the catalogue</Button>
      </div>
    );
  }

  const totalPages = meta?.totalPages ?? 1;

  return (
    <div className="gv-page gv-orders">
      <h1 className="gv-orders__title">Order History</h1>
      {meta?.total != null && (
        <p className="gv-orders__count">{meta.total} order{meta.total === 1 ? "" : "s"} all time</p>
      )}

      <ul className="gv-orders__list">
        {orders.map((order) => (
          <li className="gv-orders__card" key={order.id}>
            <header className="gv-orders__head">
              <div>
                <p className="gv-orders__number">{order.orderNumber || order.id}</p>
                <p className="gv-orders__date">Placed {formatDate(order.createdAt)}</p>
              </div>
              {/* The same pill the admin dashboard uses, so one status never
                  looks like two different things in two places. */}
              <StatusPill status={order.status} />
            </header>

            <ul className="gv-orders__items">
              {(order.items ?? []).map((item, index) => (
                <li key={`${order.id}-${item.productId ?? index}`}>
                  <span className="gv-orders__qty">{item.quantity}×</span>
                  <span className="gv-orders__item-name">{item.name}</span>
                  <span className="gv-orders__item-price">
                    {formatCents(item.unitPriceCents * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <footer className="gv-orders__foot">
              <span className="gv-orders__total">Total {formatCents(order.totalCents)}</span>
              <Link className="gv-orders__receipt" to={`/orders/${order.id}/confirmation`}>
                View receipt
              </Link>
            </footer>
          </li>
        ))}
      </ul>

      {totalPages > 1 && (
        <nav className="gv-orders__pager" aria-label="Order history pages">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="gv-orders__page">Page {page} of {totalPages}</span>
          <Button
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </nav>
      )}
    </div>
  );
}
