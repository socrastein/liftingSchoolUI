import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

/**
 * The showcase page (npm run dev): every token, class and icon of the library in use, in both themes. It is for building
 * the look, never shipped to projects (package.json's `files` leaves it out). Built into dist/ for the accessibility check.
 */
export default defineConfig({
  root: "showcase",
  plugins: [vue()],
  build: { outDir: "../dist", emptyOutDir: true },
  server: { port: 4100 },
  preview: { port: 4101 },
});
