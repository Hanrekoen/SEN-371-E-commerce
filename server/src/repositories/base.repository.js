"use strict";

// The ONLY layer allowed to touch Mongoose.
// Services depend on this interface, never on the driver, which is what
// lets them be unit-tested against an in-memory fake.

class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async findById(id, options = {}) {
    return this.model.findById(id, null, options).exec();
  }

  async findOne(filter = {}, options = {}) {
    return this.model.findOne(filter, null, options).exec();
  }

  async find(filter = {}, { sort = { createdAt: -1 }, page = 1, limit = 12, populate = null } = {}) {
    const skip = (Math.max(1, page) - 1) * limit;
    let query = this.model.find(filter).sort(sort).skip(skip).limit(limit);
    if (populate) query = query.populate(populate);
    const [items, total] = await Promise.all([
      query.exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { items, total, page, limit };
  }

  async create(data) {
    return this.model.create(data);
  }

  async updateById(id, data) {
    return this.model.findByIdAndUpdate(id, data, { new: true, runValidators: true }).exec();
  }

  async deleteById(id) {
    return this.model.findByIdAndDelete(id).exec();
  }

  async exists(filter) {
    return Boolean(await this.model.exists(filter));
  }

  async count(filter = {}) {
    return this.model.countDocuments(filter).exec();
  }
}

module.exports = BaseRepository;
