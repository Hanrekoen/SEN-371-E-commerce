import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests: a real browser, the real React build, the real API and
 * the real database.
 *
 * Everything below jsdom is already covered - unit tests for the calculations,
 * component tests for each screen, function tests for each feature through
 * the API. What none of those can tell you is whether the pieces are wired to
 * each other, because every one of them replaces something real with a fake.
 * These tests replace nothing.
 *
 * Running them:
 *   1. server/.env points at a database you are willing to have written to
 *      (use a scratch one, not the marked demo data)
 *   2. cd server && npm run seed
 *   3. cd client && npm run test:e2e
 *
 * The two servers below are started automatically and stopped afterwards. If
 * they are already running, Playwright reuses them.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },

  // One at a time. These share a database, and two workers checking out the
  // same product would fail each other on stock rather than on a real bug.
  workers: 1,
  fullyParallel: false,

  // A flake here is a finding, not something to paper over with a retry.
  retries: 0,

  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],

  use: {
    baseURL: "http://localhost:5173",
    // Kept for every failure: the trace is what turns "the click did nothing"
    // into a specific reason, without having to reproduce it by hand.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],

  webServer: [
    {
      command: "npm start",
      cwd: "../server",
      url: "http://localhost:5000/api/health",
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: "npm run dev",
      url: "http://localhost:5173",
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
