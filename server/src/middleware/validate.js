"use strict";

const { validationResult, matchedData } = require("express-validator");
const { ValidationError } = require("../errors/AppError");

// PERSON 2 OWNS THIS FILE.
// Shared express-validator adapter: a failed check becomes an AppError, so it
// reaches the client in the same envelope as every other failure.

// No `value` in the details, deliberately: it would echo a rejected password
// or card number back to the client and into any log of the response.
function toDetail(error) {
  if (error.type === "alternative" || error.type === "alternative_grouped") {
    return { field: error.path || "_group", message: error.msg };
  }
  if (error.type === "unknown_fields") {
    const fields = (error.fields || []).map((f) => f.path).join(", ");
    return { field: fields || "_unknown", message: error.msg };
  }
  return { field: error.path, message: error.msg };
}

function validate(req, _res, next) {
  const result = validationResult(req);

  if (!result.isEmpty()) {
    return next(
      new ValidationError("Request validation failed", result.array().map(toDetail))
    );
  }

  return next();
}

// Binds rules to the check so a route cannot mount one without the other.
// Forgetting `validate` is silent: the rules run and nothing reads the result.
validate.chain = function chain(rules) {
  if (!Array.isArray(rules)) {
    throw new TypeError("validate.chain expects an array of validation rules");
  }
  return [...rules, validate];
};

// The mass-assignment whitelist: only fields a rule declared. Passing
// req.body straight to a service lets a client set ratingAverage or role.
// Use after validate, never instead of it.
validate.data = function data(req, locations = ["body"]) {
  return matchedData(req, { locations, includeOptionals: false, onlyValidData: true });
};

module.exports = validate;
