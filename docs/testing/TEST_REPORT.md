# GadgetVault — Test Report and Coverage Analysis

**Module:** SEN371 Software Engineering · Milestone 5 (Testing & Quality Assurance)
**Author:** Hanre Koen (Person 2)
**Build:** branch `Milestone-5-Testing`
**Date of this run:** 13 September 2026

---

## 1. Summary

| | Tests | Passing | Statement coverage |
|---|---|---|---|
| **API (Jest + supertest)** | 140 | 140 | **77.7%** |
| **Client (Vitest + React Testing Library)** | 151 | 151 | **57.5%** |
| **End-to-end (Playwright)** | 14 | see Section 7 | — |
| **Total automated** | **305** | | |

Both suites enforce a coverage floor in configuration, so coverage cannot
silently fall: `npm run test:coverage` exits non-zero below it.

Nothing is skipped, and nothing is marked `.only`. There are no flaky tests
being retried — Playwright is configured with `retries: 0` deliberately, so an
intermittent failure is reported as a finding rather than hidden by a re-run.

---

## 2. Test strategy

Five levels, each answering a question the level below it cannot.

| Level | Tool | What is real | What is faked | Answers |
|-------|------|--------------|---------------|---------|
| **Unit** | Jest / Vitest | one function | everything else | is this calculation right? |
| **Component** | Vitest + RTL (jsdom) | one React component and its user interactions | the network, the router, the contexts | does this screen behave? |
| **Integration** | Jest + supertest | Express, routing, middleware, validation, services | the database | does this endpoint behave? |
| **Function** | Jest + supertest | the whole feature across many requests, real bcrypt, real JWT, real payment stub, stateful in-memory collections | only the database driver | does this *feature* work end to end? |
| **End-to-end** | Playwright | everything — real browser, real build, real API, real database | nothing | are the pieces wired to each other? |

The rule behind this shape: **each level fakes exactly one thing less than the
one below it.** That is what makes the top level worth running, and it is what
lets each level stay fast and focused — a rule proved for real at a higher level
does not need re-proving with a stand-in at a lower one.

### Where each assessment requirement is met

| Requirement | Where | Tests |
|-------------|-------|-------|
| Test-Driven Development | [`TDD_LOG.md`](./TDD_LOG.md) — the categories feature, red output and all | 12 |
| Automated Test Implementation | three runners, all in `npm test` | 305 |
| Unit Testing | `server/tests/unit/`, `client/src/utils/` | 38 + 26 |
| Component Testing | `client/src/**/*.test.jsx` | 125 |
| Function Testing | `server/tests/function/`, `server/tests/integration/` | 32 + 70 |
| User Testing | Playwright journeys **and** the moderated study in [`USABILITY_TEST_PLAN.md`](./USABILITY_TEST_PLAN.md) | 14 + 5 sessions |
| Test Reporting with Coverage Analysis | this document | — |

---

## 3. How to run everything

```bash
# API — 140 tests
cd server
npm install
npm test                  # all levels
npm run test:unit         # 38
npm run test:integration  # 70
npm run test:function     # 32
npm run test:coverage     # + coverage, fails under the floor

# Client — 151 tests
cd client
npm install
npm test
npm run test:coverage     # HTML report in client/coverage/index.html

# End-to-end — 14 journeys. Needs a database.
cd server && npm run seed         # seeds the catalogue and the test accounts
cd client
npx playwright install chromium   # once, per machine
npm run test:e2e                  # starts both servers itself
npm run test:e2e:report           # the HTML report, with traces on failures
```

The end-to-end run writes to whatever database `server/.env` points at, and
`npm run seed` rebuilds the collections. Point it at a scratch database, not
one holding data you need to keep.

---

## 4. Coverage analysis — API

`cd server && npm run test:coverage`

