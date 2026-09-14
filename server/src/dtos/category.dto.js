// Drops _id/__v and exposes id, matching the shape the other DTOs return.

function toCategoryDto(category) {
  return {
    id: category._id.toString(),
    name: category.name,
    slug: category.slug,
    description: category.description,
  };
}

function toCategoryListDto(categories) {
  return categories.map(toCategoryDto);
}

module.exports = { toCategoryDto, toCategoryListDto };