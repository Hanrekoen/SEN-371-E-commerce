"use strict";
const categoryService = require("../services/category.service");
const { ok, created, noContent } = require("../utils/response");

async function list(req, res) {
  return ok(res, await categoryService.list());
}

async function getbyslug(req, res) {
  return ok(res, await categoryService.getbyslug(req.params.slug));
}

async function create(req, res) {
  return created(res, await categoryService.create(req.body));
}

async function update(req, res) {
  return ok(res, await categoryService.update(req.params.id, req.body));
}

async function remove(req, res) {
  await categoryService.remove(req.params.id);
  return noContent(res);
}

module.exports = { list, getbyslug, update, remove, create};