import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import Field from "../components/ui/Field";
import Alert from "../components/ui/Alert";
import { ShieldIcon, TruckIcon, LockIcon, CardIcon } from "../components/ui/Icons";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { checkout } from "../api/orders.api";
import { formatCents } from "../utils/money";
import { fieldErrors, summaryMessage } from "../utils/apiErrors";
import "./CheckoutPage.css";

const BLANK = {
  firstName: "", lastName: "", line1: "", city: "", province: "", postalCode: "",
  country: "South Africa",
  cardName: "", cardNumber: "", expiry: "", cvc: "",
};

// "4242 4242 4242 4242" -> "4242424242424242"
const digitsOnly = (s) => String(s).replace(/\D/g, "");

// Groups of four as the user types, so a 16-digit string stays readable.
function formatCardNumber(value) {
  return digitsOnly(value).slice(0, 19).replace(/(.{4})/g, "$1 ").trim();
}
function formatExpiry(value) {
  const d = digitsOnly(value).slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)} / ${d.slice(2)}`;
}

export default function CheckoutPage() {
  const { cart, setCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [values, setValues] = useState(() => ({
    ...BLANK,
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
  }));
  const [errors, setErrors] = useState({});
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (key, transform) => (e) => {
    const next = transform ? transform(e.target.value) : e.target.value;
    setValues((v) => ({ ...v, [key]: next }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const items = cart?.items || [];
  const empty = items.length === 0;

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setSummary(null);
    setErrors({});

    const [expMonth, expYear] = digitsOnly(values.expiry).match(/.{1,2}/g) || [];

    try {
      const order = await checkout({
        shippingAddress: {
          line1: values.line1,
          city: values.city,
          province: values.province,
          postalCode: values.postalCode,
          country: values.country,
        },
        card: {
          number: digitsOnly(values.cardNumber),
          expMonth: Number(expMonth),
          // The form takes two digits; the API wants a full year.
          expYear: expYear ? 2000 + Number(expYear) : undefined,
          cvc: values.cvc,
        },
      });

      // Checkout empties the cart server-side, so mirror that locally rather
      // than leaving a stale badge in the navbar.
      setCart({ items: [], itemCount: 0, subtotalCents: 0, shippingCents: 0, taxCents: 0, totalCents: 0 });
      navigate("/order-confirmation", { replace: true, state: { order } });
    } catch (err) {
      const perField = fieldErrors(err);
      setErrors(perField);

      // The three outcomes the payment integration can produce, each said
      // plainly rather than as a generic failure.
      if (err.status === 402) {
        setSummary(`${err.message} Your card was not charged and your cart is untouched — try another card.`);
      } else if (err.status === 503) {
        setSummary(`${err.message} Nothing has been charged. Please try again in a moment.`);
      } else if (err.status === 422) {
        setSummary(err.message);
      } else if (Object.keys(perField).length === 0) {
        setSummary(summaryMessage(err, "We could not complete your order."));
      }
    } finally {
      setBusy(false);
    }
  }

  if (empty) {
    return (
      <div className="gv-page gv-checkout__empty">
        <h1>Your gear vault is empty</h1>
        <p className="gv-muted">Add something to it before checking out.</p>
        <Button as={Link} to="/catalog" size="lg">Explore the catalogue</Button>
      </div>
    );
  }

  return (
    <div className="gv-page gv-checkout">
      <form id="gv-checkout-form" className="gv-checkout__form" onSubmit={onSubmit} noValidate>
        <section className="gv-checkout__section">
          <h2 className="gv-checkout__legend">
            <span className="gv-checkout__step">1</span> Vault Delivery Coordinates
          </h2>

          <div className="gv-checkout__grid">
            <Field label="First name" value={values.firstName} onChange={set("firstName")}
                   error={errors.firstName} autoComplete="given-name" />
            <Field label="Last name" value={values.lastName} onChange={set("lastName")}
                   error={errors.lastName} autoComplete="family-name" />
          </div>

          <Field label="Street address" value={values.line1} onChange={set("line1")}
                 error={errors.line1} autoComplete="address-line1"
                 placeholder="440 Silicon Pass, Suite 100" />

          <div className="gv-checkout__grid gv-checkout__grid--3">
            <Field label="City" value={values.city} onChange={set("city")}
                   error={errors.city} autoComplete="address-level2" />
            <Field label="Province" value={values.province} onChange={set("province")}
                   error={errors.province} autoComplete="address-level1" />
            <Field label="Postal code" value={values.postalCode} onChange={set("postalCode")}
                   error={errors.postalCode} inputMode="numeric" autoComplete="postal-code"
                   placeholder="8001" hint="Four digits" />
          </div>

          <Field label="Country" value={values.country} onChange={set("country")}
                 error={errors.country} autoComplete="country-name" />
        </section>

        <section className="gv-checkout__section">
          <h2 className="gv-checkout__legend">
            <span className="gv-checkout__step">2</span> Secure Encryption Key (Payment)
          </h2>

          <div className="gv-checkout__card">
            <div className="gv-checkout__card-head">
              <h3>Credit or Debit Crypt</h3>
              <CardIcon className="gv-checkout__card-icon" />
            </div>

            <Field label="Cardholder name" value={values.cardName} onChange={set("cardName")}
                   error={errors.cardName} autoComplete="cc-name" placeholder="Marcus Aurelius" />

            <Field label="Card number" value={values.cardNumber}
                   onChange={set("cardNumber", formatCardNumber)}
                   error={errors.number || errors.card} inputMode="numeric" autoComplete="cc-number"
                   placeholder="4242 4242 4242 4242"
                   hint="Test card 4242 4242 4242 4242 is approved. 4000 0000 0000 9995 is declined." />

            <div className="gv-checkout__grid">
              <Field label="Expiry" value={values.expiry} onChange={set("expiry", formatExpiry)}
                     error={errors.expMonth || errors.expYear} inputMode="numeric"
                     autoComplete="cc-exp" placeholder="08 / 29" />
              <Field label="CVC" value={values.cvc} onChange={set("cvc", (v) => digitsOnly(v).slice(0, 4))}
                     error={errors.cvc} inputMode="numeric" autoComplete="cc-csc"
                     type="password" placeholder="123" />
            </div>
          </div>
        </section>
      </form>

      <aside className="gv-checkout__aside">
        <div className="gv-checkout__summary">
          <h2 className="gv-checkout__summary-title">Vault Transaction</h2>

          <ul className="gv-checkout__lines">
            {items.map((item) => (
              <li key={`${item.productId}-${item.finish || ""}`}>
                <span className="gv-checkout__qty">{item.quantity}x</span>
                <span className="gv-checkout__name">{item.name}</span>
                <span className="gv-checkout__price">{formatCents(item.lineTotalCents)}</span>
              </li>
            ))}
          </ul>

          <dl className="gv-checkout__totals">
            <div><dt>Transaction Subtotal</dt><dd>{formatCents(cart.subtotalCents)}</dd></div>
            <div>
              <dt>Encrypted Courier Route</dt>
              <dd className={cart.shippingCents === 0 ? "is-free" : ""}>
                {cart.shippingCents === 0 ? "FREE" : formatCents(cart.shippingCents)}
              </dd>
            </div>
            <div><dt>Regional Taxes</dt><dd>{formatCents(cart.taxCents)}</dd></div>
          </dl>

          <div className="gv-checkout__final">
            <span>Final Crypt Charge</span>
            <strong>{formatCents(cart.totalCents)}</strong>
          </div>

          {summary && (
            <div className="gv-checkout__alert">
              <Alert tone="danger">{summary}</Alert>
            </div>
          )}

          {/* The rail sits outside the <form>, so the button is associated by
              id. That keeps Enter-to-submit working from any field. */}
          <Button type="submit" form="gv-checkout-form" size="lg" full loading={busy}>
            Execute Transaction
          </Button>
        </div>

        <div className="gv-checkout__trust">
          <p><ShieldIcon /> <span>Card details are forwarded to the payment provider and never stored.</span></p>
          <p><TruckIcon /> <span>Signature Secure Delivery Required</span></p>
          <p><LockIcon /> <span>Totals are calculated server-side from the live catalogue price.</span></p>
        </div>
      </aside>
    </div>
  );
}
