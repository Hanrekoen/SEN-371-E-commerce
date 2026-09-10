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
const { apiLimiter, writeLimiter } = require("./middleware/rateLimit");
const { mongoSanitize, preventParamPollution } = require("./middleware/sanitize");

// Builds the app; server.js listens, so tests can import this without a port.
//
// PERSON 2 OWNS THIS FILE this milestone. The order below is deliberate:
// each layer rejects the request or narrows it, cheapest checks first.

const app = express();

// Settled before the first limiter - everything IP-based depends on it.
app.set("trust proxy", env.trustProxy);

app.use(helmet());
app.use(cors({ origin: env.clientOrigin, credentials: true }));

// Before body parsing, so a flood is rejected without paying to parse it.
app.use("/api", apiLimiter);

app.use(express.json({ limit: "1mb" })); // the cap is itself a control
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Need the parsed body, so they follow the parser.
app.use(mongoSanitize);
app.use(preventParamPollution);

app.use("/api", writeLimiter);

if (env.nodeEnv !== "test") app.use(morgan("dev"));

app.use("/api", routes);

// Order matters: 404 catcher, then the error handler, always last.
app.use(notFound);
app.use(errorHandler);

module.exports = app;
