# GadgetVault — SEN371 Project

A full-stack e-commerce web application built for Software Engineering 371
(Belgium Campus iTversity). Single-vendor store: customers browse a catalogue,
manage a cart and place orders through a simulated card gateway; an
administrator maintains products and categories and advances orders through
their lifecycle.

**Stack:** React 18 (Vite) · Node.js + Express 5 · MongoDB Atlas (Mongoose) · JWT

**Live demo:** <https://hanrekoen.github.io/SEN-371-E-commerce/> — client on
GitHub Pages, API on Render, database on Atlas. The free API tier sleeps when
idle, so the first request after a quiet spell takes up to a minute.

**Status:** Milestones 1–5 complete. 304 automated tests, all passing.

---

## Prerequisites

- Node.js 20 or later
- A MongoDB Atlas cluster (the free M0 tier is enough)
- Git

## Setup

The repository holds two Node packages: the API (`server/`) and the React
client (`client/`). Each has its own `package.json` and needs its own install.
The mock payment gateway is no longer a third service — it runs inside the API
process, on its own port, started automatically.

```bash
git clone https://github.com/Hanrekoen/SEN-371-E-commerce.git
cd SEN-371-E-commerce

cd server && npm install && cd ..
cd client && npm install && cd ..
```

Copy the example environment file and fill it in:

```bash
cp .env.example server/.env
```

Generate the two JWT secrets — run this twice and use different values:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Environment variables

| Variable | Purpose |
|---|---|
| `NODE_ENV` | `development`, `test` or `production` — controls error verbosity and cookie flags |
| `PORT` | API port (default 5000) |
| `CLIENT_ORIGIN` | Allowed CORS origin, e.g. `http://localhost:5173`. Scheme and host only — no path, no trailing slash |
| `MONGODB_URI` | Atlas connection string, including the database name |
| `JWT_ACCESS_SECRET` | Signs access tokens |
| `JWT_REFRESH_SECRET` | Signs refresh tokens — must differ from the access secret |
| `ACCESS_TOKEN_TTL` | Access token lifetime (default `15m`) |
| `REFRESH_TOKEN_TTL` | Refresh token lifetime (default `7d`) |

The server refuses to start if `MONGODB_URI` or either secret is missing.

Payment integration (Milestone 3). Every one of these has a default that
already works on a development machine, so none of them needs setting locally —
they are listed because a deployment does need them.

| Variable | Purpose |
|---|---|
| `PAYMENT_PROVIDER` | `mock` makes the real HTTP call, `stub` answers in-process (tests) |
| `PAYMENT_EMBEDDED` | `true` (default) starts the gateway inside the API process; `false` if you host it yourself |
| `PAYMENT_GATEWAY_PORT` | Port the embedded gateway listens on (default 5001, bound to localhost) |
| `PAYMENT_API_URL` | Gateway base URL (default `http://localhost:5001`) |
| `PAYMENT_API_KEY` | Must equal the key the gateway reads |
| `PAYMENT_TIMEOUT_MS` | How long to wait for the provider (default `5000`) |
| `PAYMENT_CURRENCY` | ISO code sent with the authorisation (default `ZAR`) |
| `TRUST_PROXY` | `true` only when a reverse proxy sits in front of the API — see `docs/SECURITY.md`, A07 |
| `RATE_LIMIT_DISABLED` | `true` turns off rate limiting. Set by the Playwright config; never set it in production |

The client reads two build-time variables:

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Where the client sends API calls (default `http://localhost:5000/api`) |
| `VITE_BASE` | Sub-path the client is served from, e.g. `/SEN-371-E-commerce/` on GitHub Pages (default `/`) |

## Running

Two processes, each in its own terminal. The payment gateway starts with the
API — there is no third service to run.

```bash
# terminal 1 - API, port 5000 (gateway on 5001)
cd server && npm run seed     # first run only: collections and sample data
cd server && npm run dev      # auto-reload
                              # npm start  - without auto-reload

# terminal 2 - React client, port 5173
cd client && npm run dev
```

