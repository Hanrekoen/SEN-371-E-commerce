"use strict";
const BaseRepository = require("./base.repository");
const User = require("../models/user.model");

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  // Login needs the hash; passwordHash is select:false on the schema so
  // every other caller gets a document without it by default.
  async findByEmailWithPassword(email) {
    return this.model.findOne({ email: email.toLowerCase().trim() }).select("+passwordHash").exec();
  }

  async findByEmail(email) {
    return this.findOne({ email: email.toLowerCase().trim() });
  }

  // Logout invalidates every outstanding refresh token by bumping the
  // version the token's payload must match (see auth.service.refresh).
  async incrementTokenVersion(userId) {
    return this.model.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } }, { new: true }).exec();
  }
}

module.exports = new UserRepository();
