# Contract freeze — Milestone 3

**Date:** _to be filled in_
**Present:** _to be filled in_

> This file records the API response contract as it stands in the code. It was
> written by reading the DTOs and route files, so every entry below is
> verifiable against the repository rather than recalled from a discussion.
> The team should confirm it and fill in the date and attendance — Milestone 3
> task 3.3 asks for minutes, and an unconfirmed record is not minutes.

Referenced by `server/src/dtos/cart.dto.js`.

---

## What was frozen

**One envelope, everywhere.** Every response is
`{ success, data, error, meta }`. Failures set `success: false` and carry
`error.code`, `error.message` and, for validation, `error.details` — an array
of `{ field, message }`. The client writes its error handling once.

**`id`, never `_id`.** Every DTO converts the Mongo `_id` to a string `id` and
drops `__v`. No endpoint returns a raw Mongoose document.

**Money is always integer cents.** `priceCents`, `subtotalCents`, `taxCents`,
`totalCents`, `lineTotalCents`. The client divides by 100 for display and
never for arithmetic.

**Lists paginate and return `meta`.** `{ page, limit, total, totalPages }` on
products, orders and — as of 4.3 — categories. `limit` is capped at 100.

---

## Decisions worth recording

| Question | Decision |
|---|---|
| Does the cart array match orders? | **Yes.** `cart.items`, renamed from `lines`, so one client shape covers both |
| Does the public catalogue expose exact stock? | **No.** `inStock: true/false`; `stockQty` appears only in admin responses |
| What does a populated category look like on a product? | Flattened to `{ id, name, slug }` — never the full document |
| Does the cart response carry an id? | **No.** A cart is per-user and reached only as "mine" |
| Where does the refresh token live? | An httpOnly cookie scoped to `/api/auth`, never in a response body |
| What happens to a declined payment? | **402**, stock rolled back, cart left intact so another card can be tried |
| What happens when the provider is unreachable? | **503**, stock rolled back, card not charged |

---

## Open, for Milestone 4

- `client/src/api` currently covers auth and cart. Products, orders and
  categories are still to be written against the shapes above.
- The thirteen screens will be the first real test of whether a product card
  can render from the catalogue response without a second request.
