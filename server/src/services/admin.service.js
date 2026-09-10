"use strict";
const orderRepository = require("../repositories/order.repository");
const productRepository = require("../repositories/product.repository");
const userRepository = require("../repositories/user.repository");
const { toProductDTO } = require("../dtos/product.dto");

// Dashboard figures. Every number here is derived from real data - where a
// panel in the design implies something the API cannot honestly measure, the
// closest true metric is returned rather than an invented one.

const LOW_STOCK_THRESHOLD = 5;
// Money actually taken: a pending order is not authorised yet, and a
// cancelled one had its stock returned.
const EARNING_STATUSES = ["paid", "shipped", "delivered"];
const SERIES_DAYS = 7;

// Percentage change of the last point against the one before it.
function deltaPct(series, key) {
  if (series.length < 2) return 0;
  const previous = series[series.length - 2][key];
  const latest = series[series.length - 1][key];
  if (previous === 0) return latest > 0 ? 100 : 0;
  return Number((((latest - previous) / previous) * 100).toFixed(1));
}

function startOfToday(now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function stats({ now = new Date() } = {}) {
  const [series, byStatus, lowStockDocs, recent, totalCustomers, newCustomers] =
    await Promise.all([
      orderRepository.dailySeries(SERIES_DAYS, now),
      orderRepository.countByStatus(),
      productRepository.findLowStock(LOW_STOCK_THRESHOLD, 5),
      orderRepository.recentWithCustomer(5),
      userRepository.countCustomers(),
      userRepository.countCreatedSince(startOfToday(now)),
    ]);

  const today = series[series.length - 1] || { revenueCents: 0, orders: 0 };
  const totalOrders = Object.values(byStatus).reduce((sum, n) => sum + n, 0);
  const paidOrders = EARNING_STATUSES.reduce((sum, s) => sum + (byStatus[s] || 0), 0);

  // Orders per customer, as a percentage. Named "conversion" in the design;
  // a true visit-to-order rate needs analytics the API does not collect, and
  // this is the closest thing that is actually true.
  const conversionRate = totalCustomers > 0
    ? Number(((paidOrders / totalCustomers) * 100).toFixed(1))
    : 0;

  return {
    revenue: {
      todayCents: today.revenueCents,
      deltaPct: deltaPct(series, "revenueCents"),
      series: series.map((d) => d.revenueCents),
    },
    orders: {
      today: today.orders,
      deltaPct: deltaPct(series, "orders"),
      series: series.map((d) => d.orders),
      byStatus,
      total: totalOrders,
    },
    customers: { total: totalCustomers, newToday: newCustomers },
    conversion: { rate: conversionRate, paidOrders },
    trend: series,
    lowStock: lowStockDocs.map((p) => {
      const dto = toProductDTO(p, { isAdmin: true });
      return { id: dto.id, name: dto.name, slug: dto.slug, stockQty: dto.stockQty, image: dto.images[0] || null };
    }),
    recentOrders: recent.map((o) => ({
      id: String(o._id),
      orderNumber: o.orderNumber,
      customerEmail: o.userId && o.userId.email ? o.userId.email : null,
      itemSummary: o.items[0] ? o.items[0].name : "-",
      itemCount: o.items.length,
      totalCents: o.totalCents,
      status: o.status,
      createdAt: o.createdAt,
    })),
    thresholds: { lowStock: LOW_STOCK_THRESHOLD },
  };
}

module.exports = { stats, LOW_STOCK_THRESHOLD, deltaPct };
