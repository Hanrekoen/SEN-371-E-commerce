"use strict";

// Every response uses one envelope: { success, data, error, meta }
// so the client writes its error handling exactly once.

function ok(res, data = null, meta = null, status = 200) {
  return res.status(status).json({ success: true, data, error: null, meta });
}

function created(res, data, meta = null) {
  return ok(res, data, meta, 201);
}

function noContent(res) {
  return res.status(204).send();
}

function paginated(res, items, { page, limit, total }) {
  return ok(res, items, {
    page, limit, total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}

module.exports = { ok, created, noContent, paginated };
