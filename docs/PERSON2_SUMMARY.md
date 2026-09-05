# Person 2 — Login & Security: what's done

## New files
- `server/src/utils/password.js` — bcrypt hash/compare, pure helper (fits the `utils` rule: no Express/Mongoose).
- `server/src/repositories/user.repository.js` — `findByEmail`, `findByEmailWithPassword` (pulls in the `select:false` passwordHash), `incrementTokenVersion`.
- `server/src/services/auth.service.js` — `register`, `login`, `refresh`, `logout`. No `req`/`res`/Mongoose, per architecture rules.
- `server/src/controllers/auth.controller.js` — HTTP only. Sets/clears the refresh token as an httpOnly cookie scoped to `/api/auth`; access token goes back in the JSON body.
- `server/src/routes/auth.routes.js` — `POST /register`, `/login`, `/refresh`, `/logout`, with express-validator rules and a rate limiter on `/login` (10 attempts / 15 min).
- `server/src/middleware/auth.js` — `authenticate` (verifies the Bearer access token, sets `req.user = { id, role }`) and `requireRole(...roles)`.

## Edited
- `server/src/utils/jwt.js` — was reading `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN`, which don't exist in `.env.example` (which defines `ACCESS_TOKEN_TTL` / `REFRESH_TOKEN_TTL`), so custom TTLs were silently ignored. Now reads from `config/env.js` like everything else.

## Design decisions worth knowing about
- **Refresh token lives in an httpOnly, `sameSite: strict` cookie**, not the response body — keeps it out of reach of an XSS bug on the client. Access token is returned in the body for the client to hold in memory and send as `Authorization: Bearer`.
- **Refresh rotates on every use** (a new refresh token is issued and the old cookie overwritten) and carries a random `jti` so two tokens issued in the same second aren't identical — caught this as a real bug in testing (see below).
- **Logout invalidates every outstanding refresh token**, not just the current one: it bumps `user.tokenVersion`, and `refresh()` rejects any token whose `tokenVersion` claim doesn't match. No token blocklist needed.
- **Login/register return the same generic "Invalid email or password"** on both a wrong password and a nonexistent account, to avoid leaking which emails are registered.
- **Login is rate-limited** (10/15min per IP) since brute-forcing is the obvious risk on this endpoint specifically.

## Verified with a smoke test (19/19 passing)
Ran the full flow — register, duplicate email rejection, weak password rejection, wrong password, login, protected-route access with/without a token, role-gated route (403 for wrong role), refresh (200, rotates cookie), refresh with no cookie (401), logout (204), reuse of the pre-logout refresh token (401 — proves tokenVersion invalidation works), and the login rate limiter tripping on the 11th attempt. All passed. (Mongo itself wasn't reachable in this sandbox — no network egress to fastdl.mongodb.org — so the repository layer was faked in-memory for the test; the real Mongoose queries in `user.repository.js` follow the exact same pattern as the other repositories in the codebase and weren't themselves exercised end-to-end. Worth one real run against `mongodb-memory-server` or a dev DB before merging.)

## What Person 1 still needs to do
In `routes/index.js` (which only Person 1 edits), uncomment:
```js
router.use("/auth", require("./auth.routes"));             // Person 2
```
Other teammates can now also uncomment the `authenticate, requireRole` guards they left commented out in `product.routes.js`, `order.routes.js`, and `admin.routes.js` — `middleware/auth.js` exists now.

## Not built (outside the stated scope)
No `GET /me` endpoint — wasn't in the list you gave me (register, login, hashing, refresh, logout, middleware). Trivial to add with `authenticate` + `authService.toPublicUser` if the team wants it.
