// takes a category document from the database and returns only what the client should see
// removes _id, __v and turns _id into id like everyone else is doing

function toCategoryDto(category) {
  return {
    id: category._id.toString(),
    name: category.name,
    slug: category.slug,
    description: category.description,
  };
}

// same thing but for a list of categories
function toCategoryListDto(categories) {
  return categories.map(toCategoryDto);
}

module.exports = { toCategoryDto, toCategoryListDto };