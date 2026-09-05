"use strict";
const cartService = require("../services/cart.service");
const { ok, created } = require("../utils/response");

// The cart always belongs to the authenticated user. userId is read from the
// verified token, never from the URL - taking it from the path would let any
// signed-in user read or edit anyone else's cart.

async function getCart(req, res) {
  return ok(res, await cartService.getCart(req.user.id));
}

async function addItem(req, res) {
  const { productId, quantity, finish } = req.body;
  const cart = await cartService.addItem(req.user.id, {
    productId,
    quantity: Number(quantity),
    finish,
  });
  return created(res, cart);
}

async function updateQuantity(req, res) {
  const cart = await cartService.updateQuantity(
    req.user.id,
    req.params.productId,
    Number(req.body.quantity)
  );
  return ok(res, cart);
}

async function removeItem(req, res) {
  return ok(res, await cartService.removeItem(req.user.id, req.params.productId));
}

async function clear(req, res) {
  return ok(res, await cartService.clear(req.user.id));
}

module.exports = { getCart, addItem, updateQuantity, removeItem, clear };
