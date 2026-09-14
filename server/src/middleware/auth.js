"use strict";
const { verifyAccessToken } = require("../utils/jwt");
const { UnauthorizedError, ForbiddenError } = require("../errors/AppError");

// Verifies the Bearer access token and attaches { id, role } to req.user. Never
// hits the database - the payload already carries what a request needs (see
// utils/jwt.js), which is the point of a short-lived access token.
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

// Role gate; must run after authenticate. Variadic: requireRole("admin", "manager").
function requireRole(...roles) {
  return function (req, _res, next) {
    if (!req.user) return next(new UnauthorizedError("Authentication required"));
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError("You do not have permission to do that"));
    }
    return next();
  };
}

// Deny-list, not allow-list: admins must not shop (they would place and approve the
// same order), while any role added later can shop without editing this. Enforced in
// the API, not just hidden in the UI - a hidden button is only a suggestion.
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

const shoppersOnly = denyRole("admin");

module.exports = { authenticate, requireRole, denyRole, shoppersOnly };
