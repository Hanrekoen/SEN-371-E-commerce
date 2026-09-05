"use strict";

// Wraps an async controller so a rejected promise reaches the error
// middleware instead of hanging the request.
//   router.get("/", asyncHandler(controller.list));

module.exports = function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