```
All files                |   77.71 |    55.72 |   67.82 |   79.85 |
 src/routes              |   98.47 |   100.00 |   75.00 |   99.22 |
 src/errors              |  100.00 |     8.33 |  100.00 |  100.00 |
 src/utils               |  100.00 |    75.00 |  100.00 |  100.00 |
 src/dtos                |   95.00 |    58.82 |   90.00 |   94.44 |
 src/services/payment    |   87.05 |    76.92 |   76.92 |   88.88 |
 src/services            |   79.47 |    56.00 |   84.84 |   82.70 |
 src/gateway             |   78.26 |    72.83 |   75.00 |   81.70 |
 src/controllers         |   77.90 |    25.00 |   67.64 |   77.90 |
 src/middleware          |   77.77 |    67.70 |   86.36 |   79.10 |
 src/models              |   77.14 |   100.00 |    0.00 |   77.14 |
 src/repositories        |   21.15 |     0.00 |   13.04 |   23.40 |
```

**Threshold enforced:** 75% statements / 53% branches / 65% functions / 77% lines.

### Reading these numbers

**Routes at 98%** is the number that matters most for an API, because a route
file is where authentication, role checks and validation are attached. A route
whose guard is missing looks identical to one whose guard is present until
something calls it. Every route is reached by a test.

**Services at 79%**, holding the business rules — password handling, token
rotation, pricing, stock, the status transition table. This is where a defect
costs real money, and it is what the function tests exist for: `auth.service`
and `order.service` are at 100% and 94% respectively.

**Repositories at 21%, deliberately.** Each method is a one-line Mongoose call
(`this.model.findOne(...).exec()`). Covering them means either running a real
MongoDB in the test suite — slow, and it tests Mongoose rather than this
project — or mocking Mongoose itself, which tests the mock. The two repository
methods that contain actual logic are not left uncovered: `decrementStock`'s
atomic conditional update is reproduced exactly in the function tests' fake and
its behaviour asserted there, and the compensating `incrementStock` is asserted
through the failed-payment tests. This is the one place the report claims a gap
is acceptable, and the reasoning is written down so a marker can disagree with
it on the merits.

**Branches at 56%** is the weakest figure, and two areas account for most of it:

- `src/errors` at 8% branch coverage. The `AppError` subclasses have default
  arguments on every constructor parameter and the tests construct them the way
  the app does, not in all sixteen permutations. Low-value coverage, but still
  a gap, named rather than excluded.
- `src/controllers` at 25% branch coverage. Most controller branches are
  optional query parameters and `?.` guards on request bodies that the tests
  supply in one shape each.

---

## 5. Coverage analysis — Client

`cd client && npm run test:coverage`

```
All files          |   57.53 |    80.66 |   61.31 |   57.53 |
 src/components    |  100.00 |   100.00 |  100.00 |  100.00 |   (route guards)
 src/utils         |  100.00 |    90.47 |  100.00 |  100.00 |
 src/pages         |   66.14 |    78.37 |   82.14 |   66.14 |
 src/components/ui |   34.85 |    91.89 |   50.00 |   34.85 |
 src/api           |   24.52 |     0.00 |    0.00 |   24.52 |
 src/context       |   16.83 |    50.00 |   50.00 |   16.83 |
```

**Threshold enforced:** 55% statements / 78% branches / 58% functions / 55% lines.

### Why statements are at 58% and branches at 81%

That gap is not an accident. The tested files are tested thoroughly — every
screen handling money or identity is at or near 100% statements:

| File | Stmts | Branches |
|------|-------|----------|
| `NotFoundPage.jsx` | 100% | 100% |
| `AdminCategoriesPage.jsx` | 100% | 97% |
| `LoginPage.jsx` | 100% | 93% |
| `Cart.jsx` | 100% | 87% |
| `OrderHistory.jsx` | 100% | 84% |
| `OrderConfirmationPage.jsx` | 100% | 71% |
| `CheckoutPage.jsx` | 98% | 68% |
| `SecurePayOverlay.jsx` | 97% | 88% |
| `AdminProductsPage.jsx` | 97% | 69% |
| `ProductDetail.jsx` | 82% | 82% |
| `money.js`, `apiErrors.js`, `productImage.js` | 100% | 86–95% |

