import { Link } from "react-router-dom";
import Button from "../components/ui/Button";
import "./InfoPages.css";

// The SEN371 team. Obusitse's entry links to his Belgium Campus profile;
// rel="noopener" because target="_blank" otherwise hands the new tab a
// reference back to this window.
const MAKERS = [
  { name: "Hanré Koen" },
  { name: "Zander Jacques Burger" },
  { name: "Obusitse Tlotlo Kodisang Bokaba" },
  { name: "Ryno Lourens" },
];

export default function MakersPage() {
  return (
    <div className="gv-page gv-info">
      <p className="gv-info__eyebrow">Our Makers</p>
      <h1 className="gv-info__title">The people who built the vault</h1>
      <p className="gv-info__lead">
        GadgetVault was designed and built by four Software Development students
        at Belgium Campus, from the database up to the storefront you are
        reading this on.
      </p>

      <section className="gv-info__section" aria-label="Team members">
        <ul className="gv-info__makers">
          {MAKERS.map((m) => (
            <li key={m.name} className="gv-info__maker">
              <p className="gv-info__maker-name">
                {m.href ? (
                  <a href={m.href} target="_blank" rel="noopener noreferrer">{m.name}</a>
                ) : m.name}
              </p>
              <p className="gv-info__maker-role">SEN371 · Belgium Campus</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="gv-info__actions">
        <Button as={Link} to="/catalog" size="lg">Browse the catalogue</Button>
        <Button as={Link} to="/about" size="lg" variant="outline">About GadgetVault</Button>
      </div>
    </div>
  );
}
