import "./StatusPill.css";

// Order statuses, mapped to a tone. Anything unrecognised falls back to
// neutral rather than rendering an unstyled pill.
const TONES = {
  pending: "warning",
  paid: "info",
  shipped: "info",
  delivered: "success",
  completed: "success",
  cancelled: "danger",
  processing: "info",
};

export default function StatusPill({ status }) {
  const tone = TONES[String(status).toLowerCase()] || "neutral";
  return <span className={`gv-pill gv-pill--${tone}`}>{status}</span>;
}
