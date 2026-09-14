import { Link } from "react-router-dom";
import Button from "../components/ui/Button";
import "./InfoPages.css";

export default function AboutPage() {
  return (
    <div className="gv-page gv-info">
      <p className="gv-info__eyebrow">About Us</p>
      <h1 className="gv-info__title">A small vault, carefully stocked</h1>

      <div className="gv-info__body">
        <p className="gv-info__lead">
          GadgetVault is a curated store for high-performance computing, audio
          and optical hardware. We would rather carry a short catalogue we can
          stand behind than a long one nobody has handled.
        </p>
        <p>
          Every product listed here is priced by the server from the live
          catalogue, held in real stock, and dispatched with signature-required
          delivery. Orders exist only once payment has actually cleared, so
          nothing in your history is a maybe.
        </p>
        <p>
          The shop was designed and built from scratch by four students — the
          catalogue, the accounts, the cart, the payment integration and the
          admin tooling behind it. You can meet them on the{" "}
          <Link to="/makers">Our Makers</Link> page.
        </p>
      </div>

      {/* Stated plainly on the site itself, not only in the documentation:
          this is coursework, and the payment step is simulated. */}
      <p className="gv-info__note">
        GadgetVault is a university project built for SEN371 at Belgium Campus.
        It is not a trading business, and the payment step is a simulator — no
        money moves and no card details are stored.
      </p>

      <div className="gv-info__actions">
        <Button as={Link} to="/catalog" size="lg">Browse the catalogue</Button>
        <Button as={Link} to="/support/contact" size="lg" variant="outline">Contact us</Button>
      </div>
    </div>
  );
}
