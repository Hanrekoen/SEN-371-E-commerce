# Person 2 — API & Security: Milestone 3

API integration, validation infrastructure, security review

Milestone 3's stated headline gap was that **nothing in the codebase called
out to another service** on a milestone titled API Integration. That is now
the centre of this work: the API makes a real HTTP call to a real service,
handles every response it can get, and copes with getting none.

---

## New files

### Shared infrastructure

- **`server/src/middleware/validate.js`** — the express-validator adapter,
  extracted from `auth.routes.js` so all four route owners share one
  implementation. Pushed first, because three people were blocked on it.
  Also exports `validate.chain(rules)` (binds rules to the check so a route
  cannot mount one without the other) and `validate.data(req)` (returns only
  the fields a rule declared — the mass-assignment whitelist).

- **`server/src/middleware/sanitize.js`** — `mongoSanitize` strips `$`- and
  `.`-shaped keys from bodies and queries; `preventParamPollution` collapses
  repeated query parameters. Written rather than installed — see the decision
  note below.

- **`server/src/middleware/rateLimit.js`** — the global and write-tier
  limiters. Both raise `TooManyRequestsError`, so a 429 arrives in the same
  `{ success, data, error, meta }` envelope as every other failure instead of
  express-rate-limit's own JSON shape.

- **`server/tests/setup.js`** — supplies throwaway env values so any test file
  that reaches `config/env.js` can load. Registered under `jest.setupFiles`
  in `package.json`.

### The integration

- **`payment-gateway/`** — a standalone card authorisation service. Own
  `package.json`, own port (5001), own response shape. `README.md` there
  documents the endpoints and the test cards.

- **`server/src/services/payment/`** — the Strategy implementation.
  - `PaymentProvider.js` — the contract
  - `MockPaymentProvider.js` — the real HTTP call, 5-second timeout
  - `StubPaymentProvider.js` — same contract, no network, for tests
  - `index.js` — picks one from configuration

### Tests

- `tests/unit/payment.strategy.test.js`
- `tests/unit/sanitize.test.js`
- `tests/integration/payment.gateway.test.js` — starts the real gateway on an
  ephemeral port and drives the provider against it over HTTP
- `tests/integration/app.security.test.js` — loads the real `app.js`, so it
  covers middleware order as well as behaviour

### Documentation

- `docs/SECURITY.md` — the OWASP Top Ten review
- `docs/CHECKOUT_INTEGRATION.md` — the handover to Person 1 for the one call
  that lives in `order.service.js`

## Edited

- `server/src/app.js` — security middleware, in a deliberate order. The
  comments in the file explain each position; the short version is that the
  request passes through a funnel of increasingly expensive checks, and the
  global rate limiter sits **before** `express.json` so a flood is rejected
  without paying to parse it.
- `server/src/routes/auth.routes.js` — uses the shared `validate`; the inline
  copy is gone. Behaviour unchanged.
- `server/src/config/env.js` — added the `payment` block and `trustProxy`.
  Neither is in the `REQUIRED` array, so a teammate who has not started the
  gateway can still boot the API.
- `.env.example` — documented the payment variables, all commented out,
  because the defaults already match the gateway's.
- `server/package.json` — registered `tests/setup.js`.

---

## Decisions worth defending

**The gateway is a service we wrote, not httpbin and not Stripe.** A function
returning `true` would not have counted; an echo API is visibly not a payment
provider; Stripe brings API keys, webhook signature verification and a live
dependency that can fail during a demo. A service in the repository gives a
genuine network call, a genuine API key, genuine status codes — and complete
control over the failure cases, which is what makes 402 and 503 demonstrable
rather than theoretical. Only the money is imaginary.

**A decline resolves; an unreachable provider throws.** A declined card is a
correct answer from a working system, so `authorize()` returns
`approved: false`. An exception is reserved for the case where no answer was
obtained at all, because then the API genuinely does not know whether the
payment went through and must not claim it did.

