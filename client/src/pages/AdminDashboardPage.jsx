import { useCallback, useEffect, useState } from "react";
import Button from "../components/ui/Button";
import Alert from "../components/ui/Alert";
import Sparkline from "../components/ui/Sparkline";
import TrendChart from "../components/ui/TrendChart";
import StatusPill from "../components/ui/StatusPill";
import { getStats, adjustStock, updateOrderStatus } from "../api/admin.api";
import { formatCents, formatCentsCompact } from "../utils/money";
import { summaryMessage } from "../utils/apiErrors";
import "./AdminDashboardPage.css";

const RESTOCK_UNITS = 25;

// Wording for each move the API allows. The server decides which of these are
// offered for a given order; this only supplies the label.
const TRANSITION_LABELS = {
  paid: "Mark paid",
  shipped: "Mark shipped",
  delivered: "Mark delivered",
  cancelled: "Cancel",
};

function Delta({ value }) {
  if (value === null || value === undefined) return null;
  const up = value >= 0;
  // The sign is in the text, so direction never rests on colour alone.
  return (
    <span className={`gv-kpi__delta ${up ? "is-up" : "is-down"}`}>
      {up ? "+" : ""}{value}%
    </span>
  );
}

function StatTile({ label, value, delta, series, tone }) {
  return (
    <article className="gv-kpi">
      <header className="gv-kpi__head">
        <h3 className="gv-kpi__label">{label}</h3>
        <Delta value={delta} />
      </header>
      <div className="gv-kpi__body">
        <p className="gv-kpi__value">{value}</p>
        <Sparkline values={series} tone={tone} label={`${label} over the last 7 days`} />
      </div>
    </article>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      setStats(await getStats());
      setError(null);
    } catch (err) {
      setError(summaryMessage(err, "Could not load dashboard figures."));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function restock(productId) {
    setBusyId(productId);
    try {
      await adjustStock(productId, RESTOCK_UNITS);
      await load();
    } catch (err) {
      setError(summaryMessage(err, "Restock failed."));
    } finally {
      setBusyId(null);
    }
  }

  // Cancelling returns stock to the catalogue, so it is confirmed first.
  async function moveOrder(order, next) {
    if (next === "cancelled") {
      const yes = window.confirm(
        `Cancel ${order.orderNumber}? The items go back into stock and the order cannot be reopened.`
      );
      if (!yes) return;
    }
    setBusyId(order.id);
    setNotice(null);
    try {
      await updateOrderStatus(order.id, next);
      setNotice(`${order.orderNumber} is now ${next}.`);
      await load();
    } catch (err) {
      setError(summaryMessage(err, `Could not move ${order.orderNumber} to ${next}.`));
    } finally {
      setBusyId(null);
    }
  }

  if (error && !stats) {
    return (
      <div className="gv-page gv-admin">
        <Alert tone="danger" title="Dashboard unavailable">{error}</Alert>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="gv-page gv-admin">
        <p className="gv-admin__loading" role="status">Loading control vault…</p>
      </div>
    );
  }

  return (
    <div className="gv-page gv-admin">
      <header className="gv-admin__head">
        <div>
          <h1>HQ Control Vault</h1>
          <p className="gv-muted">Live status and diagnostic logs of sales drops.</p>
        </div>
        <div className="gv-admin__head-actions">
          <Button variant="ghost" onClick={load}>Refresh</Button>
          <Button>Create new drop</Button>
        </div>
      </header>

      {error && <div className="gv-admin__alert"><Alert tone="warning">{error}</Alert></div>}
      {notice && <div className="gv-admin__alert"><Alert tone="success">{notice}</Alert></div>}

      <section className="gv-admin__kpis" aria-label="Key figures">
        <StatTile
          label="Daily Revenue"
          value={formatCentsCompact(stats.revenue.todayCents)}
          delta={stats.revenue.deltaPct}
          series={stats.revenue.series}
          tone={stats.revenue.deltaPct >= 0 ? "success" : "warning"}
        />
        <StatTile
          label="Orders Today"
          value={stats.orders.today}
          delta={stats.orders.deltaPct}
          series={stats.orders.series}
          tone="primary"
        />
        <StatTile
          label="Orders per Customer"
          value={`${stats.conversion.rate}%`}
          series={stats.orders.series}
          tone="accent"
        />
        <StatTile
          label="Vault Customers"
          value={stats.customers.total.toLocaleString()}
          series={stats.revenue.series}
          tone="success"
        />
      </section>

      <section className="gv-admin__middle">
        <article className="gv-admin__card gv-admin__chart">
          <header className="gv-admin__card-head">
            <h2>Drop Revenue Trend (Last 7 Days)</h2>
            <span className="gv-admin__card-meta">
              {stats.customers.newToday} new {stats.customers.newToday === 1 ? "customer" : "customers"} today
            </span>
          </header>
          <TrendChart points={stats.trend} />
        </article>

        <article className="gv-admin__card">
          <header className="gv-admin__card-head">
            <h2>Low Stock Alerts</h2>
            <span className="gv-admin__card-meta">at or below {stats.thresholds.lowStock}</span>
          </header>

          {stats.lowStock.length === 0 ? (
            <p className="gv-admin__empty">Every active product is above the threshold.</p>
          ) : (
            <ul className="gv-admin__stock">
              {stats.lowStock.map((p) => (
                <li key={p.id}>
                  {p.image
                    ? <img src={p.image} alt="" className="gv-admin__thumb" loading="lazy" />
                    : <span className="gv-admin__thumb gv-admin__thumb--blank" aria-hidden="true" />}
                  <div className="gv-admin__stock-copy">
                    <p className="gv-admin__stock-name">{p.name}</p>
                    <p className="gv-admin__stock-count">
                      {p.stockQty} {p.stockQty === 1 ? "unit" : "units"} left in secure storage
                    </p>
                  </div>
                  <Button
                    size="sm" variant="outline"
                    loading={busyId === p.id}
                    onClick={() => restock(p.id)}
                  >
                    Restock
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="gv-admin__card">
        <header className="gv-admin__card-head">
          <h2>Active Order Stream</h2>
          <span className="gv-admin__card-meta">{stats.orders.total} orders all time</span>
        </header>

        {stats.recentOrders.length === 0 ? (
          <p className="gv-admin__empty">No orders yet.</p>
        ) : (
          <>
          <div className="gv-admin__table-wrap" tabIndex={0} role="region" aria-label="Recent orders">
            <table className="gv-admin__table">
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Items</th>
                  <th scope="col" className="is-right">Total</th>
                  <th scope="col" className="is-right">Status</th>
                  <th scope="col" className="is-right">Move to</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((o) => (
                  <tr key={o.id}>
                    <th scope="row">{o.orderNumber}</th>
                    <td className="gv-admin__email">{o.customerEmail || "—"}</td>
                    <td>
                      {o.itemSummary}
                      {o.itemCount > 1 && <span className="gv-admin__more"> +{o.itemCount - 1}</span>}
                    </td>
                    <td className="is-right">{formatCents(o.totalCents)}</td>
                    <td className="is-right"><StatusPill status={o.status} /></td>
                    <td className="is-right">
                      {(o.allowedTransitions || []).length === 0 ? (
                        <span className="gv-admin__final">Final</span>
                      ) : (
                        <div className="gv-admin__moves">
                          {o.allowedTransitions.map((next) => (
                            <Button
                              key={next}
                              size="sm"
                              variant={next === "cancelled" ? "ghost" : "outline"}
                              loading={busyId === o.id}
                              onClick={() => moveOrder(o, next)}
                            >
                              {TRANSITION_LABELS[next] || next}
                            </Button>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="gv-admin__scroll-hint">Scroll sideways for totals, status and actions.</p>
          </>
        )}
      </section>
    </div>
  );
}
