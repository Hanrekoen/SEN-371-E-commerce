# GadgetVault — Test Report and Coverage Analysis

**Module:** SEN371 Software Engineering · Milestone 5 (Testing & Quality Assurance)
**Author:** Hanre Koen (Person 2)
**Build:** branch `main`
**Date of this run:** 13 September 2026

---

## 1. Summary

| | Tests | Passing | Statement coverage |
|---|---|---|---|
| **API (Jest + supertest)** | 243 | 243 | **80.8%** |
| **Client (Vitest + React Testing Library)** | 259 | 259 | **58.5%** |
| **End-to-end (Playwright)** | 19 | see §7 | — |
| **Total automated** | **521** | | |

Both suites enforce a coverage floor in CI configuration, so coverage cannot
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
one below it.** That is what makes the top level worth running, and it is why
the middle levels are allowed to be fast and hermetic.

### Where each rubric requirement is met

| Requirement | Where |
|-------------|-------|
| Test-Driven Development | [`TDD_LOG.md`](./TDD_LOG.md) — the categories feature, red output and all |
| Automated Test Implementation | 521 automated tests, three runners, all in `npm test` |
| Unit Testing | `server/tests/unit/` (58), `client/src/utils/*.test.js` (54) |
| Component Testing | `client/src/**/*.test.jsx` (205 across components and pages) |
| Function Testing | `server/tests/function/` (63) and `server/tests/integration/` (122) |
| User Testing | Playwright journeys (19) **and** the moderated study in [`USABILITY_TEST_PLAN.md`](./USABILITY_TEST_PLAN.md) |
| Test Reporting with Coverage Analysis | this document |

---

## 3. How to run everything

```bash
# API — 243 tests
cd server
npm install
npm test                  # all levels
npm run test:unit         # 58
npm run test:integration  # 122
npm run test:function     # 63
npm run test:coverage     # + coverage, fails under the floor

# Client — 259 tests
cd client
npm install
npm test
npm run test:coverage     # HTML report in client/coverage/index.html

# End-to-end — 19 journeys. Needs a database.
cd server && npm run seed     # seeds the catalogue and the test accounts
cd client
npx playwright install chromium   # once, per machine
npm run test:e2e                  # starts both servers itself
npm run test:e2e:report           # the HTML report, with traces on failures
```

The end-to-end run writes to whatever database `server/.env` points at. Point
it at a scratch database, not the one holding demo data for marking.

---

## 4. Coverage analysis — API

`cd server && npm run test:coverage`

```
All files                |   80.80 |    60.41 |   72.17 |   82.79 |
 src/routes              |   99.23 |   100.00 |  100.00 |   99.22 |
 src/utils               |  100.00 |    75.00 |  100.00 |  100.00 |
 src/dtos                |  100.00 |    64.70 |  100.00 |  100.00 |
 src/services/payment    |   91.76 |    86.15 |   76.92 |   92.59 |
 src/controllers         |   88.37 |    68.75 |   82.35 |   88.37 |
 src/services            |   84.69 |    61.14 |   89.39 |   88.34 |
 src/gateway             |   79.34 |    74.07 |   75.00 |   82.92 |
 src/middleware          |   78.47 |    68.75 |   86.36 |   79.10 |
 src/models              |   77.14 |   100.00 |    0.00 |   77.14 |
 src/repositories        |   21.15 |     0.00 |   13.04 |   23.40 |
```

**Threshold enforced:** 72% statements / 55% branches / 62% functions / 74% lines.

### Reading these numbers

**Routes at 99%** is the number that matters most for an API, because a route
file is where authentication, role checks and validation are attached. A route
whose guard is missing looks identical to one whose guard is present until
something calls it. Every route is called by a test, and the one uncovered line
is a 404 handler branch.

**Services at 85%, with `auth.service` and `order.service` both above 93%.**
These hold the business rules — password handling, token rotation, pricing,
stock, the status transition table — and they are where a defect costs real
money. They were the specific target of this milestone's new function tests:
`auth.service` went from 29% to 100%, `order.service` from 31% to 94%.

**Repositories at 21%, deliberately.** Each method is a one-line Mongoose call
(`this.model.findOne(...).exec()`). Covering them means either running a real
MongoDB in the test suite — slow, and it tests Mongoose rather than this
project — or mocking Mongoose itself, which tests the mock. The two repository
methods that contain actual logic are not left uncovered: `decrementStock`'s
atomic conditional update is reproduced exactly in the function tests' fake and
its behaviour asserted there, and the compensating `incrementStock` is asserted
through the failed-payment tests. This is the one place the report claims a gap
is acceptable, and the reasoning is written down here so a marker can disagree
with it on the merits.

**Branches at 60%** is the weakest figure. Most of the shortfall is in
`src/errors` (8% branch coverage) — the `AppError` subclasses have default
arguments for every constructor parameter, and the tests construct them the way
the app does rather than exercising all sixteen combinations of defaults. That
is low-value coverage, but it is still a gap, and it is named rather than
excluded from the report.

### What is genuinely not covered

| Area | Why | Risk |
|------|-----|------|
| `category.service` update/delete paths (50%) | no admin UI calls them yet | low — unreachable from the app |
| `product.service` search filter combinations (68%) | one filter combination is tested, not all | medium — a wrong filter shows wrong products |
| `src/models` statics | Mongoose middleware, needs a live connection | low |
| Repository query construction | see above | low, argued above |

