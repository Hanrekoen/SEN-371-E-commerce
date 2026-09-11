import { Link, Navigate, useLocation } from "react-router-dom";
import Button from "../components/ui/Button";
import { ShieldIcon, CardIcon } from "../components/ui/Icons";
import { formatCents } from "../utils/money";
import "./OrderConfirmationPage.css";

export default function OrderConfirmationPage() {
  const location = useLocation();
  const order = location.state?.order;

  // Reached without an order in state - a refresh, or a direct link. There is
  // nothing to confirm, so send them to their order history instead of
  // rendering an empty receipt.
  if (!order) return <Navigate to="/orders" replace />;

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