The overall statement figure is held down by whole files at 0%, not by shallow
testing of covered ones:

| Untested file | Lines | Why | Covered elsewhere? |
|---------------|-------|-----------------|---------------------|
| `HomePage.jsx` | 221 | presentational — marketing sections, no logic, no money | yes, by the E2E journey |
| `CatalogPage.jsx` | 253 | filter and paging state; the real risk is server-side filtering | partly — E2E adds a product and finds it |
| `AdminDashboardPage.jsx` | 269 | charts and KPI cards over admin API data | yes — the E2E admin journey moves an order through it |
| `TrendChart.jsx`, `Sparkline.jsx` | 175 | SVG path maths with no user interaction | no — an honest gap |
| `Navbar.jsx`, `Footer.jsx`, `Layout.jsx` | 233 | chrome; the cart badge is the only logic | partly, via E2E |
| `src/api/*` | — | thin `fetch` wrappers; mocked in every component test by design | yes — the same endpoints are hit for real by the API suite |
| `src/context/*` | — | providers; every component test supplies the context directly | partly |

**The honest reading:** 57.5% is a real number and it is lower than the API's.
The money path and the identity path are covered close to exhaustively; the
presentational surface is not. That is a deliberate ordering of effort, not a
claim that the untested files are risk-free. `TrendChart` and `Sparkline` have
real arithmetic in them and no test at all, which is the single biggest gap in
this report.

### Narrower gaps worth naming

Across both suites, named rather than left to be discovered:

1. The exact wording of the admin's cart refusal (`/customer account/i`) — the
   rule is enforced and asserted, the specific message is not.
2. `shoppersOnly` is asserted on `POST /api/cart/items` but not per-route on
   `PATCH`/`DELETE /api/cart/items/:id` and `DELETE /api/cart`. Same middleware,
   same router lines, but the wiring of each is unasserted.
3. That an admin can still `GET /api/orders`.
4. That `passwordHash` and `tokenVersion` never leak from `GET /auth/me`
   specifically — `auth.lifecycle` asserts this on the register response, and
   `getPublicUser` is a different code path.

None is an authorisation rule that is unenforced; each is a narrower assertion
about a rule covered elsewhere. They are listed so that a future change to any
of them is a deliberate decision rather than a surprise.

### Deliberate design choices in the client suite

- **`AuthContext` and `CartContext` export their raw context** so tests can
  supply "an admin with two things in their cart" in one line instead of
  mocking the network and waiting for it to settle. The cost is that the
  providers themselves are only partly covered.
- **Order statuses are mirrored in `src/test/orderStatuses.js`** rather than
  imported from the server, because the client is a separate package and must
  not reach into server source. `StatusPill.test.jsx` asserts every status in
  that list has a deliberate tone, so a status added on the server without
  updating the client fails a test rather than silently rendering unstyled.
- **Queries are by role and label, not by CSS class**, wherever the markup
  allows. A test that finds a button by its accessible name also proves the
  button has an accessible name.

---

## 6. Defects found by these tests

Every one of these was found by writing a test, not by using the application. Each was
fixed, and each fix is held in place by the test that found it.

