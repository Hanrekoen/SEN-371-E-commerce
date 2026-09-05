"use strict";
const bcrypt = require("bcrypt");

// Pure helper, no Express or Mongoose - matches the rest of utils/.
// 12 rounds is bcrypt's commonly recommended default for interactive
// login (higher costs more per request; this app hashes on every
// register and login, so it must stay bounded).
const SALT_ROUNDS = 12;

async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

module.exports = { hashPassword, comparePassword };
