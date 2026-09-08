"use strict";

// PERSON 2 - the actual API integration.
//
// This is the test that answers the Milestone 3 criterion. It starts the real
// payment-gateway service on an ephemeral port and drives MockPaymentProvider
// against it over HTTP. Nothing is mocked: a socket is opened, a request is
// serialised, a response is parsed, and every failure mode is provoked on
// purpose rather than assumed.

process.env.GATEWAY_API_KEY = "test-gateway-key";
process.env.GATEWAY_SLOW_MS = "900"; // the timeout card stalls this long

const gatewayApp = require("../../../payment-gateway/src/app");
const MockPaymentProvider = require("../../src/services/payment/MockPaymentProvider");
const { ServiceUnavailableError, ValidationError } = require("../../src/errors/AppError");

const CARD = { number: "4242424242424242", expMonth: 4, expYear: 2030, cvc: "123" };
const request = (over = {}) => ({
  amountCents: 34900,
  currency: "ZAR",
  orderNumber: "ORD-2026-000042",
  card: CARD,
  ...over,
});

let server;
let baseUrl;
let provider;
let logs;

beforeAll((done) => {
  server = gatewayApp.listen(0, () => {
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    provider = new MockPaymentProvider({
      baseUrl,
      apiKey: "test-gateway-key",
      timeoutMs: 400,
    });
    done();
  });
});

afterAll(async () => {
  // The timeout test leaves the gateway mid-sleep on an open socket. Without
  // this, server.close() waits for a connection the client already abandoned.
  if (typeof server.closeAllConnections === "function") server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

beforeEach(() => {
  logs = [];
  for (const level of ["log", "warn", "error"]) {
    jest.spyOn(console, level).mockImplementation((...a) => logs.push(a.join(" ")));
  }
});
afterEach(() => jest.restoreAllMocks());

describe("approved", () => {
  test("a real HTTP call comes back approved with a provider reference", async () => {
    const result = await provider.authorize(request());
    expect(result).toMatchObject({ approved: true, code: null });
    expect(result.providerReference).toMatch(/^PAY-/);
  });

  test("the card number never reaches a log line", async () => {
    await provider.authorize(request());
    expect(logs.join("\n")).not.toContain(CARD.number);
  });
});

describe("declined - a normal answer from a working provider", () => {
  test.each([
    ["4000000000000002", "card_declined"],
    ["4000000000000069", "expired_card"],
    ["4000000000009995", "insufficient_funds"],
  ])("%s is declined as %s, and does not throw", async (number, code) => {
    const result = await provider.authorize(request({ card: { ...CARD, number } }));
    expect(result.approved).toBe(false);
    expect(result.code).toBe(code);
    expect(result.providerReference).toBeNull();
  });

  test("an amount over the limit is declined", async () => {
    const result = await provider.authorize(request({ amountCents: 9999999 }));
    expect(result).toMatchObject({ approved: false, code: "limit_exceeded" });
  });
});

describe("provider trouble - these throw, and become a 503", () => {
  test("gateway returns 502", async () => {
    const error = await provider
      .authorize(request({ card: { ...CARD, number: "4000000000000119" } }))
      .catch((e) => e);
    expect(error).toBeInstanceOf(ServiceUnavailableError);
    expect(error.status).toBe(503);
  });

  test("gateway hangs - our own timeout ends the request", async () => {
    const started = Date.now();
    const error = await provider
      .authorize(request({ card: { ...CARD, number: "4000000000000259" } }))
      .catch((e) => e);
    const elapsed = Date.now() - started;

    expect(error).toBeInstanceOf(ServiceUnavailableError);
    // The gateway would have answered at 900ms. We gave up at 400ms.
    expect(elapsed).toBeLessThan(800);
    expect(logs.join("\n")).toMatch(/no response within 400ms/);
  }, 10000);

  test("gateway is not listening at all", async () => {
    const dead = new MockPaymentProvider({
      baseUrl: "http://127.0.0.1:9",
      apiKey: "test-gateway-key",
      timeoutMs: 400,
    });
    const error = await dead.authorize(request()).catch((e) => e);
    expect(error).toBeInstanceOf(ServiceUnavailableError);
    expect(error.status).toBe(503);
  });

  test("a wrong API key is our misconfiguration, not the customer's problem", async () => {
    const misconfigured = new MockPaymentProvider({
      baseUrl,
      apiKey: "wrong-key",
      timeoutMs: 400,
    });
    const error = await misconfigured.authorize(request()).catch((e) => e);
    expect(error).toBeInstanceOf(ServiceUnavailableError);
    expect(error.status).toBe(503);
    expect(logs.join("\n")).toMatch(/HTTP 401/);
  });
});

describe("bad card details are the customer's to fix", () => {
  test("a number that fails the checksum comes back as a 400, not a 503", async () => {
    const error = await provider
      .authorize(request({ card: { ...CARD, number: "1234567812345678" } }))
      .catch((e) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.status).toBe(400);
    expect(error.details[0].field).toBe("card");
  });
});

describe("the amount is never taken on trust", () => {
  test("a non-integer amount is refused before any network call", async () => {
    await expect(provider.authorize(request({ amountCents: "34900" }))).rejects.toThrow(
      /positive integer amountCents/
    );
  });
});
