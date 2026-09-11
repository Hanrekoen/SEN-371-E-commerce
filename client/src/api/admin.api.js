import { request } from "./httpClient";
import { qs } from "./products.api";

export function getStats() {
  return request("/admin/stats");
}
export function listOrders(params) {
  return request(`/admin/orders${qs(params)}`, { withMeta: true });
}
export function updateOrderStatus(id, status) {
  return request(`/admin/orders/${id}/status`, { method: "PATCH", body: { status } });
}
export function listProducts(params) {
  return request(`/admin/products${qs(params)}`, { withMeta: true });
}
export function getProduct(id) {
  return request(`/admin/products/${id}`);
}
export function createProduct(product) {
  return request("/products", { method: "POST", body: product });
}
export function updateProduct(id, product) {
  return request(`/products/${id}`, { method: "PUT", body: product });
}
export function deactivateProduct(id) {
  return request(`/products/${id}`, { method: "DELETE" });
}
export function reactivateProduct(id) {
  return request(`/admin/products/${id}/reactivate`, { method: "PATCH" });
}
export function adjustStock(id, delta) {
  return request(`/admin/products/${id}/stock`, { method: "PATCH", body: { delta } });
}
