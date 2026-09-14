"use strict";
const authService = require("../services/auth.service");
const { ok, created, noContent } = require("../utils/response");
const env = require("../config/env");

/**
 * HTTP concerns only: read the request, call ONE service method, shape
 * the response. No database queries, no password/JWT logic here - that
 * all lives in auth.service.js.
 *
 * The refresh token is set as an httpOnly cookie (never in the JSON
 * body) so it isn't reachable from JavaScript in the browser, which
 * limits what an XSS bug on the client could steal. The access token IS
 * returned in the body - the client keeps it in memory and sends it as
 * a Bearer header, per the plan in utils/jwt.js.
 */

const REFRESH_COOKIE = "refreshToken";

/**
 * SameSite, and why it has to change once this is deployed.
 *
 * In development the client and the API are both on localhost, which the
 * browser treats as one site. "strict" works there and gives free CSRF
 * protection: the cookie is never sent on a request that originated anywhere
 * else.
 *
 * Deployed, the client is on GitHub Pages and the API is on Render. Those are
 * different sites, so a "strict" cookie is neither stored nor sent - sign-in
 * appears to succeed and then every page refresh signs the user out again.
 * Cross-site cookies need sameSite "none", and browsers only accept "none"
 * together with secure, so the API must be served over HTTPS (Render is).
 *
 * What that costs: "none" gives up the CSRF protection "strict" was providing.
 * What remains is that the cookie is httpOnly so JavaScript cannot read it,
 * that it is scoped to /api/auth so it rides on no other request, and that
 * CORS admits exactly one origin. A system moving real money would add a CSRF
 * token on top of that; this is a prototype with a simulated gateway, and the
 * trade is written down here rather than left for someone to discover.
 */
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
