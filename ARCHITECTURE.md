# Architecture

GadgetVault is a three-tier application. The API implements the Model-View-Controller
pattern across a client-server boundary: the React client is the view and consumes
JSON, rather than receiving server-rendered markup.

## Layers

Requests travel down this stack and results travel back up. **Each layer may call
only the layer directly beneath it.**

| Layer | Directory | Responsibility | Must never |
|---|---|---|---|
| Routes | `server/src/routes` | Map a URL and method to one controller function | Contain logic |
| Middleware | `server/src/middleware` | Authenticate, authorise, validate, rate limit, handle errors | Query the database |
| Controllers | `server/src/controllers` | Read the request, call ONE service method, shape the response | Query the database or hold business rules |
| Services | `server/src/services` | Business rules: totals, stock, order lifecycle | Import `req`, `res` or Mongoose |
| Repositories | `server/src/repositories` | All query construction | Leak Mongoose documents' query API upward |
| Models | `server/src/models` | Schema, validation, indexes | Contain behaviour beyond validation |

Two greps verify the claim:

```bash
grep -rn "req\.\|res\." server/src/services   # must return nothing
grep -rln "mongoose" server/src/services         # must return nothing
```

## Design patterns

| Pattern | Where | Why |
|---|---|---|
| Repository | `repositories/base.repository.js` and one subclass per collection | Isolates Mongoose so services are unit-testable against a fake |
| Service Layer | `services/*.service.js` | Business rules live outside both the controller and the model |
| Factory | `services/order.factory.js` | The only place an order is constructed, so snapshots and totals cannot diverge |
| Singleton | `config/database.js` | One connection pool per process |
| Middleware Chain | `middleware/` | Cross-cutting concerns as ordered, independently testable units |
| Facade | `client/src/api` | One interface to the backend for the whole client |

## Decisions worth knowing

**Money is stored in cents as an integer.** `0.1` has no exact binary
representation, so a Double accumulates error across repeated arithmetic.
`R349.00` is stored as `34900` and divided by 100 only for display.

**Cart items reference a product; order items embed a snapshot.** A cart must
follow the live price. An order is a financial record, so a later rename or
price change must not rewrite it. This is the single most important decision in
the data model.

**Stock decrements atomically.** `productRepository.decrementStock` puts the
stock condition inside the query, so MongoDB checks and updates in one
operation. Reading the value, comparing it in JavaScript and then writing would
let two shoppers both buy the last unit.

**Order totals are calculated server side, never accepted from the client.**
A total supplied in a request body is a price-tampering vulnerability.

## Known limitation

Checkout decrements stock for several products in sequence. Without a
replica-set transaction, a failure partway through is compensated manually by
incrementing back what was already taken. A production deployment would wrap the
whole checkout in a MongoDB transaction instead.