Confirm each is up:

| Service | Check |
|---|---|
| API | `GET http://localhost:5000/api/health` |
| API documentation | open `http://localhost:5000/api/docs` (Swagger UI) |
| Client | open `http://localhost:5173` |

### Seeded accounts

All seeded users share the password `Password123!`.

| Email | Role |
|---|---|
| `Hanre.admin@sen371.test` | admin |
| `Lebo@sen371.test` | customer |

The seed also creates the other three admin accounts, further customers, one
populated cart and one paid order.

---

## Tests

304 automated tests across three runners, all passing. Both coverage floors are
enforced in configuration, so coverage cannot silently fall.

| Suite | Tool | Tests | Statement coverage |
|---|---|---|---|
| API | Jest + supertest | 140 | 77.7% |
| Client | Vitest + React Testing Library | 151 | 57.5% |
| End-to-end | Playwright | 13 | — |

```bash
# API
cd server
npm test                  # all levels
npm run test:unit         # 38
npm run test:integration  # 70
npm run test:function     # 32
npm run test:coverage     # + coverage, fails under the floor

# Client
cd client
npm test                  # 151 unit and component tests
npm run test:coverage

# End-to-end - needs the API and the client running
cd client
npx playwright install    # first run only
npm run test:e2e          # 13 browser journeys
npm run test:e2e:report   # open the HTML report
```

The five test levels, the coverage analysis and the TDD record are in
[`docs/testing/`](docs/testing/):
[`TEST_REPORT.md`](docs/testing/TEST_REPORT.md),
[`TDD_LOG.md`](docs/testing/TDD_LOG.md), the usability-study pack, and the
Milestone 5 report as a Word document.

---

## API

Base path `/api`. Interactive documentation at `/api/docs`, raw OpenAPI spec at
`/api/openapi.json`. Every response uses the same envelope:

```json
{ "success": true, "data": {}, "error": null, "meta": null }
```

Errors return `success: false` with `error.code`, `error.message` and optional
`error.details`. Status codes: 200, 201, 204, 400 validation, 401
unauthenticated, 403 unauthorised, 404 not found, 409 conflict, 422 rule
violation, 500.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | public | Liveness check |
| POST | `/auth/register` | public | Create a customer account |
| POST | `/auth/login` | public | Authenticate, returns an access token |
| POST | `/auth/refresh` | refresh cookie | Rotate tokens |
| POST | `/auth/logout` | any session | Invalidate outstanding refresh tokens |
| GET | `/auth/me` | any session | The current user |
| GET | `/products` | public | List with search, brand and category filters, pagination |
| GET | `/products/brands` | public | Distinct brand names |
| GET | `/products/:slug` | public | Product detail |
| POST / PUT / DELETE | `/products[/:id]` | admin | Create, update, deactivate |
| GET | `/categories` | public | List categories |
| GET | `/categories/:slug` | public | Category detail |
| POST / PUT / DELETE | `/categories[/:id]` | admin | Create, update, delete |
| GET | `/cart` | customer | The current cart |
| POST | `/cart/items` | customer | Add an item |
| PATCH | `/cart/items/:productId` | customer | Change a quantity |
| DELETE | `/cart/items/:productId` | customer | Remove an item |
| DELETE | `/cart` | customer | Empty the cart |
| POST | `/orders` | customer | Checkout |
| GET | `/orders` | customer | Own order history |
| GET | `/orders/:id` | customer | Own order detail |
| GET | `/admin/stats` | admin | Dashboard figures and recent activity |
| GET | `/admin/products` | admin | All products, deactivated ones included |
| PATCH | `/admin/products/:id/stock` | admin | Adjust stock |
| PATCH | `/admin/products/:id/reactivate` | admin | Undo a deactivation |
| GET | `/admin/orders` | admin | All orders, filterable by status |
| PATCH | `/admin/orders/:id/status` | admin | Advance order status |

