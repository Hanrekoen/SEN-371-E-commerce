"use strict";
const crypto = require("crypto");
const userRepository = require("../repositories/user.repository");
const { hashPassword, comparePassword } = require("../utils/password");
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require("../utils/jwt");
const { ConflictError, UnauthorizedError } = require("../errors/AppError");

/**
 * Business rules for authentication.
 * No req, no res, no Mongoose - only the user repository, password/jwt
 * helpers and error classes, so this is unit-testable against a fake
 * repository (see ARCHITECTURE.md).
 */

// Strips fields a client should never see. passwordHash is already
// excluded by the schema's select:false, but a caller that used
// findByEmailWithPassword (login) still has it on the document, so this
// is the one place every response is sanitised before it leaves the layer.
function toPublicUser(user) {
  return {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

function issueTokens(user) {
  const accessToken = signAccessToken({ id: user._id.toString(), role: user.role });
  // jti makes every refresh token unique even if issued in the same
  // second as the last one - without it, rotating right after login
  // (same id + tokenVersion + iat) would sign an identical token.
  const refreshToken = signRefreshToken({
    id: user._id.toString(),
    tokenVersion: user.tokenVersion,
    jti: crypto.randomUUID(),
  });
  return { accessToken, refreshToken };
}

async function register({ firstName, lastName, email, password }) {
  const existing = await userRepository.findByEmail(email);
  if (existing) throw new ConflictError("An account with that email already exists");

  const passwordHash = await hashPassword(password);
  const user = await userRepository.create({ firstName, lastName, email, passwordHash });

  return { user: toPublicUser(user), ...issueTokens(user) };
}

async function login(email, password) {
  const user = await userRepository.findByEmailWithPassword(email);

  // Same message whether the email doesn't exist or the password is
  // wrong - distinguishing the two lets an attacker enumerate accounts.
  const invalid = () => new UnauthorizedError("Invalid email or password");
  if (!user || !user.isActive) throw invalid();

  const matches = await comparePassword(password, user.passwordHash);
  if (!matches) throw invalid();

  return { user: toPublicUser(user), ...issueTokens(user) };
}

/**
 * Exchanges a valid refresh token for a new access token, and rotates the
 * refresh token itself (issuing a new one each time limits how long a
 * stolen refresh token stays useful).
 */
async function refresh(refreshToken) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new UnauthorizedError("Invalid or expired refresh token");
  }

  const user = await userRepository.findById(payload.id);

  // tokenVersion mismatch means the user logged out (or was logged out
  // elsewhere) since this refresh token was issued.
  if (!user || !user.isActive || user.tokenVersion !== payload.tokenVersion) {
    throw new UnauthorizedError("Session is no longer valid");
  }

  return issueTokens(user);
}

// Bumping tokenVersion invalidates every refresh token issued before
// this call, on every device, without needing a token blocklist.
async function logout(userId) {
  await userRepository.incrementTokenVersion(userId);
}

module.exports = { register, login, refresh, logout, toPublicUser };
