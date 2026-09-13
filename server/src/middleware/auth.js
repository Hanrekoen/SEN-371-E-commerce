"use strict";
const { verifyAccessToken } = require("../utils/jwt");
const { UnauthorizedError, ForbiddenError } = require("../errors/AppError");

// Every other route file imports this as:
//   const { authenticate, requireRole } = require("../middleware/auth");

/**
 * Reads "Authorization: Bearer <token>", verifies it against the access
 * secret, and attaches { id, role } to req.user. Never queries the
 * database - the access token payload already carries what a request
 * needs (see utils/jwt.js), which is the whole point of a short-lived
 * access token.
 */
function authenticate(req, _res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(new UnauthorizedError("Authentication required"));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.id, role: payload.role };
    return next();
  } catch {
    return next(new UnauthorizedError("Invalid or expired token"));
  }
}

/**
 * Role gate. Must run after authenticate - factory so routes read as
 * requireRole("admin"), and multiple roles can be allowed:
 * requireRole("admin", "manager").
 */
function requireRole(...roles) {
  return function (req, _res, next) {
    if (!req.user) return next(new UnauthorizedError("Authentication required"));
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError("You do not have permission to do that"));
    }
    return next();
  };
}

/**
 * Shopping is for customers. An admin account manages the catalogue and the
 * orders behind it, so letting one buy from the shop it administers mixes the
 * two roles - the same person would be placing the order and approving it.
 *
 * This is the opposite shape to requireRole: it names the roles that may NOT
 * pass, because the set allowed to shop is "everyone else", and a role added
 * later should be able to shop without anyone remembering to edit this line.
 *
 * Enforced here rather than only hidden in the UI: a hidden button is a
 * suggestion, and the API is the thing that has to refuse.
 */
function denyRole(...roles) {
  return function (req, _res, next) {
    if (!req.user) return next(new UnauthorizedError("Authentication required"));
    if (roles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          "Admin accounts cannot shop. Sign in with a customer account to place an order."
        )
      );
    }
    return next();
  };
}

// Named for what it protects, so the route files read as intent.
const shoppersOnly = denyRole("admin");

module.exports = { authenticate, requireRole, denyRole, shoppersOnly };
