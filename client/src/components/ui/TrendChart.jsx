import { useMemo, useRef, useState } from "react";
import { formatCentsCompact } from "../../utils/money";
import "./TrendChart.css";

// One series, so no legend - the card title names it. Grid and axes are
// deliberately recessive; the line is the only thing drawn at full strength.
// A crosshair and tooltip follow the pointer, and the same numbers are
// available as a table for screen readers and for anyone who cannot hover.
export default function TrendChart({ points = [], height = 260 }) {
  const [hover, setHover] = useState(null);
  const svgRef = useRef(null);

  const w = 720;
  const h = height;
  const padX = 16;
  const padTop = 20;
  const padBottom = 28;

  const geometry = useMemo(() => {
    if (points.length === 0) return null;
    const values = points.map((p) => p.revenueCents);
    const max = Math.max(...values, 1);
    const min = 0; // revenue starts at zero, so the shape is not exaggerated
    const span = max - min || 1;
    const step = points.length > 1 ? (w - padX * 2) / (points.length - 1) : 0;

    const coords = points.map((p, i) => {
      const x = padX + i * step;
      const y = padTop + (h - padTop - padBottom) * (1 - (p.revenueCents - min) / span);
      return { ...p, x, y, index: i };
    });
    return { coords, max, step };
  }, [points, h]);

  if (!geometry) {
    return <p className="gv-trend__empty">No revenue recorded in the last seven days.</p>;
  }

  const { coords, max, step } = geometry;
  const line = coords.map((c) => `${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(" ");
  const gridYs = [0, 0.25, 0.5, 0.75, 1].map((t) => padTop + (h - padTop - padBottom) * t);

  function onMove(e) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * w;
    const index = Math.max(0, Math.min(coords.length - 1, Math.round((x - padX) / (step || 1))));
    setHover(coords[index]);
  }

  return (
    <div className="gv-trend">
      <svg
        ref={svgRef}
        className="gv-trend__svg"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label={`Revenue over the last ${points.length} days, peaking at ${formatCentsCompact(max)}`}
      >
        {gridYs.map((y, i) => (
          <line key={i} className="gv-trend__grid" x1={padX} x2={w - padX} y1={y} y2={y} />
        ))}

        <polyline
          className="gv-trend__line"
          points={line}
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {hover && (
          <g>
            <line className="gv-trend__crosshair" x1={hover.x} x2={hover.x} y1={padTop} y2={h - padBottom} />
            {/* A surface-coloured ring keeps the marker readable wherever the
                line sits behind it. */}
            <circle className="gv-trend__ring" cx={hover.x} cy={hover.y} r="6" />
            <circle className="gv-trend__dot" cx={hover.x} cy={hover.y} r="3.5" />
          </g>
        )}
      </svg>

      {hover && (
        <div
          className="gv-trend__tip"
          style={{ left: `${(hover.x / w) * 100}%` }}
          role="status"
        >
          <span className="gv-trend__tip-value">{formatCentsCompact(hover.revenueCents)}</span>
          <span className="gv-trend__tip-meta">
            {new Date(hover.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            {" · "}
            {hover.orders} {hover.orders === 1 ? "order" : "orders"}
          </span>
        </div>
      )}

      <table className="gv-sr">
        <caption>Revenue by day</caption>
        <thead><tr><th scope="col">Date</th><th scope="col">Revenue</th><th scope="col">Orders</th></tr></thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.date}>
              <th scope="row">{p.date}</th>
              <td>{formatCentsCompact(p.revenueCents)}</td>
              <td>{p.orders}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
