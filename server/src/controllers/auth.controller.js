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

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "strict",
    path: "/api/auth", // only sent back to auth endpoints, not every request
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7d - keep in sync with REFRESH_TOKEN_TTL
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
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

module.exports = { register, login, refresh, logout };
