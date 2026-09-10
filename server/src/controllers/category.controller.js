"use strict";
const categoryService = require("../services/category.service");
const { toCategoryDto, toCategoryListDto } = require("../dtos/category.dto");
const { ok, created, noContent, paginated } = require("../utils/response");

// Milestone 3: no endpoint returns a raw Mongoose document. Every response
// here goes through the category DTO, so _id becomes id and __v never leaves
// the server.

async function list(req, res) {
  const { page = 1, limit = 20 } = req.query;
  const result = await categoryService.list({ page: Number(page), limit: Number(limit) });
  return paginated(res, toCategoryListDto(result.items), result);
}

async function getbyslug(req, res) {
  return ok(res, toCategoryDto(await categoryService.getbyslug(req.params.slug)));
}

async function create(req, res) {
  return created(res, toCategoryDto(await categoryService.create(req.body)));
}

async function update(req, res) {
  return ok(res, toCategoryDto(await categoryService.update(req.params.id, req.body)));
}

async function remove(req, res) {
  await categoryService.remove(req.params.id);
  return noContent(res);
}

module.exports = { list, getbyslug, update, remove, create };
