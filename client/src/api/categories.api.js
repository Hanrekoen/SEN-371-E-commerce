import { request } from "./httpClient";

export function listCategories() {
  return request("/categories", { auth: false });
}

export function getCategory(slug) {
  return request(`/categories/${slug}`, { auth: false });
}

// --- admin ---
// The API has had these since Milestone 3, but nothing in the app called them
// until the admin category page was built, which is why an admin could end up
// unable to add a product at all.

export function createCategory({ name, slug, description }) {
  return request("/categories", { method: "POST", body: { name, slug, description } });
}

export function updateCategory(id, { name, slug, description }) {
  return request(`/categories/${id}`, { method: "PUT", body: { name, slug, description } });
}

export function deleteCategory(id) {
  return request(`/categories/${id}`, { method: "DELETE" });
}
