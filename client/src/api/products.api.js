import { request } from "./httpClient";

const qs = (params) => {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") search.append(k, v);
  });
  const s = search.toString();
  return s ? `?${s}` : "";
};

export function listProducts(params) {
  return request(`/products${qs(params)}`, { auth: false, withMeta: true });
}
export function getProduct(slug) {
  return request(`/products/${slug}`, { auth: false });
}
export function listBrands() {
  return request("/products/brands", { auth: false });
}
export { qs };
