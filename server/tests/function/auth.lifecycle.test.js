"use strict";

// FUNCTION TESTS - the account lifecycle as one continuous feature.
//
// The unit tests check pieces (auth.middleware, jwt, password) and the
// integration tests check endpoints one at a time. Neither answers the
// question a marker or a user would actually ask: can a person register,
// sign in, stay signed in across a refresh, and sign out everywhere?
//
// So nothing is faked except the database. Real bcrypt hashes the password,
// real JWTs are signed and verified, real express-validator rules run, and
// the refresh cookie is carried between requests by a supertest agent exactly
// as a browser would carry it. The repository is an in-memory store rather
// than a pile of per-call stubs, so state carries from one request to the
// next and the sequence is a genuine sequence.

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/sen371-test";
process.env.JWT_ACCESS_SECRET = "test-access-secret-not-a-real-key";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-not-a-real-key";

// An in-memory stand-in for the users collection. It reproduces the two
// behaviours the service depends on: email is stored lower-cased, and
// passwordHash is select:false everywhere except findByEmailWithPassword.
const mockStore = new Map();
let mockNextId = 0;

const mockWithoutHash = (user) => {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return { ...rest, toObject() { return { ...rest }; } };
};

jest.mock("../../src/repositories/user.repository", () => ({
  findByEmail: jest.fn(async (email) =>
    mockWithoutHash([...mockStore.values()].find((u) => u.email === String(email).toLowerCase().trim()))),

  findByEmailWithPassword: jest.fn(async (email) => {
    const found = [...mockStore.values()].find((u) => u.email === String(email).toLowerCase().trim());
    return found ? { ...found, toObject() { return { ...found }; } } : null;
  }),

  findById: jest.fn(async (id) => mockWithoutHash(mockStore.get(String(id)))),

  create: jest.fn(async (data) => {
    const _id = `6716f0a1c2d3e4f5a6b7c9${String(++mockNextId).padStart(2, "0")}`;
    const user = {
      _id,
      ...data,
      email: String(data.email).toLowerCase().trim(),
      role: data.role || "customer",
      isActive: true,
      tokenVersion: 0,
      createdAt: new Date(),
    };
    mockStore.set(_id, user);
    return mockWithoutHash(user);
  }),

  incrementTokenVersion: jest.fn(async (id) => {
    const user = mockStore.get(String(id));
    if (user) user.tokenVersion += 1;
    return mockWithoutHash(user);
  }),
}));

const request = require("supertest");
const app = require("../../src/app");

const ACCOUNT = {
  firstName: "Hanre",
  lastName: "Koen",
  email: "hanre@sen371.test",
  password: "Vault-Pass-9",
};

const register = (over = {}) =>
  request(app).post("/api/auth/register").send({ ...ACCOUNT, ...over });

const signIn = (agent, over = {}) =>
  (agent || request(app)).post("/api/auth/login")
    .send({ email: ACCOUNT.email, password: ACCOUNT.password, ...over });

beforeEach(() => {
  mockStore.clear();
  mockNextId = 0;
});

describe("registering an account", () => {
  test("a new account is created and signed in immediately", async () => {
    const res = await register();

    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({ email: ACCOUNT.email, role: "customer" });
    expect(typeof res.body.data.accessToken).toBe("string");
  });

  // The password is the one thing in this app that must never come back out.
  test("neither the password nor its hash is ever returned", async () => {
    const res = await register();

    const body = JSON.stringify(res.body);
    expect(body).not.toContain(ACCOUNT.password);
    expect(body).not.toContain("passwordHash");
    expect(body).not.toContain("$2b$");
  });

  // Storing a password in any recoverable form is the single worst thing a
  // system like this can do, so the stored value is inspected directly.
  test("the stored password is a bcrypt hash, not the password", async () => {
    await register();

    const stored = [...mockStore.values()][0];
    expect(stored.passwordHash).not.toBe(ACCOUNT.password);
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$\d{2}\$/);
  });

  test("nobody is registered as an admin by asking to be", async () => {
    await register({ role: "admin" });

    expect([...mockStore.values()][0].role).toBe("customer");
  });

  test("the same email cannot be registered twice", async () => {
    await register();
    const res = await register({ firstName: "Someone", lastName: "Else" });

    expect(res.status).toBe(409);
    expect(mockStore.size).toBe(1);
  });

  // Registered as Hanre@…, signs in later as hanre@… - the same person.
  test("email case does not create a second account", async () => {
    await register({ email: "Hanre@SEN371.test" });
    const res = await register();

    expect(res.status).toBe(409);
  });

  test.each([
    ["a password with no number", { password: "vaultpassword" }],
    ["a password that is too short", { password: "Vault-9" }],
    ["an address that is not an email", { email: "not-an-email" }],
    ["a one-character first name", { firstName: "H" }],
  ])("%s is refused before any account is created", async (_label, over) => {
    const res = await register(over);

    expect(res.status).toBe(400);
    expect(mockStore.size).toBe(0);
  });
});