---

## 5. Coverage analysis — Client

`cd client && npm run test:coverage`

```
All files          |   58.45 |    84.32 |   64.49 |   58.45 |
 src/utils         |  100.00 |    95.83 |  100.00 |  100.00 |
 src/components    |  100.00 |   100.00 |  100.00 |  100.00 |   (route guards)
 src/pages         |   67.49 |    82.80 |   85.96 |   67.49 |
 src/components/ui |   35.21 |    92.10 |   53.57 |   35.21 |
 src/api           |   24.52 |     0.00 |    0.00 |   24.52 |
 src/context       |   16.83 |    50.00 |   50.00 |   16.83 |
```

**Threshold enforced:** 55% statements / 65% branches / 50% functions / 55% lines.

### Why statements are at 58% and branches at 84%

This gap is the interesting part of the client's numbers, and it is not an
accident. The tested files are tested thoroughly — every screen that handles
money or identity is at or near 100% statements with most of its branches
exercised:

| File | Stmts | Branches |
|------|-------|----------|
| `LoginPage.jsx` | 100% | 100% |
| `NotFoundPage.jsx` | 100% | 100% |
| `OrderHistory.jsx` | 100% | 91% |
| `OrderConfirmationPage.jsx` | 100% | 82% |
| `Cart.jsx` | 100% | 86% |
| `AdminCategoriesPage.jsx` | 100% | 97% |
| `AdminProductsPage.jsx` | 99% | 71% |
| `CheckoutPage.jsx` | 98% | 68% |
| `SecurePayOverlay.jsx` | 99% | 90% |
| `ProductDetail.jsx` | 93% | 92% |
| `utils/money.js`, `apiErrors.js`, `productImage.js` | 100% | 96% |

The overall statement figure is held down by whole files at 0%, not by shallow
testing of covered ones. Those files are:

| Untested file | Lines | Why it was left | Covered elsewhere? |
|---------------|-------|-----------------|---------------------|
| `HomePage.jsx` | 221 | presentational — marketing sections, no logic, no money | yes, by the E2E journey |
| `CatalogPage.jsx` | 253 | filter and paging state; the real risk is server-side filtering | partly — E2E adds a product and finds it |
| `AdminDashboardPage.jsx` | 269 | charts and KPI cards over admin API data | yes — the E2E admin journey moves an order through it |
| `TrendChart.jsx`, `Sparkline.jsx` | 175 | SVG path maths with no user interaction | no — an honest gap |
| `Navbar.jsx`, `Footer.jsx`, `Layout.jsx` | 233 | chrome; the cart badge is the only logic | partly, via E2E |
| `src/api/*` | — | thin `fetch` wrappers; mocked in every component test by design | yes — the same endpoints are hit for real by the API suite |
| `src/context/*` | — | providers; every component test supplies the context directly | partly |

**The honest reading:** 58% is a real number and it is lower than the API's. The
money path and the identity path are covered close to exhaustively; the
presentational surface is not. That is a deliberate ordering of effort, not a
claim that the untested files are risk-free. `TrendChart` and `Sparkline` in
particular have real arithmetic in them and no test at all, which is the single
biggest gap in this report.

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

Every one of these was found by writing a test, not by using the app. Each was
fixed and each fix is held in place by the test that found it.

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
makes that visible, which is why §4 and §5 name uncovered files by name rather
than reporting one percentage.

---

## 7. End-to-end status — stated plainly

The 19 Playwright journeys are written, and `npx playwright test --list`
enumerates all 19 without error. They have **not** been executed in the
environment this report was written in, because that environment has no MongoDB
and none could be installed. They are intended to be run on a development
machine with `server/.env` configured, using the command in §3.

This is said explicitly rather than left implied. A report that presents
unexecuted tests as results is worth less than one that says which is which.

What the journeys cover:

**Customer (11):** register → browse → product page → add to cart → checkout →
SecurePay → receipt; the order appearing in history; the receipt surviving a
refresh; the cart being empty afterwards; a declined card leaving the cart
intact; a retry succeeding; sign in, refresh, sign out; checkout unreachable
while signed out; the 404 page naming the failed path.

**Admin (8):** dashboard loads; a category can be added; a product added in the
admin appears in the shop a customer browses; deactivate and reactivate; an
order placed by a real customer moved paid → shipped → delivered; and the three
places an admin is told this account does not shop.

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
server/tests/unit/          58 unit tests
server/tests/integration/  122 integration tests
server/tests/function/      63 function tests   ← new this milestone
client/src/**/*.test.js(x) 259 unit + component ← new this milestone
client/e2e/                 19 end-to-end       ← new this milestone
docs/testing/
  TEST_REPORT.md                this document
  TDD_LOG.md                    the test-first feature, with its red output
  USABILITY_TEST_PLAN.md        the moderated study design
  USABILITY_TASK_SCRIPT.md      what the facilitator reads out
  USABILITY_CONSENT.md          participant consent form
  USABILITY_OBSERVATION_SHEET.md one per participant
  USABILITY_RESULTS.md          write-up template, not yet run
```
