import { request } from "./httpClient";
import { qs } from "./products.api";

export function checkout({ shippingAddress, card }) {
  return request("/orders", { method: "POST", body: { shippingAddress, card } });
}
export function listMyOrders(params) {
  return request(`/orders${qs(params)}`, { withMeta: true });
}
export function getMyOrder(id) {
  return request(`/orders/${id}`);
}
