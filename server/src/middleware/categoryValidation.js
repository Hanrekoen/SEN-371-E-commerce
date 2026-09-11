// validation rules for creating and updating categories
// NOTE: using express-validator directly here because middleware/validate.js
// from Person 2 was not pushed yet when this was written. once it exists,
// this whole file probably needs to change to match how everyone else is
// doing validation. check with Person 2 first.

const { body, validationResult } = require("express-validator");

const categoryRules = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 60 })
    .withMessage("name must be between 2 and 60 characters"),

  body("slug")
    .trim()
    .matches(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    .withMessage("slug must be lowercase letters, numbers and hyphens only"),

  body("description")
    .optional()
    .isLength({ max: 300 })
    .withMessage("description must be 300 characters or less"),
];

// checks the rules above and sends a 400 if any of them failed
// this goes after categoryRules in the route, like:
// router.post("/categories", categoryRules, checkCategoryValidation, createCategory)
function checkCategoryValidation(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      data: null,
      error: {
        message: "validation failed",
        details: errors.array(),
      },
      meta: null,
    });
  }

  next();
}

module.exports = { categoryRules, checkCategoryValidation };
