"use strict";

// PERSON 2 OWNS THIS FILE.
//
// Hand-rolled because express-mongo-sanitize and hpp both reassign req.query, a
// getter with no setter in Express 5, so both throw on the first request (checked
// against 5.2.1). Object.defineProperty is the fix. See docs/SECURITY.md, A03.

const FORBIDDEN_KEY = /^\$|\./;
const MAX_DEPTH = 10; // a deeply nested body is a cheap way to burn CPU

function scrub(value, removed, path = "", depth = 0) {
  if (depth > MAX_DEPTH || value === null || typeof value !== "object") return value;

  if (Array.isArray(value)) {
    value.forEach((entry, i) => scrub(entry, removed, `${path}[${i}]`, depth + 1));
    return value;
  }

  for (const key of Object.keys(value)) {
    if (FORBIDDEN_KEY.test(key)) {
      removed.push(path ? `${path}.${key}` : key);
      delete value[key];
      continue;
    }
    scrub(value[key], removed, path ? `${path}.${key}` : key, depth + 1);
  }
  return value;
}

// The backstop behind per-route validation, not a replacement for it:
// {"email": {"$gt": ""}} turns findOne into match-anything.
function mongoSanitize(req, _res, next) {
  const removed = [];

  if (req.body && typeof req.body === "object") scrub(req.body, removed, "body");

  const query = req.query;
  if (query && typeof query === "object") {
    const cleaned = scrub({ ...query }, removed, "query");
    Object.defineProperty(req, "query", {
      value: cleaned,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }

  // Logged because nobody types $gt into a form by accident (A09).
  if (removed.length > 0) {
    console.warn(
      `[security] stripped operator keys from ${req.method} ${req.originalUrl}: ${removed.join(", ")}`
    );
  }

  return next();
}

const REPEATABLE = new Set([]); // params that may legitimately repeat

// HTTP parameter pollution: ?limit=1&limit=99999 parses to an array, and two
// halves of the code can disagree about which value is real. Last wins, so
// the polluted request is rejected by validation rather than quietly served.
function preventParamPollution(req, _res, next) {
  const query = req.query;
  if (!query || typeof query !== "object") return next();

  const cleaned = {};
  const collapsed = [];

  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value) && !REPEATABLE.has(key)) {
      cleaned[key] = value[value.length - 1];
      collapsed.push(`${key} (${value.length} values)`);
    } else {
      cleaned[key] = value;
    }
  }

  if (collapsed.length > 0) {
    Object.defineProperty(req, "query", {
      value: cleaned,
      writable: true,
      configurable: true,
      enumerable: true,
    });
    console.warn(
      `[security] collapsed repeated query parameters on ${req.method} ${req.originalUrl}: ${collapsed.join(", ")}`
    );
  }

  return next();
}

module.exports = { mongoSanitize, preventParamPollution, scrub, REPEATABLE };
