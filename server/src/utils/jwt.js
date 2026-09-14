const jwt = require('jsonwebtoken');
const env = require('../config/env');

// Two distinct secrets (access/refresh), never reused or shared across
// environments. The short-lived access token is sent as Bearer and carries id +
// role so authorization needs no extra DB call; the longer-lived refresh token
// only mints access tokens. TTLs come from config/env.js (ACCESS_TOKEN_TTL /
// REFRESH_TOKEN_TTL) - one source of truth for expiry.
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
