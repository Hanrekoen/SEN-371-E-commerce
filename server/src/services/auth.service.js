"use strict";
const crypto = require("crypto");
const userRepository = require("../repositories/user.repository");
const { hashPassword, comparePassword } = require("../utils/password");
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require("../utils/jwt");
const { ConflictError, UnauthorizedError } = require("../errors/AppError");

// Auth business rules. No req, res or Mongoose here - only the repository and
// helpers - so this is unit-testable against a fake repository (ARCHITECTURE.md).

// The one place every response is sanitised: select:false already hides
// passwordHash, but a login via findByEmailWithPassword still has it loaded.
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
  // jti keeps each refresh token unique: without it, rotating within the same
  // second as login (same id + tokenVersion + iat) signs an identical token.
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

// Rotates the refresh token as well as issuing an access token - a new one each
// time limits how long a stolen refresh token stays useful.
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

// Re-read from the database, not decoded from the token: a token can outlive a
// deactivation or role change. The client calls this on every page load, so an
// account disabled mid-session stops working on the next reload.
async function getPublicUser(userId) {
  const user = await userRepository.findById(userId);
  if (!user || !user.isActive) {
    throw new UnauthorizedError("Session is no longer valid");
  }
  return toPublicUser(user);
}

module.exports = { register, login, refresh, logout, getPublicUser, toPublicUser };
