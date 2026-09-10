const express = require("express");
const router = express.Router();

// TODO: fix this path to match where your Category model actually lives
const Category = require("../models/category.model");

const { toCategoryDto, toCategoryListDto } = require("../dtos/category.dto");
const {
  categoryRules,
  checkCategoryValidation,
} = require("../middleware/categoryValidation");

// GET /categories
// this used to return everything with no pagination. now it pages like
// products and orders do, so the response shape matches the rest of the API.
router.get("/", async (req, res, next) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 20;

    if (page < 1) page = 1;
    if (limit < 1) limit = 1;
    if (limit > 100) limit = 100;

    const skip = (page - 1) * limit;

    const categories = await Category.find().skip(skip).limit(limit);
    const total = await Category.countDocuments();

    res.status(200).json({
      success: true,
      data: toCategoryListDto(categories),
      error: null,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /categories/:id
router.get("/:id", async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { message: "category not found" },
        meta: null,
      });
    }

    res.status(200).json({
      success: true,
      data: toCategoryDto(category),
      error: null,
      meta: null,
    });
  } catch (err) {
    next(err);
  }
});

// POST /categories
router.post("/", categoryRules, checkCategoryValidation, async (req, res, next) => {
  try {
    // only taking the fields we actually accept, not the whole body
    // stops someone from sneaking extra fields into the document
    const newCategory = await Category.create({
      name: req.body.name,
      slug: req.body.slug,
      description: req.body.description,
    });

    res.status(201).json({
      success: true,
      data: toCategoryDto(newCategory),
      error: null,
      meta: null,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /categories/:id
router.put("/:id", categoryRules, checkCategoryValidation, async (req, res, next) => {
  try {
    const updated = await Category.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name,
        slug: req.body.slug,
        description: req.body.description,
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { message: "category not found" },
        meta: null,
      });
    }

    res.status(200).json({
      success: true,
      data: toCategoryDto(updated),
      error: null,
      meta: null,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;