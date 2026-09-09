import { request } from "./httpClient";

export function getCart() {
  return request("/cart");
}

export function addItem({ productId, quantity, finish }) {
  return request("/cart/items", { method: "POST", body: { productId, quantity, finish } });
}

export function updateQuantity(productId, quantity) {
  return request(`/cart/items/${productId}`, { method: "PATCH", body: { quantity } });
}

export function removeItem(productId) {
  return request(`/cart/items/${productId}`, { method: "DELETE" });
}

export function clearCart() {
  return request("/cart", { method: "DELETE" });
}
