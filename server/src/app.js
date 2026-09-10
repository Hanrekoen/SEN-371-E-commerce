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

// Builds the Express application. Does NOT listen - server.js does that,
// so tests can import this app without opening a port.
//
// PERSON 2 OWNS THIS FILE this milestone.
//
// The order below is the security story, and it is deliberate. Read it as a
// funnel: each layer either rejects the request or narrows what reaches the
// next one, cheapest checks first.

const app = express();

// Who is this request from? Everything IP-based depends on the answer, so it
// has to be settled before the first limiter. See config/env.js.
app.set("trust proxy", env.trustProxy);

// 1. Response headers. Nothing to parse, applies to every response including
//    errors, so it goes first and cannot be skipped by an early return.
app.use(helmet());

// 2. Origin. A browser request from an origin that is not the client is
//    refused before any work is done on it.
app.use(cors({ origin: env.clientOrigin, credentials: true }));

// 3. Volume, before body parsing. A flood should be rejected without ever
//    paying to JSON-parse it - putting the limiter after express.json would
//    mean parsing every request in the flood before dropping it.
app.use("/api", apiLimiter);

// 4. Parse. The 1mb cap is itself a control: it bounds what a single request
//    can cost to hold in memory.
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 5. Shape the parsed input. Both need the body, so they follow the parser.
//    Sanitisation is the backstop behind per-route validation, not a
//    substitute for it - see middleware/sanitize.js.
app.use(mongoSanitize);
app.use(preventParamPollution);

// 6. Writes are held to a tighter budget than reads.
app.use("/api", writeLimiter);

if (env.nodeEnv !== "test") app.use(morgan("dev"));

app.use("/api", routes);

// Order matters: 404 catcher, then the error handler, always last.
app.use(notFound);
app.use(errorHandler);

module.exports = app;
