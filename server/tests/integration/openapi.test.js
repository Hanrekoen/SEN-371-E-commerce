"use strict";

// Guards the OpenAPI document against the code. A hand-written spec goes
// stale silently, so these compare it with the routes in both directions.

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/sen371-test";
process.env.JWT_ACCESS_SECRET = "test-access-secret-not-a-real-key";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-not-a-real-key";

const fs = require("fs");
const path = require("path");
const spec = require("../../../docs/openapi.json");

const METHODS = ["get", "post", "put", "patch", "delete"];

// Read from the route source, not Express internals - Express 5 removed the
// layer.regexp that reflection relied on.
const ROUTES_DIR = path.join(__dirname, "..", "..", "src", "routes");
const INDEX = fs.readFileSync(path.join(ROUTES_DIR, "index.js"), "utf8");

// Express writes :id, OpenAPI writes {id}.
const normalise = (p) => p.replace(/:([A-Za-z0-9_]+)/g, "{$1}").replace(/\/+$/, "") || "/";

function declaredIn(source, prefix) {
  const out = [];
  const re = /router\.(get|post|put|patch|delete)\(\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    out.push(`${m[1].toUpperCase()} /api${normalise(prefix + m[2])}`);
  }
  return out;
}

const liveRoutes = declaredIn(INDEX, "");
const mountRe = /router\.use\(\s*"([^"]+)"\s*,\s*require\("\.\/([^"]+)"\)/g;
let mount;
while ((mount = mountRe.exec(INDEX)) !== null) {
  const file = path.join(ROUTES_DIR, mount[2].endsWith(".js") ? mount[2] : `${mount[2]}.js`);
  liveRoutes.push(...declaredIn(fs.readFileSync(file, "utf8"), mount[1]));
}

// Routes that exist but are deliberately not in the spec: the spec endpoint
// itself, and Swagger UI's own assets.
const UNDOCUMENTED = [/^GET \/api\/openapi\.json$/, /^GET \/api\/docs/];
const documentedLiveRoutes = liveRoutes.filter((r) => !UNDOCUMENTED.some((re) => re.test(r)));

const specRoutes = Object.entries(spec.paths).flatMap(([p, ops]) =>
  Object.keys(ops).filter((m) => METHODS.includes(m)).map((m) => `${m.toUpperCase()} /api${p}`)
);

describe("the document itself is well formed", () => {
  test("it is OpenAPI 3 with a title and a server", () => {
    expect(spec.openapi).toMatch(/^3\./);
    expect(spec.info.title).toBeTruthy();
    expect(spec.servers.length).toBeGreaterThan(0);
  });

  test("bearerAuth is declared", () => {
    expect(spec.components.securitySchemes.bearerAuth).toMatchObject({ type: "http", scheme: "bearer" });
  });

  test("every $ref resolves", () => {
    const broken = [];
    const walk = (node) => {
      if (!node || typeof node !== "object") return;
      if (typeof node.$ref === "string") {
        const parts = node.$ref.replace(/^#\//, "").split("/");
        let cursor = spec;
        for (const part of parts) cursor = cursor?.[part];
        if (cursor === undefined) broken.push(node.$ref);
      }
      Object.values(node).forEach(walk);
    };
    walk(spec);
    expect(broken).toEqual([]);
  });

  test("every operation documents its failure modes, not just the happy path", () => {
    const thin = [];
    for (const [path, ops] of Object.entries(spec.paths)) {
      for (const [method, op] of Object.entries(ops)) {
        if (!METHODS.includes(method)) continue;
        const codes = Object.keys(op.responses || {});
        const hasSuccess = codes.some((c) => c.startsWith("2"));
        const hasFailure = codes.some((c) => c.startsWith("4") || c.startsWith("5"));
        if (!hasSuccess || !hasFailure) thin.push(`${method.toUpperCase()} ${path}`);
      }
    }
    expect(thin).toEqual([]);
  });

  test("every protected operation is marked as needing a token", () => {
    const shouldBeProtected = ["/cart", "/orders", "/admin"];
    const unmarked = [];
    for (const [path, ops] of Object.entries(spec.paths)) {
      if (!shouldBeProtected.some((p) => path.startsWith(p))) continue;
      for (const [method, op] of Object.entries(ops)) {
        if (!METHODS.includes(method)) continue;
        const declared = op.security ?? spec.security;
        if (!declared || declared.length === 0) unmarked.push(`${method.toUpperCase()} ${path}`);
      }
    }
    expect(unmarked).toEqual([]);
  });
});

describe("the document matches the code", () => {
  test("it found the real routes (sanity check on the reader)", () => {
    expect(liveRoutes.length).toBeGreaterThan(20);
  });

  test("every documented endpoint exists in the app", () => {
    const ghosts = specRoutes.filter((r) => !documentedLiveRoutes.includes(r));
    expect(ghosts).toEqual([]);
  });

  test("every endpoint in the app is documented", () => {
    const undocumented = documentedLiveRoutes.filter((r) => !specRoutes.includes(r));
    expect(undocumented).toEqual([]);
  });
});
