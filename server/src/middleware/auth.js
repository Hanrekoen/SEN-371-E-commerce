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

module.exports = { authenticate, requireRole };
