"use strict";
const app = require("./app");
const env = require("./config/env");
const { connect, disconnect } = require("./config/database");

async function start() {
  try {
    await connect();
    const server = app.listen(env.port, () =>
      console.log("[api] listening on http://localhost:" + env.port + " (" + env.nodeEnv + ")")
    );

    const shutdown = async (signal) => {
      console.log("\n[api] " + signal + " received, shutting down");
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