**`express-mongo-sanitize` and `hpp` are not installed, on purpose.** Both
reassign `req.query`. Express 5 defines it as a getter with no setter, so
both throw `TypeError: Cannot set property query of #<IncomingMessage> which
has only a getter` on the first request — verified against express 5.2.1, the
pinned version. The equivalent is about sixty lines using
`Object.defineProperty`. Two fewer dependencies is also the answer to OWASP
A06.

**Milestone 3 added no runtime dependencies at all.** Rate limiting reuses
`express-rate-limit`, already present for login. Sanitisation and HPP are
written. The HTTP call uses Node 22's global `fetch` rather than axios.

**`trust proxy` defaults to off.** Rate limiting counts per IP, and behind a
proxy every request carries the proxy's IP unless Express is told to read
`X-Forwarded-For`. Trusting that header when nothing sets it is the worse
failure: anyone can then spoof an IP and get a fresh bucket per request. It
is opt-in via `TRUST_PROXY`, for deployments that actually have a proxy.

**Nothing about a card is written down.** Not to the database, not to a log
beyond the last four digits, not into an error response. `validate.js`
deliberately omits express-validator's `value` field from `error.details`,
which is what would otherwise echo a rejected password back to the client.

---

## Verified

Full suite, `npm test`:

```
Test Suites: 7 passed, 7 total
Tests:       56 passed, 56 total
```

That includes the 14 Milestone 2 tests, unchanged and still passing.

Live against the running gateway:

| Case | Result |
|---|---|
| `4242424242424242` | 200, approved, reference returned |
| `4000000000009995` | 402, `insufficient_funds` |
| `4000000000000119` | 502 from the gateway → 503 from the API |
| Gateway stopped | 503, provider unreachable |
| Gateway stalls past the timeout | 503 at 400ms, not at 900ms — the client timeout fires, proven by elapsed time |
| Wrong API key | 503, logged as HTTP 401, not surfaced to the customer |
| Card failing the Luhn check | 400 with the field named |
| No API key | 401 from the gateway |

Log inspection after all of the above: **zero full card numbers**, last four
digits only.

`npm audit`, 8 September 2026: **0 vulnerabilities**, 566 dependencies
audited. Gateway: **0 vulnerabilities**.

Production error handling: `errorHandler.js` already gated the stack on
`NODE_ENV`, so nothing needed changing. It is now covered by a test that
loads the app under both settings and asserts the `stack` field is present in
development and absent in production.

---

## What is not done

- **The checkout call itself.** It lives in `order.service.js`, which is
  Person 1's file. Everything it needs is built, tested and documented in
  `docs/CHECKOUT_INTEGRATION.md`.
- **`PaymentDeclinedError` (402)** is missing from `errors/AppError.js`,
  which is Person 4's file. Two lines; the class is written out in the
  handover document.
- **Deployment.** `NODE_ENV=production` and real secrets on the host are
  Milestone 6, and the checklist is at the end of `docs/SECURITY.md`.
- **`npm audit` must be re-run before submission.** An audit is only true on
  the day it was run.

## For the team

- `middleware/validate.js` is pushed. Import it and add a rules array per
  route: `router.post("/", rules, validate, asyncHandler(handler))`.
- **Person 1:** `validate.data(req)` is your mass-assignment fix, in one
  line — `productService.create(validate.data(req))` instead of `req.body`.
  The whitelist becomes the rules array and cannot drift away from it.
- **Person 4:** `docs/SECURITY.md` documents every error code the API can
  return, which should make the Swagger error responses quicker to write.
  Please add `PaymentDeclinedError` to `errors/AppError.js`.
- Nobody else should edit `app.js`, `middleware/validate.js`,
  `middleware/sanitize.js`, `middleware/rateLimit.js`, `services/payment/` or
  `payment-gateway/` this milestone.
