const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * JWT Security approach (System Plan):
 * - two distinct secrets (access / refresh), never reused or shared
 *   across environments
 * - access token: short-lived, sent as Bearer token, carries id + role
 *   so authorization/role-filtering doesn't need an extra DB call
 * - refresh token: longer-lived, used only to mint a new access token
 *
 * TTLs come from config/env.js (which reads ACCESS_TOKEN_TTL /
 * REFRESH_TOKEN_TTL) so there is one source of truth for expiry - the
 * .env.example file only documents those two names.
 */
function signAccessToken(payload) {
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessTtl,
  });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshTtl,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.accessSecret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwt.refreshSecret);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
