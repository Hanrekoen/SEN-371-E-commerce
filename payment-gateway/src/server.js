"use strict";
const app = require("./app");

const PORT = Number(process.env.GATEWAY_PORT) || 5001;

app.listen(PORT, () => {
  console.log(`[gateway] listening on http://localhost:${PORT}`);
  console.log("[gateway] POST /authorize   header: x-api-key");
});