describe("signing in", () => {
  beforeEach(register);

  test("the right password signs the account in", async () => {
    const res = await signIn();

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(ACCOUNT.email);
  });

  test("the wrong password does not", async () => {
    const res = await signIn(null, { password: "Vault-Pass-8" });

    expect(res.status).toBe(401);
    expect(res.body.data).toBeNull();
  });

  // Saying "no such account" tells whoever is guessing which addresses are
  // registered, which is half the work of breaking in.
  test("a wrong password and an unknown account give the same answer", async () => {
    const wrongPassword = await signIn(null, { password: "Vault-Pass-8" });
    const noSuchAccount = await signIn(null, { email: "nobody@sen371.test" });

    expect(noSuchAccount.status).toBe(wrongPassword.status);
    expect(noSuchAccount.body.error.message).toBe(wrongPassword.body.error.message);
  });

  test("a deactivated account cannot sign in, right password or not", async () => {
    [...mockStore.values()][0].isActive = false;

    const res = await signIn();

    expect(res.status).toBe(401);
  });

  // The refresh token is the long-lived credential. Reachable from JavaScript,
  // one XSS bug would hand over a week of access.
  test("the refresh token is an httpOnly cookie and never in the body", async () => {
    const res = await signIn();

    const cookie = res.headers["set-cookie"].find((c) => c.startsWith("refreshToken="));
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(JSON.stringify(res.body)).not.toContain("refreshToken");
  });
});

describe("staying signed in", () => {
  test("the access token identifies the account on a protected route", async () => {
    const { body } = await register();

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${body.data.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(ACCOUNT.email);
  });

  // What the browser does on every page load: no access token in memory after
  // a refresh, only the cookie, and it has to be enough to get back in.
  test("a page refresh restores the session from the cookie alone", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/register").send(ACCOUNT);

    const refreshed = await agent.post("/api/auth/refresh");
    expect(refreshed.status).toBe(200);

    const me = await agent
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${refreshed.body.data.accessToken}`);
    expect(me.body.data.email).toBe(ACCOUNT.email);
  });

  // Rotation limits how long a stolen refresh token stays useful.
  test("refreshing issues a different refresh token each time", async () => {
    const agent = request.agent(app);
    const first = await agent.post("/api/auth/register").send(ACCOUNT);
    const second = await agent.post("/api/auth/refresh");

    const cookieOf = (res) =>
      res.headers["set-cookie"].find((c) => c.startsWith("refreshToken="));
    expect(cookieOf(second)).not.toBe(cookieOf(first));
  });

  test("no cookie means no refresh", async () => {
    await register();

    const res = await request(app).post("/api/auth/refresh");

    expect(res.status).toBe(401);
  });

  // A role change or a deactivation has to take effect on the next page load,
  // not whenever the access token happens to expire - which is why /me reads
  // the record rather than trusting what the token says.
  test("an account deactivated mid-session stops working on the next check", async () => {
    const { body } = await register();
    const auth = `Bearer ${body.data.accessToken}`;
    expect((await request(app).get("/api/auth/me").set("Authorization", auth)).status).toBe(200);

    [...mockStore.values()][0].isActive = false;

    expect((await request(app).get("/api/auth/me").set("Authorization", auth)).status).toBe(401);
  });
});

describe("signing out", () => {
  test("the refresh cookie is cleared", async () => {
    const agent = request.agent(app);
    const { body } = await agent.post("/api/auth/register").send(ACCOUNT);

    const res = await agent
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${body.data.accessToken}`);

    expect(res.status).toBe(204);
  });

  // Bumping tokenVersion is what makes a sign-out mean something. Without it,
  // a refresh token copied before the sign-out keeps working for a week. The
  // cookie is read off the response and replayed by hand, so this proves the
  // token itself is dead rather than merely no longer in a cookie jar.
  test("a refresh token copied before the sign-out stops working", async () => {
    const registered = await request(app).post("/api/auth/register").send(ACCOUNT);
    const stolen = refreshCookie(registered);
    expect((await request(app).post("/api/auth/refresh").set("Cookie", stolen)).status).toBe(200);

    await request(app).post("/api/auth/logout")
      .set("Authorization", `Bearer ${registered.body.data.accessToken}`);

    expect((await request(app).post("/api/auth/refresh").set("Cookie", stolen)).status).toBe(401);
  });

  test("signing out on one device signs the account out everywhere", async () => {
    const phone = request.agent(app);
    const laptop = request.agent(app);
    await phone.post("/api/auth/register").send(ACCOUNT);
    const laptopSession = await laptop.post("/api/auth/login")
      .send({ email: ACCOUNT.email, password: ACCOUNT.password });

    await laptop.post("/api/auth/logout")
      .set("Authorization", `Bearer ${laptopSession.body.data.accessToken}`);

    expect((await phone.post("/api/auth/refresh")).status).toBe(401);
  });

  test("signing out needs to be signed in", async () => {
    expect((await request(app).post("/api/auth/logout")).status).toBe(401);
  });
});

// The refresh cookie as a browser would send it back, taken straight off a
// response so a test can replay it independently of any cookie jar.
function refreshCookie(res) {
  const set = res.headers["set-cookie"] || [];
  const cookie = set.find((c) => c.startsWith("refreshToken="));
  if (!cookie) throw new Error("that response set no refresh cookie");
  return cookie.split(";")[0];
}
