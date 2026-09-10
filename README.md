# GadgetVault — SEN371 Project

A full-stack e-commerce web application built for Software Engineering 371
(Belgium Campus iTversity). Single-vendor store: customers browse a catalogue,
manage a cart and place orders; an administrator maintains products and
advances orders through their lifecycle.

**Stack:** React (Vite) · Node.js + Express · MongoDB Atlas (Mongoose) · JWT

---

## Prerequisites

- Node.js 20 or later
- A MongoDB Atlas cluster (the free M0 tier is enough)
- Git

## Setup

The repository holds three Node packages: the API (`server/`), the mock
payment gateway the API integrates with (`payment-gateway/`), and the React
client (`client/`). Each has its own `package.json` and needs its own install.

```bash
git clone https://github.com/Hanrekoen/SEN-371-E-commerce.git
cd SEN-371-E-commerce

cd server          && npm install && cd ..
cd payment-gateway && npm install && cd ..
cd client          && npm install && cd ..
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
| `NODE_ENV` | `development`, `test` or `production` — controls error verbosity |
| `PORT` | API port (default 5000) |
| `CLIENT_ORIGIN` | Allowed CORS origin, e.g. `http://localhost:5173` |
| `MONGODB_URI` | Atlas connection string, including the database name |
| `JWT_ACCESS_SECRET` | Signs access tokens |
| `JWT_REFRESH_SECRET` | Signs refresh tokens — must differ from the access secret |
| `ACCESS_TOKEN_TTL` | Access token lifetime (default `15m`) |
| `REFRESH_TOKEN_TTL` | Refresh token lifetime (default `7d`) |

The server refuses to start if `MONGODB_URI` or either secret is missing.

Payment integration (Milestone 3). Every one of these has a default that
already matches `payment-gateway/`, so on a normal development machine none
of them needs setting — they are listed because a deployment does need them.

| Variable | Purpose |
|---|---|
| `PAYMENT_PROVIDER` | `mock` makes the real HTTP call, `stub` answers in-process (tests) |
| `PAYMENT_API_URL` | Gateway base URL (default `http://localhost:5001`) |
| `PAYMENT_API_KEY` | Must equal `GATEWAY_API_KEY` in the gateway |
| `PAYMENT_TIMEOUT_MS` | How long to wait for the provider (default `5000`) |
| `PAYMENT_CURRENCY` | ISO code sent with the authorisation (default `ZAR`) |
| `TRUST_PROXY` | `true` only when a reverse proxy sits in front of the API — see `docs/SECURITY.md`, A07 |

The gateway reads `GATEWAY_PORT`, `GATEWAY_API_KEY` and `GATEWAY_SLOW_MS`;
all three have working defaults. See `payment-gateway/README.md`.

## Running

Three processes, each in its own terminal. The API and the gateway are both
needed for checkout: without the gateway running, a checkout returns
**503 Service Unavailable** — correctly, because the payment provider really
is unreachable.

```bash
# terminal 1 - payment gateway, port 5001
cd payment-gateway && npm start

# terminal 2 - API, port 5000
cd server && npm run seed     # first run only: collections and sample data
cd server && npm run dev      # auto-reload
                              # npm start  - without auto-reload
                              # npm test   - the Jest suite

# terminal 3 - React client, port 5173
cd client && npm run dev
```

Confirm each is up:

| Service | Check |
|---|---|
| API | `GET http://localhost:5000/api/health` |
| Payment gateway | `GET http://localhost:5001/health` |
| Client | open `http://localhost:5173` |

The client is a Vite scaffold with the API facade wired up, not the finished
interface — the thirteen screens are Milestone 4.

### Tests

```bash
cd server && npm test
```

Eight suites. The payment integration suite starts the real gateway on an
ephemeral port and drives the provider against it over HTTP; if
`payment-gateway/` has not been installed, that suite skips itself with a
message rather than failing.

### Seeded accounts

All seeded users share the password `Password123!`.

| Email | Role |
|---|---|
| `Hanre.admin@sen371.test` | admin |

The seed also creates customer accounts, one populated cart and one paid order.

---

## API

Base path `/api`. Every response uses the same envelope:

```json
{ "success": true, "data": {}, "error": null, "meta": null }
```

