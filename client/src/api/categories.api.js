import { request } from "./httpClient";

export function listCategories() {
  return request("/categories", { auth: false });
}

export function getCategory(slug) {
  return request(`/categories/${slug}`, { auth: false });
}

// Admin. These existed in the API since Milestone 3 but were uncalled until
// the admin category page - which is why an admin could not add a product.

export function createCategory({ name, slug, description }) {
  return request("/categories", { method: "POST", body: { name, slug, description } });
}

export function updateCategory(id, { name, slug, description }) {
  return request(`/categories/${id}`, { method: "PUT", body: { name, slug, description } });
}

export function deleteCategory(id) {
  return request(`/categories/${id}`, { method: "DELETE" });
}
