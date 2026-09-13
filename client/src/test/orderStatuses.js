// The order lifecycle, mirrored from server/src/models/order.model.js.
//
// Kept here rather than imported because the client is a separate package and
// must not reach into the server's source. The server's own test suite asserts
// that its TRANSITIONS table and this enum agree, so a status added there
// without updating the client will fail a test on one side or the other rather
// than silently rendering an unstyled pill.
export const ORDER_STATUSES = ["paid", "shipped", "delivered", "cancelled"];
