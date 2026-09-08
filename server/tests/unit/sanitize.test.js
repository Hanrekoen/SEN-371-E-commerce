"use strict";
const express = require("express");
const request = require("supertest");
const { mongoSanitize, preventParamPollution } = require("../../src/middleware/sanitize");

// PERSON 2 - the injection backstop and the parameter-pollution guard.

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(mongoSanitize);
  app.use(preventParamPollution);
  app.post("/echo", (req, res) => res.json({ body: req.body, query: req.query }));
  app.get("/echo", (req, res) => res.json({ query: req.query }));
  return app;
}

let app;
let warn;

beforeEach(() => {
  app = buildApp();
  warn = jest.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => warn.mockRestore());

describe("mongoSanitize", () => {
  test("strips a $ operator from a login-shaped body", async () => {
    const res = await request(app).post("/echo").send({ email: { $gt: "" }, password: "x" });
    expect(res.body.body).toEqual({ email: {}, password: "x" });
  });

  test("strips operators nested in objects and arrays", async () => {
    const res = await request(app).post("/echo").send({
      filter: { price: { $where: "1==1" }, name: "ok" },
      items: [{ $ne: null }, { id: 2 }],
    });
    expect(res.body.body).toEqual({
      filter: { price: {}, name: "ok" },
      items: [{}, { id: 2 }],
    });
  });

  test("strips dotted keys, which Mongo reads as paths", async () => {
    const res = await request(app).post("/echo").send({ "user.role": "admin", name: "ok" });
    expect(res.body.body).toEqual({ name: "ok" });
  });

  test("leaves ordinary input completely alone", async () => {
    const clean = { name: "Widget", priceCents: 34900, tags: ["a", "b"], nested: { ok: true } };
    const res = await request(app).post("/echo").send(clean);
    expect(res.body.body).toEqual(clean);
  });

  test("strips a $ key from the query string too", async () => {
    const res = await request(app).get("/echo?%24where=bad&page=2");
    expect(res.body.query).toEqual({ page: "2" });
  });

  test("logs what it removed - an operator key is never a typo", async () => {
    await request(app).post("/echo").send({ email: { $gt: "" } });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("email.$gt"));
  });

  test("does not recurse without bound on a deeply nested body", async () => {
    let deep = { $bad: 1 };
    for (let i = 0; i < 50; i += 1) deep = { level: deep };
    const res = await request(app).post("/echo").send(deep);
    expect(res.status).toBe(200);
  });
});

describe("preventParamPollution", () => {
  test("?limit=1&limit=99999 collapses to one value", async () => {
    const res = await request(app).get("/echo?limit=1&limit=99999&page=2");
    expect(res.body.query).toEqual({ limit: "99999", page: "2" });
  });

  test("the surviving value is the one validation will reject", async () => {
    // Last wins on purpose: the polluted request fails loudly at validation
    // instead of quietly succeeding with the harmless first value.
    const res = await request(app).get("/echo?limit=1&limit=99999");
    expect(res.body.query.limit).toBe("99999");
  });

  test("a single value is untouched", async () => {
    const res = await request(app).get("/echo?limit=25");
    expect(res.body.query).toEqual({ limit: "25" });
  });

  test("logs the collapse", async () => {
    await request(app).get("/echo?sort=a&sort=b");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("sort (2 values)"));
  });
});
