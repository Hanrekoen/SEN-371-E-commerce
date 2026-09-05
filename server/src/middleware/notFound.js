"use strict";
const { NotFoundError } = require("../errors/AppError");

// Mounted after all routes, before the error handler.
module.exports = function notFound(req, _res, next) {
  next(new NotFoundError("Route " + req.method + " " + req.originalUrl));
};
