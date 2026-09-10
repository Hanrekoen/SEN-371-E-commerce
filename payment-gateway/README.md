# Payment Gateway (mock)

A small, standalone card authorisation service. The GadgetVault API integrates
with it over HTTP exactly as it would with a commercial provider.

It lives in this repository, but it is **not** part of the API: separate
`package.json`, separate process, separate port, and a response shape of its
own that owes nothing to the API's `{ success, data, error, meta }` envelope.
`MockPaymentProvider` in the API translates between the two.

## Why a service we wrote ourselves

Milestone 3 needs the API to call something outside itself over the network,
handle the response and cope when it fails. Three options were considered:

| Option | Rejected because |
|---|---|
| A public echo API (httpbin, jsonplaceholder) | Real HTTP, but visibly not a payment provider |
| Stripe test mode | Impressive, but API keys, webhook signature verification and a live dependency that can fail during a demo |
| **This** | Chosen. Nothing external can be down on marking day, and every failure path can be triggered on demand |

The network call, the API key, the status codes, the latency and the failure
modes are all real. Only the money is imaginary.

## Running

```bash
cd payment-gateway
npm install
npm start          # http://localhost:5001
```

Configuration, all optional:

| Variable | Default | Purpose |
|---|---|---|
| `GATEWAY_PORT` | `5001` | Listen port |
| `GATEWAY_API_KEY` | `dev-gateway-key` | Must match the API's `PAYMENT_API_KEY` |
| `GATEWAY_SLOW_MS` | `15000` | How long the timeout test card stalls before answering |

The API's `PAYMENT_API_URL` must point at `http://localhost:5001` and its
`PAYMENT_API_KEY` must match `GATEWAY_API_KEY`.

## API

### `GET /health`

Unauthenticated. `{ "service": "payment-gateway", "status": "ok", "time": "..." }`

### `POST /authorize`

Header `x-api-key: <key>` is required; without it the response is `401`.

```json
{
  "amountCents": 34900,
  "currency": "ZAR",
  "orderNumber": "ORD-2026-014772",
  "card": { "number": "4242424242424242", "expMonth": 4, "expYear": 2030, "cvc": "123" }
}
```

Approved — `200`:

```json
{
  "status": "approved",
  "reference": "PAY-M8XK2A-7Q4RD9PZ",
  "amountCents": 34900,
  "currency": "ZAR",
  "orderNumber": "ORD-2026-014772",
  "card": { "last4": "4242", "brand": "visa" },
  "processedAt": "2026-09-08T10:22:41.883Z"
}
```

Declined — `402`:

```json
{ "status": "declined", "code": "insufficient_funds", "message": "Insufficient funds", "reference": null }
```

Gateway failure — `502`. Malformed request — `400`. Bad key — `401`.

## Test cards

Any Luhn-valid number that is not in this table is **approved**, for example
`4242 4242 4242 4242` or `5555 5555 5555 4444`.

| Number | Outcome | HTTP | Code |
|---|---|---|---|
| `4000 0000 0000 0002` | Declined | 402 | `card_declined` |
| `4000 0000 0000 0069` | Declined | 402 | `expired_card` |
| `4000 0000 0000 0127` | Declined | 402 | `incorrect_cvc` |
| `4000 0000 0000 9995` | Declined | 402 | `insufficient_funds` |
| `4000 0000 0000 0119` | Gateway failure | 502 | `processing_error` |
| `4000 0000 0000 0259` | Stalls 15s, then approves | — | forces the caller's timeout |

An amount above **R50 000,00** (`5000000` cents) is declined with
`limit_exceeded` regardless of card — a second way to force a decline without
changing the card.

To force the unreachable-provider path, stop this process and check out.

## What it does not do

No card data is stored, and no log line contains more than the last four
digits. There is no capture, refund, webhook or 3-D Secure step: the API only
ever authorises, so that is all this implements.
