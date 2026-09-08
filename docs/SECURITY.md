# Security Review

GadgetVault API · SEN371 · Milestone 3
Owner: Person 2 (API & Security) · Reviewed 8 September 2026

This document is the OWASP Top Ten 2021 review promised in the System Plan.
One row per category: what the codebase actually does, or why the category
does not apply. Where something is not done, it says so — a review that
claims everything is covered is not a review.

Every claim below points at a file. If a claim and the code disagree, the
code is right and this document is out of date.

---

## Summary

| # | Category | Status |
|---|---|---|
| A01 | Broken Access Control | Addressed |
| A02 | Cryptographic Failures | Addressed, with one deployment dependency |
| A03 | Injection | Addressed, in two layers |
| A04 | Insecure Design | Addressed |
| A05 | Security Misconfiguration | Addressed |
| A06 | Vulnerable and Outdated Components | Addressed, `npm audit` clean |
| A07 | Identification and Authentication Failures | Addressed |
| A08 | Software and Data Integrity Failures | Partly — see the row |
| A09 | Logging and Monitoring Failures | Partly — see the row |
| A10 | Server-Side Request Forgery | Addressed, one outbound call |

---

## A01 · Broken Access Control

Authentication and authorisation are separate middleware, and both are
route-level rather than inside the services, so a missing guard is visible in
the route file.

- `middleware/auth.js` — `authenticate` verifies the Bearer access token and
  sets `req.user = { id, role }`. `requireRole("admin")` gates admin routes.
- **Ownership is re-checked against the authenticated user, never taken from
  the URL.** `orderService.getForUser` loads the order and compares
  `order.userId` to `req.user.id`, returning 403 on a mismatch. Trusting the
  id in the path is broken object-level authorisation, the single most
  exploited API flaw, and this is where it would have been.
- Cart operations are scoped by `req.user.id`; there is no route that takes a
  cart id at all, so one user cannot address another's cart.
- Roles come from the signed token, not from the request body. A client
  cannot elevate itself by sending `role: "admin"` — and since Milestone 3,
  `validate.data(req)` drops unknown fields before they reach a service at
  all (see A03).

**Not done:** there is no per-object permission model beyond owner/admin.
For a single-vendor store with two roles, there is nothing further to model.

## A02 · Cryptographic Failures

- Passwords are hashed with **bcrypt at cost 12** (`utils/password.js`).
  Twelve is the usual interactive-login recommendation; the cost is paid on
  every register and login, so it is bounded deliberately rather than set as
  high as possible.
- The hash is never returned by a query. `passwordHash` is declared
  `select: false` in `models/user.model.js`, so it is absent unless a caller
  explicitly opts in with `.select("+passwordHash")` — exactly once, in
  `user.repository.findByEmailWithPassword`.
- **Two distinct JWT secrets**, access and refresh, so a leaked access secret
  cannot be used to mint refresh tokens. Both come from the environment;
  `config/env.js` refuses to start the server if either is missing.
- No secret is committed. `.env` is in `.gitignore`; `.env.example` carries
  placeholders and the command that generates real values.
- The refresh token is an **httpOnly, `SameSite=Strict` cookie** scoped to
  `/api/auth`, never in a response body, so an XSS bug on the client cannot
  read it. The access token is held in memory by the client.
- Card numbers are never stored, never logged beyond the last four digits,
  and never written to the database. See the payment note at the end.

**Deployment dependency:** HTTPS is not something this codebase can enforce.
`SameSite=Strict` and `httpOnly` are set, but the `Secure` flag and TLS
termination belong to the host. Recorded here so it is not forgotten.

## A03 · Injection

Mongo does not have SQL's string-concatenation problem, but it has its own:
a value that arrives as an object rather than a string becomes a query
operator. `{"email": {"$gt": ""}}` where a string is expected turns
`findOne` into match-anything and returns the first user in the collection.

Two layers, in this order:

1. **Validation, per endpoint.** `middleware/validate.js` runs
   express-validator rules and rejects anything that does not match with a
   400. `isEmail()` fails on an object, so the attack above never reaches the
   service. This is the real defence.
2. **Sanitisation, globally.** `middleware/sanitize.js` strips any key
   beginning with `$` or containing `.` from the request body and query. This
   is the backstop for the endpoint someone adds next month and forgets to
   validate — not a substitute for validating it.

