import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [solidPlugin(), tailwindcss()],
  server: {
    port: 3000,
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      input: {
        index: "index.html",
        background: "src/background.ts",
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // want to retain the name of the background script file because the manifest.json expects the exact name
          if (chunkInfo.name === "background") {
            return "background.js";
          }

          return "assets/[name]-[hash].js";
        },
      },
    },
  },
});
