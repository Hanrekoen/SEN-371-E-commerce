"use strict";

// Runs before every test file (registered under "jest" in package.json).
//
// config/env.js deliberately throws when MONGODB_URI or the JWT secrets are
// missing, so that a misconfigured server fails at startup rather than at the
// first request. That is the right behaviour, but it means any test file that
// reaches config/env - directly, or through a service four requires deep -
// cannot even be loaded without them. Providing throwaway values here is
// cheaper than every test file setting its own, and keeps a real .env out of
// the test run.

process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sen371-test";
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test-access-secret-not-a-real-key";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-refresh-secret-not-a-real-key";

// Answer in-process by default. A test that wants the real HTTP call sets
// its own provider - see tests/integration/payment.gateway.test.js.
process.env.PAYMENT_PROVIDER = process.env.PAYMENT_PROVIDER || "stub";
