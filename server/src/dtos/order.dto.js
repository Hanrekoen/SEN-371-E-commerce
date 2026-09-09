"use strict";

function toOrderDTO(order) {
    const O = typeof order.toObject === "function" ? order.toObject() : order;

    return {
        id: String(O._id),
        orderNumber: O.orderNumber,
        userId: String(O.userId),
        items: O.items.map((item) => ({
            productId: String(item.productId),
            name: item.name,
            finish: item.finish,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
        })),
        subtotalCents: O.totalCents,
        shippingCents: O.shippingCents,
        taxCents: O.taxCents,
        totalCents: O.totalCents,
        status: O.status,
        shippingAddress: O.shippingAddress,
        paymentReference: O.paymentReference || null,
        createdAt: O.createdAt,
        updatedAt: O.updatedAt,
    };
}

function toOrderListDTO(orders) {
    return orders.map((toOrderDTO));
}