"use strict";
const app = require("./app");
const env = require("./config/env");
const { connect, disconnect } = require("./config/database");

// The mock gateway gets its own listener on its own port instead of being mounted
// into the API router, so the API reaches it like a real provider: HTTP to another
// origin, with an API key, that can time out or fail. If it cannot bind, the API
// still starts and checkout answers 503 - a case the payment code handles.
function startGateway() {
  if (!env.payment.embedded) {
    console.log("[gateway] PAYMENT_EMBEDDED=false - expecting a gateway at " + env.payment.apiUrl);
    return null;
  }

  const gatewayApp = require("./gateway/app");

  // Loopback, not 0.0.0.0: only this process calls it, and on a managed host a
  // second externally-bound port gets flagged by the port scanner every minute.
  const server = gatewayApp.listen(env.payment.gatewayPort, "127.0.0.1", () =>
    console.log("[gateway] mock payment gateway on http://localhost:" + env.payment.gatewayPort)
  );

  server.on("error", (err) => {
    const clash = err.code === "EADDRINUSE";
    console.error(
      "[gateway] could not start on port " + env.payment.gatewayPort + ": " +
      (clash ? "that port is already in use" : err.message)
    );
    console.error("[gateway] checkout will answer 503 until a gateway is reachable at " + env.payment.apiUrl);
  });

  return server;
}

async function start() {
  try {
    await connect();
    const gateway = startGateway();
    const server = app.listen(env.port, () =>
      console.log("[api] listening on http://localhost:" + env.port + " (" + env.nodeEnv + ")")
    );

    const shutdown = async (signal) => {
      console.log("\n[api] " + signal + " received, shutting down");
      if (gateway) gateway.close();
      server.close(async () => {
        await disconnect();
        process.exit(0);
      });
    };
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (err) {
    console.error("[api] failed to start:", err.message);
    process.exit(1);
  }
}

start();
