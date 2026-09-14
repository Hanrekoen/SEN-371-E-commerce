import { Link } from "react-router-dom";
import Button from "../components/ui/Button";
import "./InfoPages.css";

// Reached from the footer and from "Forgot password?" on the sign-in form,
// which is why the password line is here rather than buried.
export default function ContactPage() {
  return (
    <div className="gv-page gv-info">
      <p className="gv-info__eyebrow">Contact Vault</p>
      <h1 className="gv-info__title">Get in touch</h1>
      <p className="gv-info__lead">
        Questions about an order, a product, or an account — this is the way
        through. We answer on weekdays.
      </p>

      <section className="gv-info__section" aria-label="Contact details">
        <dl className="gv-info__contact">
          <div>
            <dt>Support</dt>
            <dd><a href="mailto:support@gadgetvault.co.za">support@gadgetvault.co.za</a></dd>
          </div>
          <div>
            <dt>Orders</dt>
            <dd><a href="mailto:orders@gadgetvault.co.za">orders@gadgetvault.co.za</a></dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd><a href="tel:+27120040000">+27 12 004 0000</a></dd>
          </div>
          <div>
            <dt>Hours</dt>
            <dd>Monday to Friday, 09:00 – 17:00 (SAST)</dd>
          </div>
          <div>
            <dt>Address</dt>
            <dd>138 Berg Ave, Akasia, Gauteng, 0118, South Africa</dd>
          </div>
        </dl>
      </section>

      <section className="gv-info__section">
        <h2 className="gv-info__section-title">Forgotten password</h2>
        <p style={{ color: "var(--gv-text-muted)", lineHeight: 1.7 }}>
          Self-service password reset is not built yet. Email support from the
          address on your account and we will reset it for you.
        </p>
      </section>

      <p className="gv-info__note">
        GadgetVault is a university project built for SEN371 at Belgium Campus.
        The details above are part of the prototype rather than a live support
        desk.
      </p>

      <div className="gv-info__actions">
        <Button as={Link} to="/orders" size="lg">Track an order</Button>
        <Button as={Link} to="/catalog" size="lg" variant="outline">Back to the catalogue</Button>
      </div>
    </div>
  );
}
