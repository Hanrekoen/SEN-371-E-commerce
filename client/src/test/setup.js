import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

// Unmount between tests. Without this one test's DOM is still on the page for
// the next, and a query like getByRole("button") starts matching two things.
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  // jsdom implements neither of these, and components that read them would
  // throw instead of rendering. Both are given honest defaults: no reduced
  // motion, and an observer that simply never fires.
  if (!window.matchMedia) {
    window.matchMedia = (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }

  if (!window.IntersectionObserver) {
    window.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }

  // jsdom has no layout engine, so scrollTo is missing. Tests that assert on
  // scrolling would be lying anyway; this only stops unrelated ones crashing.
  window.scrollTo = window.scrollTo || (() => {});
});