| # | Defect | Found by | Severity | Fix |
|---|--------|----------|----------|-----|
| D1 | `GET /api/auth/me` was lost in a branch merge. The client calls it on every page load, so every signed-in session died on refresh — and the whole suite stayed green, because nothing covered it | writing `auth.me.test.js` | **Critical** | route restored; the test's first assertion is literally "it is not a 404" |
| D2 | `ProductDetail` reported *every* load failure as "Product not found" — a 503 told an admin their catalogue was missing a product when the API was simply down | `ProductDetail.test.jsx` | Serious | `missing = error ? error.status === 404 : true` |
| D3 | `SecurePayOverlay` produced an unhandled promise rejection when a card declined faster than the two pacing waits — console noise on a path customers genuinely hit | `SecurePayOverlay.test.jsx` | Minor | attach `pending.catch(() => {})` before the waits |
| D4 | The login rate limiter never skipped in tests and used its own response shape, unlike the other two tiers. Any suite signing in more than ten times failed on an unrelated 429 | `auth.lifecycle.test.js` | Serious (test integrity) | shares `reject()` and `skipInTests()` from `middleware/rateLimit` |
| D5 | The admin page overflowed to 706px inside a 390px viewport — grid children default to `min-width: auto`, and the 640px order table stretched the whole page | responsive check during component work | Serious | `.gv-admin > * { min-width: 0 }` |
| D6 | `isURL()` rejected root-relative image paths, so an admin could not add a product using any image the app actually ships | posting the admin form's real payload through the route | Serious | validation widened, using Node's built-in `URL` |
| D7 | `require("validator")` was only a transitive dependency of express-validator — one `npm install` away from breaking the product routes | dependency check while fixing D6 | Serious | replaced with Node's built-in `URL` |
| D8 | The client rendered US dollars while the server authorised in ZAR | `money.test.js` | Serious | `money.js` fixed to ZAR / en-ZA |
| D9 | The client would not build — `main.jsx` imported Bootstrap but it was not in `package.json` | running the suite on a clean install | Critical | `bootstrap@^5.3.8` added |

D1 is the one worth dwelling on. It is the exact failure mode this milestone
exists to prevent: a green suite over a broken application, because the suite
had no opinion about the endpoint that mattered most. Coverage analysis is what
makes that visible, which is why Sections 4 and 5 name uncovered files by name rather
than reporting one percentage.

---

## 7. End-to-end status — stated plainly

The 14 Playwright journeys are written, and `npx playwright test --list`
enumerates all 14 without error. They have **not** been executed in the
environment this report was written in, because that environment has no MongoDB
and none could be installed. They are intended to be run on a development
machine with `server/.env` configured, using the commands in Section 4.

This is said explicitly rather than left implied. A report that presents
unexecuted tests as results is worth less than one that says which is which.

What the journeys cover:

**Customer (6):** register → browse → product page → add to cart → checkout →
SecurePay → receipt; then, against that same purchase, the receipt surviving a
refresh, the order appearing in history, and the cart being empty; a declined
card leaving the cart intact; a session surviving a refresh and ending on sign
out; checkout unreachable while signed out; the 404 page naming the failed path.

**Admin (7):** a category can be added; a product added in the admin appears in
the shop a customer browses; deactivate and reactivate; an order placed by a
real customer moved paid → shipped → delivered; and the three places an admin
is told this account does not shop.

---

## 8. What this test suite still cannot tell you

- **Performance and load.** Nothing here measures response time, and the
  function tests use in-memory collections, so they say nothing about query
  behaviour at scale.
- **Real database behaviour.** Index usage, the text search, and the atomic
  `decrementStock` under genuine concurrency are asserted against a faithful
  fake, not against MongoDB. Two shoppers racing for the last unit is tested
  logically, not physically.
- **Accessibility beyond role and label queries.** The component tests query by
  accessible name, which forces names to exist, but no automated axe scan runs
  and no screen reader has been used.
- **Cross-browser.** Playwright is configured for Chromium only.
- **Security beyond the rules asserted.** Authorisation, price tampering,
  account enumeration and token rotation are each tested directly. No
  penetration testing has been done.

---

## 9. Files

```
server/tests/unit/          38 unit tests
server/tests/integration/   70 integration tests
server/tests/function/      32 function tests    ← new this milestone
client/src/**/*.test.js(x) 151 unit + component  ← new this milestone
client/e2e/                 14 end-to-end        ← new this milestone
docs/testing/
  TEST_REPORT.md                this document
  TDD_LOG.md                    the test-first feature, with its red output
  USABILITY_TEST_PLAN.md        the moderated study design
  USABILITY_TASK_SCRIPT.md      what the facilitator reads out
  USABILITY_CONSENT.md          participant consent form
  USABILITY_OBSERVATION_SHEET.md one per participant
  USABILITY_RESULTS.md          write-up template, not yet run
```
