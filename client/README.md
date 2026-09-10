# client

React (Vite). At this milestone this is the API facade and a scaffold
proving it works — not the real screens (Milestone 4).

```
src/
  api/
    config.js        API_BASE_URL, read from VITE_API_BASE_URL
    tokenStore.js     access token held in memory only, never localStorage
    ApiError.js       normalised error shape every caller can rely on
    httpClient.js     the facade: fetch wrapper, Bearer header,
                       401 -> silent refresh -> retry once, error mapping
    auth.api.js        register / login / logout
    cart.api.js         getCart / addItem / updateQuantity / removeItem / clearCart
  App.jsx             proof-of-life demo: health check, login, cart
  main.jsx            React entry point
```

## Adding a new resource module (Milestone 4)

Follow `cart.api.js`'s shape — a thin file of one-line functions that call
`request()` from `httpClient.js`. Nothing outside `api/` should call
`fetch` directly; that's the whole point of the facade in
`ARCHITECTURE.md`.

```js
import { request } from "./httpClient";

export function listProducts(params) {
  return request(`/products?${new URLSearchParams(params)}`, { auth: false });
}
```

## Why the access token isn't in localStorage

The backend's refresh token is already an httpOnly cookie an XSS bug can't
read (see `docs/PERSON2_SUMMARY.md`). Putting the access token in
localStorage would undo half of that protection. It's kept in a
module-level variable in `tokenStore.js` instead — lost on a hard refresh,
recovered with one silent call to `/auth/refresh` (see `httpClient.js`),
which is exactly the path App.jsx's "Reload cart" button exercises after
the access token expires.
