# Wiring the payment call into checkout

**From:** Person 2 (API & Security) · **To:** Person 1 (Backend & Data)
Milestone 3, task 1.3. Budget about an hour, together.

The gateway, the Strategy classes and the configuration are done and tested.
What is left is the single call from `order.service.js`, which is your file —
so this is a handover, not a pull request. Everything below is drop-in code
against what is already in the repository.

---

## What already exists

| File | What it gives you |
|---|---|
| `payment-gateway/` | A separate service on port 5001. `npm install && npm start` there |
| `services/payment/index.js` | `paymentProvider` — the thing you call |
| `services/payment/MockPaymentProvider.js` | Real HTTP call, 5s timeout, translates the response |
| `services/payment/StubPaymentProvider.js` | Same contract, no network. What your tests get automatically |
| `config/env.js` | `env.payment` — provider, URL, key, timeout, currency |

`models/order.model.js` already has a `paymentReference` field. Nothing to
add there.

## The contract

```js
const { paymentProvider } = require("./payment");

const result = await paymentProvider.authorize({
  amountCents,   // the CALCULATED total. Never req.body.
  currency,      // env.payment.currency, "ZAR"
  orderNumber,   // from the factory
  card,          // { number, expMonth, expYear, cvc }
});
// -> { approved, providerReference, message, code }
```

**Two outcomes, handled differently.**

- It **resolves** for both approved and declined. A decline is a normal
  answer from a working provider, so `approved: false` is a value, not an
  exception.
- It **throws** only when no answer was obtained — provider down, too slow,
  misconfigured. That is a `ServiceUnavailableError`, which the error handler
  already renders as a 503. You do not catch it; you only make sure stock is
  put back before it propagates.

You never learn which strategy answered. That is the Strategy pattern the
System Plan claims in section 3, and this is where it is demonstrated.

---

## 1 · `services/order.service.js`

Add the import at the top:

```js
const { paymentProvider } = require("./payment");
const env = require("../config/env");
```

Then replace `checkout`. The changes are: it takes `card`, it saves the order
as `pending` **before** authorising, and the `try` block now covers the
payment call so the existing compensation path puts stock back on any
failure.

```js
/**
 * Checkout.
 *
 * Steps, in order:
 *   1. load the cart, reject if empty
 *   2. load every product, reject if any is missing or inactive
 *   3. decrement stock atomically, one item at a time
 *   4. build the order with the factory and save it as "pending"
 *   5. authorise the payment against the provider
 *   6. approved  -> status "paid", store the reference, empty the cart
 *      declined -> status "cancelled", stock back, 402, cart untouched
 *      no answer -> status "cancelled", stock back, 503, cart untouched
 *   7. any failure puts back every unit already taken
 */
async function checkout(userId, { shippingAddress, card }) {
  const cart = await cartRepository.findByUser(userId);
  if (!cart || cart.items.length === 0) {
    throw new BusinessRuleError("Your cart is empty");
  }

  const productIds = cart.items.map((item) => item.productId);
  const products = await productRepository.findManyByIds(productIds);

  if (products.length !== cart.items.length) {
    throw new BusinessRuleError("One or more products in your cart no longer exist");
  }
  const inactive = products.find((p) => !p.isActive);
  if (inactive) {
    throw new BusinessRuleError(`${inactive.name} is no longer available`);
  }

  // Track what we take so a later failure can be undone. Without replica-set
  // transactions this manual compensation is the available option; see README.
  const decremented = [];
  let order = null;

  try {
    for (const item of cart.items) {
      const result = await productRepository.decrementStock(item.productId, item.quantity);
      if (!result) {
        const product = products.find((p) => String(p._id) === String(item.productId));
        throw new BusinessRuleError(
          `Not enough stock for ${product ? product.name : "an item"}`
        );
      }
      decremented.push(item);
    }

    const orderData = orderFactory.buildOrder({
      userId,
      cartItems: cart.items,
      products,
      shippingAddress,
    });

    // Saved BEFORE the money is asked for, deliberately. If the process dies
    // between the authorisation and the update, there is a pending order to
    // reconcile against the provider. Authorising first and saving after
    // would leave a charge with no record of it at all.
    order = await orderRepository.create(orderData);

    // The amount is the factory's calculated total. Passing anything from
    // the request body here is the price-tampering bug this design exists
    // to prevent.
    const payment = await paymentProvider.authorize({
      amountCents: order.totalCents,
      currency: env.payment.currency,
      orderNumber: order.orderNumber,
      card,
    });

    if (!payment.approved) {
      // A decline is the provider working correctly. 402 is the status for
      // it. The cart is left alone so the customer can try another card.
      throw new PaymentDeclinedError(payment.message, payment.code);
    }

    const paid = await orderRepository.updateById(order._id, {
      status: "paid",
      paymentReference: payment.providerReference,
    });

    await cartRepository.clear(userId);
    return paid;
  } catch (err) {
    for (const item of decremented) {
      await productRepository.incrementStock(item.productId, item.quantity);
    }
    // setStatus, NOT updateStatus: the service method also increments stock
    // back on a cancellation, and the loop above has already done that.
    // Calling both returns every unit twice.
    if (order) {
      await orderRepository.setStatus(order._id, "cancelled");
    }
    throw err;
  }
}
```

