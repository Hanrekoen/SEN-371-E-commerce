import { Link } from "react-router-dom";
import { ShieldIcon } from "../ui/Icons";
import "./Logo.css";

export default function Logo({ size = "md", to = "/" }) {
  return (
    <Link to={to} className={`gv-logo gv-logo--${size}`} aria-label="GadgetVault home">
      <span className="gv-logo__mark" aria-hidden="true"><ShieldIcon /></span>
      <span className="gv-logo__word">
        GADGET<span className="gv-logo__word-accent">VAULT</span>
      </span>
    </Link>
  );
}
