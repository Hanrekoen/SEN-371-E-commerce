"use strict";

// PERSON 2 OWNS THIS FILE.
//
// Two request-shaping guards, written here rather than pulled from npm.
//
// Why not express-mongo-sanitize and hpp, which the milestone brief names?
// Both work by reassigning req.query. Express 5 defines query as a getter
// with no setter, so both throw on the first request:
//
//   TypeError: Cannot set property query of #<IncomingMessage>
//              which has only a getter
//
// Verified against express 5.2.1, the version in package.json. The fix is
// Object.defineProperty, which shadows the getter with an own property.
// Since the working code is about sixty lines, taking two unmaintained
// dependencies to get it was the worse trade: fewer packages is also the
// answer to OWASP A06, Vulnerable and Outdated Components.

// Mongo treats a key beginning with "$" as an operator and a key containing
// "." as a path. Neither is legitimate in user input here.
const FORBIDDEN_KEY = /^\$|\./;

// Bounds the recursion. A deeply nested body is a cheap way to burn CPU in
// any code that walks it, this middleware included.
const MAX_DEPTH = 10;

/**
 * Strips operator-shaped keys from an object, in place, and records what it
 * removed. Arrays are walked; their indices are never key-shaped.
 */
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

/**
 * The backstop behind validation, not a replacement for it.
 *
 * A login body of {"email": {"$gt": ""}} where a string is expected turns
 * findOne into match-anything and returns the first user in the collection.
 * The validation layer already rejects that, because isEmail() fails on an
 * object. This exists for the endpoint someone adds next month and forgets
 * to validate.
 *
 * Bodies only need the deep walk: Express 5 parses query strings with the
 * "simple" parser, so ?email[$gt]= arrives as the literal key "email[$gt]"
 * rather than a nested object. It is still scrubbed, one level, in case a
 * future maintainer switches the parser back to "extended".
 */
function mongoSanitize(req, _res, next) {
  const removed = [];

  if (req.body && typeof req.body === "object") {
    scrub(req.body, removed, "body");
  }

  const query = req.query;
  if (query && typeof query === "object") {
    const cleaned = scrub({ ...query }, removed, "query");
    // Assignment throws on Express 5 - the getter has no setter.
    Object.defineProperty(req, "query", {
      value: cleaned,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }

  if (removed.length > 0) {
    // Logged, because an operator-shaped key is never an accident. Nobody
    // types $gt into a form by mistake. OWASP A09 asks for exactly this.
    console.warn(
      `[security] stripped operator keys from ${req.method} ${req.originalUrl}: ${removed.join(", ")}`
    );
  }

  return next();
}

// Parameters that may legitimately repeat, if any are ever added.
// ?tag=phones&tag=audio would go here.
const REPEATABLE = new Set([]);

/**
 * HTTP parameter pollution.
 *
 * ?limit=1&limit=99999 parses to limit: ["1", "99999"]. Whichever half of
 * the code reads it first wins, and the two halves can disagree - a
 * validator that checks the "1" while the query builder uses the "99999".
 * express-validator's isInt() would fail on the array, so this is mostly
 * about a predictable answer rather than a hole, but it removes the
 * ambiguity instead of arguing about it.
 *
 * The last value wins, matching hpp's default. That is deliberately the
 * unsafe-looking choice: ?limit=1&limit=99999 collapses to 99999, which the
 * validation layer then rejects with a 400. Taking the first value instead
 * would quietly accept the request and hide the fact that someone tried.
 */
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
