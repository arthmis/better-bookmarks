import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import topLevelAwait from "vite-plugin-top-level-await";
import wasm from "vite-plugin-wasm";

export default defineConfig({
  plugins: [solidPlugin(), tailwindcss(), wasm(), topLevelAwait()],
  server: {
    port: 3000,
  },
  worker: {
    // Not needed with vite-plugin-top-level-await >= 1.3.0
    format: "es",
    plugins: () => [wasm(), topLevelAwait()],
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
