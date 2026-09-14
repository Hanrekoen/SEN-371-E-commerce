import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  // Every asset URL is built against this; wrong value = blank page and 404s.
  // The deploy workflow sets VITE_BASE to the repo name for GitHub Pages
  // (which serves from /<repo-name>/); locally it stays "/".
  base: process.env.VITE_BASE || "/",

  server: {
    port: 5173,
  },

  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.js"],
    // Unit/component tests only - the Playwright journeys under e2e/ drive a
    // real browser and run via `npm run test:e2e`.
    include: ["src/**/*.test.{js,jsx}"],

    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html", "lcov"],
      reportsDirectory: "./coverage",
      // Entry point and test helpers are not code under test; counting them
      // moves the figure without telling anyone anything.
      include: ["src/**/*.{js,jsx}"],
      exclude: [
        "src/main.jsx",
        "src/test/**",
        "src/**/*.test.{js,jsx}",
      ],
      // A floor, not a target, set just under what the suite achieves: the
      // run fails below this so coverage cannot quietly rot.
      thresholds: {
        statements: 55,
        branches: 78,
        functions: 58,
        lines: 55,
      },
    },
  },
});
