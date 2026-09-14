"use strict";
const app = require("./app");
const env = require("./config/env");
const { connect, disconnect } = require("./config/database");

/**
 * Start the mock payment gateway alongside the API.
 *
 * It gets its OWN listener on its OWN port rather than being mounted into the
 * API's router, so the API still reaches it the way it would reach a real
 * provider: an HTTP request to another origin, carrying an API key, that can
 * time out or fail. Sharing a process is a convenience for whoever has to run
 * this - it is not a shortcut through the integration.
 *
 * If it cannot bind, the API still starts. Checkout then answers 503 saying
 * the provider is unreachable, which is true, and is exactly the case the
 * payment code was built to handle.
 */
function startGateway() {
  if (!env.payment.embedded) {
    console.log("[gateway] PAYMENT_EMBEDDED=false - expecting a gateway at " + env.payment.apiUrl);
    return null;
  }

  const gatewayApp = require("./gateway/app");

  // Bound to the loopback interface rather than 0.0.0.0. Only this process
  // ever calls it, so it has no business being reachable from outside the
  // machine - and on a managed host the platform's port scanner finds a
  // second externally-bound port and logs it every minute as a new open port,
  // which is noise at best and a routing mistake at worst.
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