No query is built by string concatenation anywhere; all query construction
lives in `repositories/` and goes through Mongoose's query builder.

**Mass assignment**, the related flaw: `validate.data(req)` returns only the
fields a validation rule actually declared, so `service.create()` receives a
whitelist rather than the raw body. Posting `ratingAverage: 5` or
`role: "admin"` alongside a legitimate product no longer reaches Mongoose.

**A note on the sanitiser.** `express-mongo-sanitize` and `hpp` are the usual
packages for this. Neither works here: both reassign `req.query`, which
Express 5 defines as a getter with no setter, so both throw
`TypeError: Cannot set property query of #<IncomingMessage> which has only a
getter` on the first request. Verified against express 5.2.1. The equivalent
is about sixty lines using `Object.defineProperty`, which is what
`middleware/sanitize.js` does — and two fewer dependencies is also the
answer to A06.

## A04 · Insecure Design

The design decisions that exist for security reasons, rather than the
controls bolted on afterwards:

- **Totals are calculated server-side, from the database price, and never
  accepted from the client.** `services/order.factory.js` is the only place
  an order is constructed. A total in a request body is ignored. The amount
  sent to the payment provider is that calculated total, never anything from
  `req.body` — `MockPaymentProvider.authorize` refuses a non-integer amount
  outright.
- **Stock decrements atomically.** `productRepository.decrementStock` puts
  the stock condition inside the query, so MongoDB checks and updates in one
  operation. Read-compare-write would let two shoppers buy the last unit.
- **Order items embed a price snapshot** rather than referencing the live
  product, so a later price change cannot rewrite a financial record.
- **Money is stored as integer cents**, never as a float.
- Order status moves through an explicit transition table
  (`order.service.js`); anything else is a 422. An order cannot be moved from
  `delivered` back to `pending`.

## A05 · Security Misconfiguration

- **helmet** sets the standard response headers and removes `X-Powered-By`,
  which otherwise advertises Express to anyone scanning.
- **CORS is an allow-list**, currently of one origin, read from
  `CLIENT_ORIGIN`. Not `*`, and `credentials: true` requires an exact origin
  in any case.
- **Stack traces are suppressed in production.** `middleware/errorHandler.js`
  includes `error.stack` only when `NODE_ENV !== "production"`. Proven by a
  test rather than by inspection: `tests/integration/app.security.test.js`
  loads the app under both settings and asserts the field is present in
  development and absent in production.
- **The server refuses to start misconfigured.** `config/env.js` throws at
  startup when `MONGODB_URI` or either JWT secret is missing, rather than
  failing at the first request that needs them.
- Request bodies are capped at 1 MB.
- `trust proxy` is **off by default** and set only from `TRUST_PROXY`.
  This cuts both ways and the default is the safe half: trusting
  `X-Forwarded-For` when no proxy sets it lets any client spoof its IP and
  get a fresh rate-limit bucket per request.

## A06 · Vulnerable and Outdated Components

```
$ npm audit          # server, 8 September 2026
found 0 vulnerabilities
   121 prod, 446 dev, 41 optional — 566 dependencies audited

$ npm audit          # payment-gateway, 8 September 2026
found 0 vulnerabilities
```

- `package-lock.json` is committed, so every machine and the marker's machine
  install the same tree.
- Dependencies are current majors: express 5, mongoose 9, helmet 8,
  jsonwebtoken 9, bcrypt 6.
- The dependency count is itself a control. Milestone 3 added security
  middleware, an HTTP integration and a second service **without adding a
  single runtime dependency**: rate limiting reuses `express-rate-limit`,
  which was already present for login; sanitisation and HPP are written in
  `middleware/sanitize.js`; the HTTP call uses Node 22's global `fetch`
  rather than axios.

**Re-run before submission.** An audit is only true on the day it was run.

## A07 · Identification and Authentication Failures

- **Rate limiting in three tiers**, cheapest checks first
  (`middleware/rateLimit.js`, applied in `app.js`):

  | Tier | Scope | Budget |
  |---|---|---|
  | Login | `POST /api/auth/login` | 10 / 15 min / IP |
  | Writes | POST, PUT, PATCH, DELETE under `/api` | 60 / 15 min / IP |
  | Global | everything under `/api` | 300 / 15 min / IP |

  The global limiter sits **before** `express.json`, so a flood is rejected
  without paying to parse it.
