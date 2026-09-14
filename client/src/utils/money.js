// The API speaks integer cents everywhere. Formatting is the only place the
// client is allowed to divide by 100 - never for arithmetic.

// Must match PAYMENT_CURRENCY on the server (config/env.js) - the payment is
// authorised in this currency, so any other one shown here would be a lie.
export const CURRENCY = "ZAR";
const LOCALE = "en-ZA";

export function formatCents(cents, currency = CURRENCY) {
  const value = Number.isFinite(cents) ? cents / 100 : 0;
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

// Compact form for headline figures: R48 250 rather than R48 250,00
export function formatCentsCompact(cents, currency = CURRENCY) {
  const value = Number.isFinite(cents) ? cents / 100 : 0;
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString(LOCALE, {
    day: "2-digit", month: "short", year: "numeric",
  });
}
