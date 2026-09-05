"use strict";
const mongoose = require("mongoose");
const env = require("./env");

// Registering every schema before any query runs. Without this a .populate()
// on a model that has not been required yet throws MissingSchemaError.
require("../models");

// Singleton - one connection pool per process.
let connection = null;

async function connect(uri) {
  if (connection) return connection;
  mongoose.set("strictQuery", true);
  mongoose.connection.on("connected", () => console.log("[db] connected"));
  mongoose.connection.on("error", (e) => console.error("[db] error:", e.message));
  mongoose.connection.on("disconnected", () => console.warn("[db] disconnected"));
  connection = await mongoose.connect(uri || env.mongoUri, { serverSelectionTimeoutMS: 10000 });
  return connection;
}

async function disconnect() {
  if (!connection) return;
  await mongoose.disconnect();
  connection = null;
}

module.exports = { connect, disconnect, mongoose };