- **Login errors are generic.** A wrong password and a nonexistent account
  both return "Invalid email or password", so the endpoint cannot be used to
  enumerate which addresses are registered.
- **Short access tokens** (15 minutes) with a longer refresh token (7 days).
- **Refresh rotates on every use** and carries a random `jti`, so two tokens
  minted in the same second are not identical.
- **Logout invalidates every outstanding refresh token** by incrementing
  `user.tokenVersion`; `refresh()` rejects any token whose `tokenVersion`
  claim no longer matches. No blocklist to maintain.
- Password rules: minimum 8 characters and at least one digit
  (`routes/auth.routes.js`).

**Not done:** no account lockout after repeated failures, no MFA, no
compromised-password check. Rate limiting is the only brute-force control.
For an academic prototype that is a defensible line; it is stated rather than
implied.

## A08 · Software and Data Integrity Failures

- `package-lock.json` is committed and dependencies resolve to pinned
  versions.
- No `eval`, no `Function()` constructor, no dynamic `require` of a
  user-supplied path anywhere in `server/src`.
- JWTs are verified with an explicit secret on every request; the algorithm
  is not read from the token header, so the `alg: none` substitution does not
  apply.

**Not done:** there is no CI pipeline, so nothing verifies integrity
automatically on push, and no dependency-signature verification beyond what
npm does by default. Both are Milestone 6 concerns.

## A09 · Logging and Monitoring Failures

- Every 5xx is logged server-side with its stack (`errorHandler.js`), while
  the client receives only a generic message in production.
- **Security events are logged specifically**, because they are never
  accidents: `middleware/sanitize.js` logs the exact keys it stripped and the
  parameters it collapsed. Nobody types `$gt` into a form by mistake, so a
  single occurrence in a log is worth reading.
- Payment outcomes are logged with the order number, the amount and the
  outcome — and the **last four digits only**. A full card number in a log
  file is how a system that never stores card data still leaks it.
- No token, password, secret or API key is written to a log. The validation
  error shape deliberately omits the rejected `value`, so a bad password is
  not echoed back through `error.details`.

**Not done:** logging is `console` only — no aggregation, no retention, no
alerting, and no audit trail of administrative actions such as who changed an
order's status. A production deployment would need all four.

## A10 · Server-Side Request Forgery

The API makes exactly **one** outbound HTTP request: `MockPaymentProvider`
calling the payment gateway.

- Its URL comes from `PAYMENT_API_URL` in the environment. No part of it is
  built from user input, so there is nothing for a request to redirect.
- No endpoint accepts a URL and fetches it. Product `images` are stored as
  URLs and returned as strings for the client to load; the server never
  retrieves them.
- The call has a 5-second timeout and does not follow user-controlled
  redirects.

---

## Production checklist

Before the API is deployed, on the host:

| Setting | Value |
|---|---|
| `NODE_ENV` | `production` — this is what suppresses stack traces |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | fresh 32-byte random values, different from each other and from any dev value |
| `MONGODB_URI` | production cluster, with a least-privilege database user |
| `CLIENT_ORIGIN` | the deployed client's exact origin |
| `PAYMENT_API_URL` / `PAYMENT_API_KEY` | the deployed gateway |
| `TRUST_PROXY` | `true` **only** if a reverse proxy terminates TLS in front of the API |
| TLS | terminated at the host; the app assumes it, and cannot enforce it |

Then confirm: request a route that 500s and check the response has no
`stack` field.

## Known limitation worth stating

The API receives card details in the checkout request and forwards them to
the gateway. Nothing is stored and nothing beyond the last four digits is
logged, but a real deployment would put the API **in PCI DSS scope** simply
for handling them. Production systems avoid this by tokenising the card in
the browser against the provider directly, so the card never touches the
merchant's server, and sending only the resulting token to the API. That is
the right design; it was out of scope for a milestone about demonstrating the
integration itself, and it is recorded here rather than discovered later.

---

*Re-run `npm audit` and update the A06 figures before submission.*
