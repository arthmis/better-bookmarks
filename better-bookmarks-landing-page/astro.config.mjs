import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  // Basic configuration for a minimal Astro project
  output: "static",
  site: "https://better-bookmarks-artmis-dev.netlify.app",

  // Development server configuration
  server: {
    port: 3000,
    host: true,
  },

  // Build configuration
  build: {
    assets: "assets",
  },
});
