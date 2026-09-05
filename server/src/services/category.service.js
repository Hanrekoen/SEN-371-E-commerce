"use strict";
const categoryRepository = require("../repositories/category.repository");
const productRepository = require("../repositories/product.repository");
const { NotFoundError, ConflictError, BusinessRuleError } = require("../errors/AppError");

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-") 
    .replace(/^-+|-+$/g, "") 
}

async function list() {
  return categoryRepository.list();
}

async function getbyslug(slug) {
  const category = await categoryRepository.findByslug(slug);
  if (!category) throw new NotFoundError("Category");
  return category;
}

async function create(Data) {
  const slug = slugify(Data.slug || Data.name);

  const slugClash = await categoryRepository.findByslug(slug);
  if (slugClash) throw new ConflictError(`Category with slug "${slug}" already exists`);

  const nameClash = await categoryRepository.findByName(Data.name);
  if (nameClash) throw new ConflictError(`Category with name "${Data.name}" already exists`);

  return categoryRepository.create({ ...Data, slug });
}

async function update(id, Data) {
    const updates = { ...Data };

    if (updates.slug || updates.name) {
        updates.slug = slugify(updates.slug || updates.name);
        const slugClash = await categoryRepository.findByslug(updates.slug);
        if (slugClash && String(slugClash.id) !== String(id)) 
            throw new ConflictError(`Category with slug "${updates.slug}" already exists`);
    }
  const updated = await categoryRepository.updateById(id, updates);
  if (!updated) throw new NotFoundError("Category");
  return updated;
}

async function remove(id) {
  const category = await categoryRepository.findById(id);
  if (!category) throw new NotFoundError("Category");   

   const productsusingcategory = await productRepository.count({ categoryId: id });
    if (productsusingcategory > 0) {
        throw new BusinessRuleError(
          `Cannot delete  "${category.name}" - ${productsusingcategory} products still associated with this category`);
    }
  await categoryRepository.deleteById(id);
}

module.exports = {list, getbyslug, create, update, remove, slugify}; 
