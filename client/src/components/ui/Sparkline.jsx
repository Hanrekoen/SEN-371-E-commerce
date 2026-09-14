import { useId } from "react";
import "./Sparkline.css";

// A 7-point trend for a stat tile. No axes or tooltip by design - this shows
// shape only, and the signed delta beside it gives direction in words, not
// by colour alone.
export default function Sparkline({ values = [], tone = "primary", label }) {
  const gradientId = useId();
  const w = 100;
  const h = 34;
  const pad = 3;

  if (!values.length) return <div className="gv-spark" aria-hidden="true" />;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0;

  const points = values.map((v, i) => {
    const x = pad + i * step;
    const y = pad + (h - pad * 2) * (1 - (v - min) / span);
    return [x, y];
  });

  const line = points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = `${line} ${w - pad},${h} ${pad},${h}`;

  return (
    <svg
      className={`gv-spark gv-spark--${tone}`}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label || "Trend over the last 7 days"}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradientId})`} />
      <polyline
        points={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
