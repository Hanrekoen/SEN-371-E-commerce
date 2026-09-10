"use strict";
const express = require("express");

// PERSON 1 IS THE ONLY ONE WHO EDITS THIS FILE.
// Export a router from your own routes file and ask for it to be mounted here.

const router = express.Router();

router.get("/health", (_req, res) =>
  res.json({
    success: true,
    data: { status: "ok", time: new Date().toISOString() },
    error: null,
    meta: null,
  })
);

// 4.1: Swagger UI at /api/docs, raw spec at /api/openapi.json. Guarded -
// documentation is not worth failing a boot over.
try {
  const swaggerUi = require("swagger-ui-express");
  const openapi = require("../../../docs/openapi.json");

  router.get("/openapi.json", (_req, res) => res.json(openapi));
  router.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(openapi, {
      customSiteTitle: "GadgetVault API",
      swaggerOptions: { persistAuthorization: true },
    })
  );
} catch (err) {
  console.warn("[api] /api/docs is not being served: " + err.message);
}

router.use("/auth", require("./auth.routes"));                // Person 2
router.use("/products", require("./product.routes"));         // Person 1
router.use("/categories", require("./category.routes"));      // Person 4
router.use("/cart", require("./cart.routes"));                 // Person 3
router.use("/orders", require("./order.routes"));             // Person 1
router.use("/admin", require("./admin.routes"));              // Person 1

module.exports = router;
