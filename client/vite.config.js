import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  // GitHub Pages serves a project site from /<repo-name>/, not from /. Every
  // asset URL is built against this, so getting it wrong gives a blank page
  // and a console full of 404s. The deploy workflow sets VITE_BASE from the
  // repository name automatically; locally it stays "/" and nothing changes.
  base: process.env.VITE_BASE || "/",

  server: {
    port: 5173,
  },

  // --- Milestone 5: automated testing ---
  test: {
    // Components are rendered into a DOM and driven the way a person would
    // drive them, so the tests need a DOM to render into.
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.js"],
    // Unit and component tests only. The Playwright journeys under e2e/ drive
    // a real browser and are run by `npm run test:e2e`.
    include: ["src/**/*.test.{js,jsx}"],

    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html", "lcov"],
      reportsDirectory: "./coverage",
      // Only our own source counts. The entry point and the test helpers are
      // not code under test, and leaving them in moves the figure without
      // telling anyone anything.
      include: ["src/**/*.{js,jsx}"],
      exclude: [
        "src/main.jsx",
        "src/test/**",
        "src/**/*.test.{js,jsx}",
      ],
      // A floor, not a target: the suite fails below this so coverage cannot
      // quietly rot. Set just under what the suite actually achieves.
      thresholds: {
        statements: 55,
        branches: 78,
        functions: 58,
        lines: 55,
      },
    },
  },
});
