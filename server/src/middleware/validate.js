"use strict";

const { validationResult, matchedData } = require("express-validator");
const { ValidationError } = require("../errors/AppError");

// PERSON 2 OWNS THIS FILE - nobody else edits it.
//
// Shared express-validator adapter.
//
// Every route validates through this one middleware, so a failed check
// leaves the request the same way every other failure does: as an AppError
// travelling to middleware/errorHandler.js, which renders the project's
// { success, data, error, meta } envelope. No route builds its own 400.
//
// Extracted from routes/auth.routes.js in Milestone 3 so that products,
// orders, cart and categories share one implementation rather than four
// copies that drift apart.
//
//   const { body } = require("express-validator");
//   const validate = require("../middleware/validate");
//
//   const createRules = [
//     body("name").trim().isLength({ min: 2, max: 120 }),
//     body("priceCents").isInt({ min: 0 }).toInt(),
//   ];
//
//   router.post("/", createRules, validate, asyncHandler(controller.create));
//
// The rules run first and record their findings on the request; this
// middleware reads them and decides. That order is not optional - validate
// goes after the rules array and before the handler. validate.chain() at
// the bottom keeps the two together if you would rather not rely on
// remembering.

// express-validator reports one entry per failed rule. Reduce each to the
// two fields the API contract promises - which field, and what is wrong -
// so error.details has the same shape on every endpoint and the React
// client can map it straight onto form fields.
//
// Deliberately no `value`. A rejected password, token or card number would
// otherwise be echoed back in the response body and into any log that
// records it. The client already knows what it sent.
function toDetail(error) {
  // A oneOf() group reports type "alternative" and has no single path.
  if (error.type === "alternative" || error.type === "alternative_grouped") {
    return { field: error.path || "_group", message: error.msg };
  }

  // checkExact() reports the offending keys in error.fields.
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
      new ValidationError(
        "Request validation failed",
        result.array().map(toDetail)
      )
    );
  }

  return next();
}

// Binds a rules array to the middleware so a route cannot mount one half
// without the other:
//
//   router.post("/", validate.chain(createRules), asyncHandler(controller.create));
//
// Identical to `createRules, validate` - Express flattens nested arrays of
// handlers - except there is no way to forget the second half. Forgetting
// it is silent: the rules still run, nothing ever reads the result, and
// every invalid request sails through to the service.
validate.chain = function chain(rules) {
  if (!Array.isArray(rules)) {
    throw new TypeError("validate.chain expects an array of validation rules");
  }
  return [...rules, validate];
};

// The validated fields only - the mass-assignment defence.
//
// service.create(req.body) hands Mongoose every key the client sent,
// including ones no rule covers: ratingAverage, ratingCount, role,
// isActive. This returns only the fields some rule actually declared, so
// the whitelist IS the rules array and cannot drift away from it.
//
//   const payload = validate.data(req);
//   const product = await productService.create(payload);
//
// Use it after validate, never instead of it. On its own it reports
// nothing when a field is invalid - it simply leaves the field out.
validate.data = function data(req, locations = ["body"]) {
  return matchedData(req, {
    locations,
    includeOptionals: false,
    onlyValidData: true,
  });
};

module.exports = validate;
