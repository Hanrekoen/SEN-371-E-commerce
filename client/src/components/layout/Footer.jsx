import { Link } from "react-router-dom";
import Logo from "./Logo";
import { InstagramIcon, TwitterIcon, FacebookIcon, YoutubeIcon } from "../ui/Icons";
import "./Footer.css";

const COLUMNS = [
  { title: "Products", links: [
      { label: "Computers", to: "/catalog?category=computers" },
      { label: "Audio Gear", to: "/catalog?category=audio" },
      { label: "Cameras", to: "/catalog?category=cameras" },
      { label: "Wearables", to: "/catalog?category=wearables" },
  ]},
  // Only destinations that exist. Warranty, guides, blog and affiliates were
  // links to pages nobody had built, so every one of them landed on the 404.
  { title: "Support", links: [
      { label: "Track Order", to: "/orders" },
      { label: "Contact Vault", to: "/support/contact" },
  ]},
  { title: "Company", links: [
      { label: "About Us", to: "/about" },
      { label: "Our Makers", to: "/makers" },
  ]},
];

const SOCIAL = [
  { label: "Instagram", Icon: InstagramIcon },
  { label: "Twitter", Icon: TwitterIcon },
  { label: "Facebook", Icon: FacebookIcon },
  { label: "YouTube", Icon: YoutubeIcon },
];

export default function Footer() {
  return (
    <footer className="gv-footer">
      <div className="gv-page">
        <div className="gv-footer__top">
          <div className="gv-footer__brand">
            <Logo size="lg" />
            <p className="gv-footer__blurb">
              Curated, high-performance tech hardware for collectors and
              professionals. Experience the next tier of computing, audio, and
              mobile gear.
            </p>
          </div>

          <div className="gv-footer__columns">
            {COLUMNS.map((col) => (
              <nav key={col.title} className="gv-footer__col" aria-label={col.title}>
                <h4 className="gv-footer__col-title">{col.title}</h4>
                <ul>
                  {col.links.map((l) => (
                    <li key={l.label}><Link to={l.to}>{l.label}</Link></li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="gv-footer__bottom">
          <p className="gv-footer__copy">
            © {new Date().getFullYear()} GadgetVault. Structured with precision.
          </p>
          <ul className="gv-footer__social">
            {SOCIAL.map(({ label, Icon }) => (
              <li key={label}>
                {/* Placeholder destinations: the brand has no live accounts.
                    Rendered as buttons so they are not dead links. */}
                <button type="button" title={`${label} — not yet connected`} aria-label={label}>
                  <Icon />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
