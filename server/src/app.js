"use strict";
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const env = require("./config/env");
const routes = require("./routes");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

// Builds the Express application. Does NOT listen - server.js does that,
// so tests can import this app without opening a port.

const app = express();

app.use(helmet());
app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
if (env.nodeEnv !== "test") app.use(morgan("dev"));

app.use("/api", routes);

// Order matters: 404 catcher, then the error handler, always last.
app.use(notFound);
app.use(errorHandler);

module.exports = app;
