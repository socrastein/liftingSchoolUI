import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import { loadingScreenPlugin } from "./js/loadingScreenPlugin.js";

/**
 * The showcase page (npm run dev): every token, class and icon of the library in use, in both themes. It is for building
 * the look, never shipped to projects (package.json's `files` leaves it out). Built into dist/ for the accessibility check.
 * It starts like an app does, behind the startup loading screen (loadingScreenPlugin), which main.ts takes away once mounted.
 */
export default defineConfig({
  root: "showcase",
  plugins: [vue(), loadingScreenPlugin()],
  build: { outDir: "../dist", emptyOutDir: true },
  server: { port: 4100 },
  preview: { port: 4101 },
});
