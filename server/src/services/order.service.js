"use strict";
const orderRepository = require("../repositories/order.repository");
const cartRepository = require("../repositories/cart.repository");
const productRepository = require("../repositories/product.repository");
const orderFactory = require("./order.factory");
const {
  NotFoundError,
  ForbiddenError,
  BusinessRuleError,
} = require("../errors/AppError");

/**
 * Allowed order status transitions. Anything not listed is rejected with 422.
 */
const TRANSITIONS = {
  pending:   ["paid", "cancelled"],
  paid:      ["shipped", "cancelled"],
  shipped:   ["delivered"],
  delivered: [],
  cancelled: [],
};

/**
 * Checkout.
 *
 * Steps, in order:
 *   1. load the cart, reject if empty
 *   2. load every product, reject if any is missing or inactive
 *   3. decrement stock atomically, one item at a time
 *   4. if any decrement fails, put back everything already taken
 *   5. build the order with the factory and save it
 *   6. empty the cart
 */
async function checkout(userId, shippingAddress) {
  const cart = await cartRepository.findByUser(userId);
  if (!cart || cart.items.length === 0) {
    throw new BusinessRuleError("Your cart is empty");
  }

  const productIds = cart.items.map((item) => item.productId);
  const products = await productRepository.findManyByIds(productIds);

  if (products.length !== cart.items.length) {
    throw new BusinessRuleError("One or more products in your cart no longer exist");
  }
  const inactive = products.find((p) => !p.isActive);
  if (inactive) {
    throw new BusinessRuleError(`${inactive.name} is no longer available`);
  }

  // Track what we take so a later failure can be undone. Without replica-set
  // transactions this manual compensation is the available option; see README.
  const decremented = [];
  try {
    for (const item of cart.items) {
      const result = await productRepository.decrementStock(item.productId, item.quantity);
      if (!result) {
        const product = products.find((p) => String(p._id) === String(item.productId));
        throw new BusinessRuleError(
          `Not enough stock for ${product ? product.name : "an item"}`
        );
      }
      decremented.push(item);
    }

    const orderData = orderFactory.buildOrder({
      userId,
      cartItems: cart.items,
      products,
      shippingAddress,
    });

    const order = await orderRepository.create(orderData);
    await cartRepository.clear(userId);
    return order;
  } catch (err) {
    for (const item of decremented) {
      await productRepository.incrementStock(item.productId, item.quantity);
    }
    throw err;
  }
}

async function listForUser(userId, { page, limit } = {}) {
  return orderRepository.findByUser(userId, { page, limit });
}

/**
 * Ownership is re-checked against the authenticated user rather than trusting
 * the id in the URL. Trusting it is broken object-level authorisation, the most
 * commonly exploited API flaw there is.
 */
async function getForUser(orderId, userId) {
  const order = await orderRepository.findById(orderId);
  if (!order) throw new NotFoundError("Order");
  if (String(order.userId) !== String(userId)) {
    throw new ForbiddenError("That order does not belong to you");
  }
  return order;
}

async function listAll({ status, page, limit } = {}) {
  return orderRepository.findAll({ status, page, limit });
}

async function updateStatus(orderId, nextStatus) {
  const order = await orderRepository.findById(orderId);
  if (!order) throw new NotFoundError("Order");

  const allowed = TRANSITIONS[order.status] || [];
  if (!allowed.includes(nextStatus)) {
    throw new BusinessRuleError(
      `Cannot move an order from ${order.status} to ${nextStatus}`
    );
  }

  // Returning stock on cancellation keeps the catalogue honest.
  if (nextStatus === "cancelled") {
    for (const item of order.items) {
      await productRepository.incrementStock(item.productId, item.quantity);
    }
  }

  return orderRepository.setStatus(orderId, nextStatus);
}

module.exports = {
  checkout,
  listForUser,
  getForUser,
  listAll,
  updateStatus,
  TRANSITIONS,
};
