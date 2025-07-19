import "@testing-library/jest-dom";
import { cleanup } from "@solidjs/testing-library";
import { afterEach, vi } from "vitest";

// Cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
});

// Mock browser APIs that might not be available in test environment
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock the browser extension APIs
globalThis.browser = {
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    },
  },
  tabs: {
    query: vi.fn().mockResolvedValue([
      {
        id: 1,
        url: "https://example.com",
        title: "Example Page",
        active: true,
      },
    ]),
  },
};

// Mock chrome APIs as well for compatibility
globalThis.chrome = globalThis.browser;
