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

```bash
git clone https://github.com/Hanrekoen/Software-Engineering-Project.git
cd "Software-Engineering-Project/server"
npm install
```

Copy the example environment file and fill it in:

```bash
cp ../.env.example .env
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

## Running

```bash
npm run seed     # create collections and load sample data
npm run dev      # start with auto-reload on http://localhost:5000
npm start        # start without auto-reload
npm test         # run the Jest suite
```

Confirm it is up: `GET http://localhost:5000/api/health`

### Seeded accounts

All seeded users share the password `Password123!`.

| Email | Role |
|---|---|
| `Hanre.admin@sen371.test` | admin |
| `Obusitse.admin@sen371.test` | admin |

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
  controllers/    HTTP only - parse, call one service, format the response
  routes/         URL to controller mapping
  middleware/     authenticate, authorise, error handling
  errors/         AppError and its subclasses
  utils/          response envelope, asyncHandler, jwt, password
client/src/       React application
docs/             System Plan, diagrams, meeting minutes
```

See `ARCHITECTURE.md` for the layering rules and the design patterns in use.

## Team

| Member | Responsibility |
|---|---|
| Person 1 | Architecture, database, products and orders |
| Person 2 | Authentication and security |
| Person 3 | Frontend architecture, cart |
| Person 4 | UI/UX, error handling, categories, QA and release |
