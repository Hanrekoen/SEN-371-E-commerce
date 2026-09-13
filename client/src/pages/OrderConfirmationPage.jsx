import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import Button from "../components/ui/Button";
import Alert from "../components/ui/Alert";
import { ShieldIcon, CardIcon } from "../components/ui/Icons";
import { getMyOrder } from "../api/orders.api";
import { formatCents } from "../utils/money";
import { summaryMessage } from "../utils/apiErrors";
import "./OrderConfirmationPage.css";

/**
 * Route: /orders/:orderId/confirmation
 *
 * The order is fetched by id rather than read out of navigation state, so a
 * refresh, a bookmark or a link pasted to someone else all behave the same
 * way. Checkout still passes the order along in state, which is used only to
 * paint immediately while the fetch confirms it - the fetched copy always
 * wins, since it is the one the server stands behind.
 *
 * No ownership check here: order.service.getForUser already refuses an order
 * that belongs to someone else, and a 403 from the API is the answer.
 */
export default function OrderConfirmationPage() {
  const { orderId } = useParams();
  const location = useLocation();
  const handedOver = location.state?.order;

  const [order, setOrder] = useState(handedOver || null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!handedOver);

  useEffect(() => {
    let cancelled = false;
    if (!orderId) return undefined;

    getMyOrder(orderId)
      .then((fetched) => { if (!cancelled) { setOrder(fetched); setError(null); } })
      .catch((err) => { if (!cancelled) setError(err); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [orderId]);

  if (loading) {
    return (
      <div className="gv-page gv-confirm gv-confirm--message">
        <p className="gv-confirm__loading" role="status">Confirming your order…</p>
      </div>
    );
  }

  // Only an error if we have nothing to show. If the hand-over copy is on
  // screen, a failed refetch is not worth replacing a valid receipt with an
  // error - the customer's order did go through.
  if (error && !order) {
    return (
      <div className="gv-page gv-confirm gv-confirm--message">
        <Alert tone="danger" title="We could not load that order">
          {error.status === 403
            ? "That order belongs to a different account."
            : error.status === 404
              ? "We have no record of an order with that reference."
              : summaryMessage(error, "Please try again in a moment.")}
        </Alert>
        <div className="gv-confirm__actions">
          <Button as={Link} to="/orders" size="lg">View your orders</Button>
          <Button as={Link} to="/" size="lg" variant="outline">Back to the vault</Button>
        </div>
      </div>
    );
  }

  const address = order.shippingAddress || {};

  return (
    <div className="gv-page gv-confirm">
      <header className="gv-confirm__head">
        <span className="gv-confirm__seal"><ShieldIcon /></span>
        <p className="gv-confirm__eyebrow">Secure deployment successful</p>
        <h1 className="gv-confirm__title">Vault Dispatch Authorized</h1>
        <p className="gv-confirm__sub">
          Order key <strong>#{order.orderNumber}</strong> has been cryptographically confirmed.
        </p>
      </header>

      <div className="gv-confirm__body">
        <div className="gv-confirm__col">
          <section className="gv-confirm__card">
            <h2>Dispatch Verification</h2>
            <dl>
              <div>
                <dt>Status</dt>
                <dd className="is-highlight">{String(order.status).toUpperCase()}</dd>
              </div>
              <div>
                <dt>Payment reference</dt>
                <dd>{order.paymentReference || "—"}</dd>
              </div>
              <div>
                <dt>Courier protocol</dt>
                <dd>Signature Required (Secure Hand-off)</dd>
              </div>
            </dl>
          </section>

          <section className="gv-confirm__card gv-confirm__card--split">
            <div>
              <p className="gv-eyebrow">Vault delivery destination</p>
              <p className="gv-confirm__address">
                {address.line1}<br />
                {address.city}, {address.province} {address.postalCode}<br />
                {address.country}
              </p>
            </div>
            <div>
              <p className="gv-eyebrow">Secure payment protocol</p>
              <p className="gv-confirm__payment">
                <CardIcon /> <span>Authorised by the payment provider</span>
              </p>
              <p className="gv-confirm__token">Reference: {order.paymentReference || "—"}</p>
            </div>
          </section>

          <div className="gv-confirm__actions">
            <Button as={Link} to="/catalog" size="lg">Continue exploring the vault</Button>
            <Button as={Link} to="/orders" size="lg" variant="outline">View access history</Button>
          </div>
        </div>

        <aside className="gv-confirm__manifest">
          <h2>Equipment Manifest</h2>
          <ul>
            {(order.items || []).map((item) => (
              <li key={`${item.productId}-${item.finish || ""}`}>
                <div className="gv-confirm__item">
                  <p className="gv-confirm__item-name">{item.name}</p>
                  <p className="gv-confirm__item-meta">
                    {item.finish ? `${item.finish} · ` : ""}Qty {item.quantity}
                  </p>
                </div>
                <span className="gv-confirm__item-price">
                  {formatCents(item.unitPriceCents * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="gv-confirm__totals">
            <div><dt>Subtotal</dt><dd>{formatCents(order.subtotalCents)}</dd></div>
            <div>
              <dt>Vault Courier Shipping</dt>
              <dd className={order.shippingCents === 0 ? "is-free" : ""}>
                {order.shippingCents === 0 ? "FREE" : formatCents(order.shippingCents)}
              </dd>
            </div>
            <div><dt>Calculated Vault Tax</dt><dd>{formatCents(order.taxCents)}</dd></div>
          </dl>

          <div className="gv-confirm__grand">
            <span>Total Authorized Charges</span>
            <strong>{formatCents(order.totalCents)}</strong>
          </div>
        </aside>
      </div>
    </div>
  );
}
