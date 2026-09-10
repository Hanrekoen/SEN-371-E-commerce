// The API speaks integer cents everywhere. Formatting is the only place the
// client is allowed to divide by 100 - never for arithmetic.
export function formatCents(cents, currency = "USD") {
  const value = Number.isFinite(cents) ? cents / 100 : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

// Compact form for headline figures: $48,250 rather than $48,250.00
export function formatCentsCompact(cents, currency = "USD") {
  const value = Number.isFinite(cents) ? cents / 100 : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "2-digit", year: "numeric",
  });
}