Authenticated requests send `Authorization: Bearer <accessToken>`. The refresh
token is set as an httpOnly cookie scoped to `/api/auth` and is never returned
in a response body. It is `SameSite=strict` in development and `SameSite=none;
Secure` in production, because the deployed client and API sit on different
origins.

Money is handled as integer cents everywhere — in the database, over the wire
and in the tests — and formatted as ZAR only at the point of display.

---

## Project structure

```
server/src/
  config/         environment loading, MongoDB connection (Singleton)
  models/         Mongoose schemas, validation, indexes
  repositories/   all query construction - the only layer aware of Mongoose
  services/       business rules: totals, stock, order lifecycle, auth
  services/payment/  the payment Strategy: contract, HTTP provider, test stub
  gateway/        the mock card authorisation service, hosted in-process
  controllers/    HTTP only - parse, call one service, format the response
  dtos/           response mappers - no endpoint returns a raw Mongoose document
  routes/         URL to controller mapping
  middleware/     authenticate, authorise, validate, sanitise, rate limit, errors
  errors/         AppError and its subclasses
  utils/          response envelope, asyncHandler, jwt, password
server/tests/     unit, integration and function suites
client/src/
  api/            the API facade - base URL, Bearer header, refresh, errors
  context/        AuthContext and CartContext
  components/     layout partials, catalog, checkout, shared UI primitives
  pages/          the routed screens
  styles/         design tokens and base styles
  utils/          money, product images, API error helpers
client/e2e/       Playwright journeys
docs/             System Plan, diagrams, minutes, SECURITY.md, DEPLOYMENT.md
docs/testing/     test report, TDD log, usability pack
.github/workflows/  builds the client and publishes it to GitHub Pages
```

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the layering rules and the design
patterns in use.

## Deployment

[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) is a step-by-step guide to hosting
the whole application for free: the client on GitHub Pages, the API on a Render
web service, the database on Atlas M0, with the payment gateway running inside
the API. Pushing to `main` rebuilds and republishes the client automatically.

---

## Team

Roles rotate between milestones.

| Member | Standing responsibility (Milestones 1–2) |
|---|---|
| Hanre Koen | Architecture, database, products and orders |
| Ryno Lourens | Authentication and security |
| Zander Jacques Burger | Frontend architecture, cart |
| Obusitse Tlotlo Kodisang Bokaba | UI/UX, error handling, categories, QA and release |

### Milestone 3 — Code Review: API Integration

Roles were reassigned for this milestone, so the work in it does not follow the
table above. Each person owned the resource named below, including its
validation and response DTOs.

| Member | Role | Owns | Standalone piece |
|---|---|---|---|
| Obusitse Tlotlo Kodisang Bokaba | Person 1 — Backend & Data | products, orders | Wires the payment call into checkout |
| **Hanre Koen** | Person 2 — API & Security | auth, security | Payment gateway integration; security middleware; OWASP review |
| Ryno Lourens | Person 3 — Frontend Architecture | cart | Reviews the API contract as its consumer; starts the React API client |
| Zander Jacques Burger | Person 4 — UI/UX, QA & Release | categories | Swagger / OpenAPI documentation; deployment configuration |

Documentation: [`docs/SECURITY.md`](docs/SECURITY.md) (OWASP Top Ten review),
[`docs/CHECKOUT_INTEGRATION.md`](docs/CHECKOUT_INTEGRATION.md) (handover from
Person 2 to Person 1),
[`docs/PERSON2_MILESTONE3.md`](docs/PERSON2_MILESTONE3.md).

### Milestone 4 — Front End

Person 2 delivered the shared layout partials, the login and register page, the
checkout page, the admin dashboard, and the backend work the admin side needed.
See [`docs/PERSON2_MILESTONE4.md`](docs/PERSON2_MILESTONE4.md).

### Milestone 5 — Testing and Quality Assurance

Person 2 delivered the test strategy, the automated suites at all five levels,
the TDD record and the coverage analysis. See
[`docs/testing/TEST_REPORT.md`](docs/testing/TEST_REPORT.md).
