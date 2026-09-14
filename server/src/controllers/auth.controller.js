"use strict";
const authService = require("../services/auth.service");
const { ok, created, noContent } = require("../utils/response");
const env = require("../config/env");

// HTTP only; password/JWT logic lives in auth.service.js. The refresh token goes
// in an httpOnly cookie (never the JSON body) so client-side XSS cannot read it;
// the access token is returned in the body and held in memory as a Bearer token.

const REFRESH_COOKIE = "refreshToken";

// Cross-site in production (Pages -> Render), so the cookie needs sameSite
// "none" + secure (hence HTTPS); "strict" would never be stored or sent and every
// refresh would sign the user out. Costs the CSRF protection - what remains is
// httpOnly, the /api/auth path scope, and exactly one allowed CORS origin.
function cookieOptions() {
  const crossSite = env.isProduction;
  return {
    httpOnly: true,
    secure: crossSite,
    sameSite: crossSite ? "none" : "strict",
    path: "/api/auth", // only sent back to auth endpoints, not every request
  };
}

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, {
    ...cookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7d - keep in sync with REFRESH_TOKEN_TTL
  });
}

// The options must match the ones it was set with, or the browser keeps it.
function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, cookieOptions());
}

async function register(req, res) {
  const { user, accessToken, refreshToken } = await authService.register(req.body);
  setRefreshCookie(res, refreshToken);
  return created(res, { user, accessToken });
}

async function login(req, res) {
  const { email, password } = req.body;
  const { user, accessToken, refreshToken } = await authService.login(email, password);
  setRefreshCookie(res, refreshToken);
  return ok(res, { user, accessToken });
}

async function refresh(req, res) {
  const token = req.cookies?.[REFRESH_COOKIE];
  const { accessToken, refreshToken } = await authService.refresh(token);
  setRefreshCookie(res, refreshToken); // rotated - overwrite the old cookie
  return ok(res, { accessToken });
}

async function logout(req, res) {
  await authService.logout(req.user.id);
  clearRefreshCookie(res);
  return noContent(res);
}

// Who am I? The id comes from the verified token, never from the request, so
// this can only ever return the caller's own record.
async function me(req, res) {
  return ok(res, await authService.getPublicUser(req.user.id));
}

module.exports = { register, login, refresh, logout, me };
