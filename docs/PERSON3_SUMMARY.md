# Person 3 — Frontend Architecture: what's done

Scope: 3.1 cart validation, 3.2 cart DTO, 3.3 review every DTO shape as
the consumer, 3.4 start the React API client.

**This is a redo.** The first pass was built against an earlier zip that
was missing Person 1's payment integration and Person 2's actual
`middleware/validate.js`, `rateLimit.js` and `sanitize.js` — so it
included a stand-in `validate.js` that would have collided with the real
one (different export shape: the real file exports the function directly
plus `.chain()` / `.data()` helpers, not `{ validate }`). This version is
rebuilt against the correct codebase and re-verified against the real
files, not the stand-ins.

## New files

- `server/src/dtos/cart.dto.js` — the cart response mapper (3.2).
- `client/` — the Vite + React scaffold (3.4): `src/api/config.js`,
  `tokenStore.js`, `ApiError.js`, `httpClient.js` (the facade), thin
  resource modules `auth.api.js` and `cart.api.js`, plus `App.jsx` as a
  working proof it's wired correctly (not the real UI — that's Milestone
  4). Unchanged from the first pass; nothing about the corrected backend
  invalidated the client design.
- `docs/minutes/contract-freeze-notes.md` (3.3).

## Edited files

- `server/src/controllers/cart.controller.js` — every response now goes
  through `toCartDto()`.
- `server/src/routes/cart.routes.js` — validation rules for
  `POST /items` and `PATCH /items/:productId`, using the **real**
  `middleware/validate.js` (`const validate = require("../middleware/validate")`
  — it's a default export, not `{ validate }`).

**Not touched this time:** `middleware/validate.js` itself, or
`auth.routes.js`. Both already exist and are correct — Person 2's real
`validate.js` is considerably more thorough than what I'd built as a
stand-in (it strips the raw `value` from error details so a rejected
password is never echoed back, and ships `validate.chain()` /
`validate.data()` helpers for mass-assignment whitelisting). No reason to
touch either file.

## Decisions worth knowing about

- **Quantity cap is 100, not unbounded** — same reasoning as before: the
  service already enforces the real stock limit as a business rule;
  validation's job is rejecting malformed input before it gets there.
- **`lines` → `items` rename, at the DTO boundary only** — checked
  against the actual `order.factory.js` in this codebase (not assumed):
  it still uses `items`, so the rename lines cart up with orders
  correctly. Recorded as confirmed, not open, in the contract-freeze
  notes.
- **The client keeps the access token in memory only**, matching the
  reasoning for why the refresh token is an httpOnly cookie in the first
  place (see `docs/PERSON2_SUMMARY.md`).

## Verified

**Backend (12/12 passing)**, run through the **real** `app.js` — not a
hand-assembled test app — so this exercises Person 2's actual `helmet`,
`cors`, `apiLimiter`/`writeLimiter`, `mongoSanitize`,
`preventParamPollution`, and `validate.js` in the real order they run in
production. Repositories were faked in-memory (no network path to a real
Mongo in this sandbox). Covers: 401 without a token, the DTO's top-level
keys, invalid `productId` → 400, quantity 0 → 400, quantity 500 → 400,
the 400's `error.details[0].field` naming the bad field, `productId` as a
plain string, `items` not `lines`, correct totals from the live product
price, `PATCH` with a bad param → 400, and — new in this pass — a request
with a Mongo-operator-shaped `productId` (`{"$gt": ""}`) correctly
rejected, proving `sanitize.js` and `validate.js` both actually sit in
front of the cart route in the real app, not just in isolation.

**Client, end-to-end over real HTTP (9/9 passing)** — the actual
`client/src/api/*.js` files, loaded via Vite's SSR module loader, driven
against the real `app.js` (real security stack, real payment config set
to the `stub` provider so it needs no network). Confirms: public health
check, register stores an access token, an authenticated `cart.api.js`
call sends the Bearer header, a validation failure surfaces as an
`ApiError` with the field named, and a call made with a deliberately
expired access token (3s TTL) still succeeds via the silent
refresh-and-retry path. `vite build` completes clean.

## Not built (Milestone 4, or explicitly someone else's file)

Same as before: the thirteen real screens, `dtos/product.dto.js` /
`dtos/order.dto.js` (1.2), Swagger (4.1) — all owned by other people.
Payment gateway, security middleware and the OWASP review are already
done in this codebase (Person 2's actual work, not stand-ins), so they're
not listed here as outstanding.
