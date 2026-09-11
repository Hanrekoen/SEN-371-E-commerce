# Milestone 4 — Person 2 (Hanre Koen)

**Scope:** shared layout partials (navbar / footer / page shell), the login &
register page, the checkout page, the admin dashboard, and the backend work
required to make the admin side function.

Design source: the team Figma prototype (*SEN371-Project*). Styling is plain
CSS driven by design tokens — no UI framework — so the tokens file is the
single place the palette and spacing scale are defined.

---

## 1. Front end

### 1.1 Design tokens

`client/src/styles/tokens.css` holds every colour, radius, font size and
spacing step as a CSS custom property. Nothing else in the client hard-codes a
hex value. `client/src/styles/base.css` layers the reset, the `.gv-page`
container, focus-visible rings and a `prefers-reduced-motion` guard on top.

Spacing follows a 4px scale (`--gv-1` = 4px … `--gv-20` = 80px). The nav height
is a token (`--gv-nav-h`) so pages can offset against it without guessing.

### 1.2 Partials

| File | Purpose |
| --- | --- |
| `components/layout/Layout.jsx` | Page shell: navbar, `<main>`, footer, skip link |
| `components/layout/Navbar.jsx` | Brand, primary nav, cart badge, account menu, mobile drawer |
| `components/layout/Footer.jsx` | Brand blurb, three link columns, social row, copyright |
| `components/layout/Logo.jsx` | Shield mark + wordmark, reused by nav and footer |

The navbar reads auth state from `AuthContext` and the item count from
`CartContext`, so it shows *Sign in* to anonymous visitors and the account
name plus a *Sign out* button once a session exists. The **Admin** link only
renders when `isAdmin` is true.

### 1.3 Shared UI primitives

`components/ui/` — `Button`, `Field`, `Alert`, `StatusPill`, `Sparkline`,
`TrendChart`, `Icons`. `Field` owns the label / input / hint / error grouping
and wires `aria-describedby` and `aria-invalid` so server-side validation
errors are announced, not just coloured red.

### 1.4 Pages

**Login / Register** (`pages/LoginPage.jsx`) — split hero and form panel, with
Sign In / Register as tabs over one panel. Password fields have a reveal
toggle. The "remember this device" checkbox and the Google / Apple buttons are
present in the design but not yet backed by anything, so they render disabled
with a `title` explaining why rather than pretending to work.

**Checkout** (`pages/CheckoutPage.jsx`) — two numbered sections (delivery,
payment) beside a sticky order summary. The submit button sits outside the
`<form>` element for layout reasons and is associated with it through
`form="gv-checkout-form"`, so Enter-to-submit and native validation still
work.

Payment failures map to distinct messages rather than one generic error:

| Response | Meaning shown to the shopper |
| --- | --- |
| `402` | The card was declined — try another card |
| `503` | The payment service is unreachable — nothing was charged |
| `422` | Field-level validation errors, rendered under the offending inputs |

**Order confirmation** (`pages/OrderConfirmationPage.jsx`) — order number,
line items, totals and next steps after a successful authorisation.

**Admin dashboard** (`pages/AdminDashboardPage.jsx`) — four KPI tiles with
sparklines and signed deltas, a seven-day revenue line chart, low-stock alerts
with restock actions, and the recent-order table with status pills.

### 1.5 Responsiveness

Verified with a scripted audit at 360, 390, 768, 1024 and 1440 px: every page
reports `document.scrollWidth === clientWidth`, i.e. no horizontal page
scroll at any width. The only element allowed to scroll sideways is the admin
order table, which sits in an `overflow-x: auto` wrapper with a visible hint
below it on narrow screens and is focusable so it can be scrolled by keyboard.

Two responsive defects the audit caught and that are now fixed:

- `.gv-page` used the `padding` shorthand, which silently zeroed vertical
  padding on every page.
- Grid children default to `min-width: auto`, so the 640px-wide admin order
  table stretched the whole page to 706px on a 390px viewport.

---

## 2. Back end (admin side)

### 2.1 New endpoints

All under `/api/admin`, guarded once by `router.use(authenticate,
requireRole("admin"))`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/admin/stats` | Dashboard payload: revenue, orders, customers, conversion, 7-day trend, low stock, recent orders |
| GET | `/admin/orders` | Paginated order list with customer detail |
| PATCH | `/admin/orders/:id/status` | Advance an order's status |
| GET | `/admin/products` | Product list including deactivated items |
| PATCH | `/admin/products/:id` | Update a product |
| POST | `/admin/products/:id/reactivate` | Undo a soft delete |
| PATCH | `/admin/products/:id/stock` | Adjust stock by a signed delta |

`GET /auth/me` was also added so the client can restore a session on reload
without a second round trip.

### 2.2 Defects found and fixed while wiring the admin side

These were pre-existing bugs in the product layer, each proved with a probe
before being changed:

1. `WRITABLE_FIELDS` listed `"categoryID"`, but the model field is
   `categoryId` — so the category was silently dropped on every create and
   update.
2. `findByIdById` — a typo that made the call throw rather than return.
3. `list()` always filtered to `isActive: true`, so an admin could never see a
   deactivated product, which made the soft delete irreversible in practice.

### 2.3 Tests

`server/tests/integration/admin.api.test.js` — 17 tests, including one pinning
each of the three defects above so they cannot regress. Full suite: **119
tests across 12 suites, all passing.**

---

## 3. Running it

```bash
cd client
npm install     # react-router-dom was added this milestone
npm run dev     # http://localhost:5173
```

The client expects the API at the base URL in `client/src/api/config.js`; the
server must be running for anything past the login page to load data.