Errors return `success: false` with `error.code`, `error.message` and optional
`error.details`. Status codes: 200, 201, 204, 400 validation, 401
unauthenticated, 403 unauthorised, 404 not found, 409 conflict, 422 rule
violation, 500.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/register` | public | Create a customer account |
| POST | `/auth/login` | public | Authenticate, returns an access token |
| POST | `/auth/refresh` | refresh cookie | Rotate tokens |
| POST | `/auth/logout` | customer | Invalidate outstanding refresh tokens |
| GET | `/products` | public | List with search, brand and category filters, pagination |
| GET | `/products/brands` | public | Distinct brand names |
| GET | `/products/:slug` | public | Product detail |
| POST / PUT / DELETE | `/products[/:id]` | admin | Create, update, deactivate |
| GET | `/categories` | public | List categories |
| GET | `/categories/:slug` | public | Category detail |
| POST / PUT / DELETE | `/categories[/:id]` | admin | Create, update, delete |
| POST | `/orders` | customer | Checkout |
| GET | `/orders` | customer | Own order history |
| GET | `/orders/:id` | customer | Own order detail |
| GET | `/admin/orders` | admin | All orders, filterable by status |
| PATCH | `/admin/orders/:id/status` | admin | Advance order status |

Authenticated requests send `Authorization: Bearer <accessToken>`. The refresh
token is set as an httpOnly, SameSite=strict cookie scoped to `/api/auth` and is
never returned in a response body.

---

## Project structure

```
server/src/
  config/         environment loading, MongoDB connection (Singleton)
  models/         Mongoose schemas, validation, indexes
  repositories/   all query construction - the only layer aware of Mongoose
  services/       business rules: totals, stock, order lifecycle, auth
  services/payment/  the payment Strategy: contract, HTTP provider, test stub
  controllers/    HTTP only - parse, call one service, format the response
  dtos/           response mappers - no endpoint returns a raw Mongoose document
  routes/         URL to controller mapping
  middleware/     authenticate, authorise, validate, sanitise, rate limit, errors
  errors/         AppError and its subclasses
  utils/          response envelope, asyncHandler, jwt, password
server/tests/     unit and integration suites
payment-gateway/  standalone mock card authorisation service (port 5001)
client/src/api/   the API facade - base URL, Bearer header, refresh, errors
client/src/       React application
docs/             System Plan, diagrams, meeting minutes, SECURITY.md
```

See `ARCHITECTURE.md` for the layering rules and the design patterns in use.

## Team

Roles rotate between milestones. The table below is the standing split from
Milestones 1-2; see the Milestone 3 section beneath it for the current one.

| Member | Responsibility |
|---|---|
| Hanre Koen | Architecture, database, products and orders |
| Ryno Lourens | Authentication and security |
| Zander Jacques Burger | Frontend architecture, cart |
| Obusitse Tlotlo Kodisang Bokaba  | UI/UX, error handling, categories, QA and release |

### Milestone 3 roles

Milestone 3 is *Code Review: API Integration*. Roles were reassigned for it,
so the work in this milestone does not follow the table above. Each person
owns the resource named below, and does the validation and response DTOs for
that resource; the standalone pieces have a single owner each.

| Member | Milestone 3 role | Owns | Standalone piece |
|---|---|---|---|
| Obusitse Tlotlo Kodisang Bokaba | Person 1 — Backend & Data | products, orders | Wires the payment call into checkout |
| **Hanre Koen** | Person 2 — API & Security | auth, security | Payment gateway integration; security middleware; OWASP review |
| Ryno Lourens | Person 3 — Frontend Architecture | cart | Reviews the API contract as its consumer; starts the React API client |
| Zander Jacques Burger | Person 4 — UI/UX, QA & Release | categories | Swagger / OpenAPI documentation; deployment configuration |

**Files with a single owner this milestone**, so no two people edit the same
file:

| File | Only editor |
|---|---|
| `server/src/app.js` | Person 2 — security middleware |
| `server/src/middleware/validate.js` | Person 2 — created it, nobody else edits |
| `server/src/middleware/sanitize.js`, `rateLimit.js` | Person 2 |
| `server/src/services/payment/`, `payment-gateway/` | Person 2 |
| `server/src/routes/index.js` | Person 1 |
| `server/src/errors/AppError.js` | Person 4 |
| `docs/openapi.yaml` | Person 4 — everyone else sends their endpoint details rather than editing |

Milestone 3 documentation: [`docs/SECURITY.md`](docs/SECURITY.md) (OWASP Top
Ten review), [`docs/CHECKOUT_INTEGRATION.md`](docs/CHECKOUT_INTEGRATION.md)
(handover from Person 2 to Person 1),
[`docs/PERSON2_MILESTONE3.md`](docs/PERSON2_MILESTONE3.md),
[`payment-gateway/README.md`](payment-gateway/README.md).
