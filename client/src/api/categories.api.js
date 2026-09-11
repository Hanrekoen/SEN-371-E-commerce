import { request } from "./httpClient";

export function listCategories() {
  return request("/categories", { auth: false });
}

export function getCategory(slug) {
  return request(`/categories/${slug}`, { auth: false });
}