Note the comment on `setStatus`. It is the one trap in this whole change:
`orderService.updateStatus(id, "cancelled")` returns stock as a side effect,
and the compensation loop has already done it. Using it here would put every
unit back twice and inflate the catalogue.

## 2 · A 402 needs an error class

`errors/AppError.js` has 400, 401, 403, 404, 409, 422, 429 and 503, but no
402. That file is Person 4's. **Ask them to add this** — or ask me and I will
raise it with them:

```js
class PaymentDeclinedError extends AppError {
  constructor(message = "Your card was declined", code = "card_declined") {
    super(message, 402, "PAYMENT_DECLINED", { reason: code });
  }
}
```

and add `PaymentDeclinedError` to the `module.exports` list at the bottom.

Until it exists, `BusinessRuleError` gives you a 422 and everything else
works — but 402 Payment Required is the correct status and the brief asks
for it by number, so it is worth the two-line request.

## 3 · `controllers/order.controller.js`

`checkout` now takes an object:

```js
async function checkout(req, res) {
  const order = await orderService.checkout(req.user.id, {
    shippingAddress: req.body.shippingAddress,
    card: req.body.card,
  });
  return created(res, order);
}
```

## 4 · `routes/order.routes.js` — validation

This is part of your task 1.1 anyway. `middleware/validate.js` is pushed and
ready.

```js
const { body } = require("express-validator");
const validate = require("../middleware/validate");

const checkoutRules = [
  body("shippingAddress.line1").trim().isLength({ min: 3, max: 120 }),
  body("shippingAddress.city").trim().isLength({ min: 2, max: 80 }),
  body("shippingAddress.province").trim().isLength({ min: 2, max: 80 }),
  body("shippingAddress.postalCode").trim().matches(/^\d{4}$/)
    .withMessage("Postal code must be four digits"),
  body("shippingAddress.country").trim().isLength({ min: 2, max: 60 }),

  body("card.number").isCreditCard().withMessage("That card number is not valid"),
  body("card.expMonth").isInt({ min: 1, max: 12 }).toInt(),
  body("card.expYear").isInt({ min: 2026, max: 2040 }).toInt(),
  body("card.cvc").matches(/^\d{3,4}$/).withMessage("Security code must be 3 or 4 digits"),
];

router.post("/", authenticate, checkoutRules, validate, asyncHandler(controller.checkout));
```

`isCreditCard()` runs the Luhn check locally, so an obvious typo is a 400
from us rather than a round trip to the gateway.

**One thing to be careful about.** The card must not end up anywhere it can
be read later. Do not add it to a log line, do not put it on the order, and
do not include it in an error response. `validate.data(req)` is a good habit
elsewhere, but for checkout keep reading `req.body.shippingAddress` and
`req.body.card` explicitly so it is obvious at a glance that the card goes
straight to the provider and nowhere else.

---

## Running it

Two terminals:

```bash
# terminal 1
cd payment-gateway && npm install && npm start     # :5001

# terminal 2
cd server && npm run dev                           # :5000
```

No `.env` entries are needed — the defaults in `config/env.js` already match
the gateway's defaults.

## The four cases to demonstrate

All four use the same request; only the card changes. `payment-gateway/README.md`
has the full table.

| Card | Expect |
|---|---|
| `4242424242424242` | **201**, `status: "paid"`, a `paymentReference` |
| `4000000000009995` | **402**, stock unchanged, cart untouched |
| `4000000000000119` | **503**, stock unchanged, cart untouched |
| stop the gateway, any card | **503**, stock unchanged, cart untouched |

After each of the last three, re-check the product's `stockQty` — it must be
what it was before. That the stock is unchanged is the part worth
screenshotting, more than the status code.

## The sequence, for the code review

Worth being able to recite:

1. Validate the cart and load the products
2. Decrement stock atomically
3. Build the order with the factory, status `pending`
4. Save it, so there is a record before any money is asked for
5. Call the payment provider with the **calculated** total
6. Approved → `paid`, store the reference, clear the cart
7. Declined → roll back stock, cancel the order, 402, leave the cart
8. No answer → roll back stock, cancel the order, 503, leave the cart

## Tests you get for free

`tests/setup.js` sets `PAYMENT_PROVIDER=stub`, so any checkout test you write
uses `StubPaymentProvider` automatically — no gateway to start, no network.
It answers on the same test cards as the real thing, so a test forces a
decline exactly the way a demo does.

To assert on what checkout sent:

```js
const { paymentProvider } = require("../../src/services/payment");
const StubPaymentProvider = require("../../src/services/payment/StubPaymentProvider");

const stub = paymentProvider.use(new StubPaymentProvider());
// ... run the checkout ...
expect(stub.calls[0].amountCents).toBe(expectedTotal);   // not the body's total
afterEach(() => paymentProvider.reset());
```
