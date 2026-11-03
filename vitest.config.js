import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

/**
 * The tests (npm test): the modules in js/, the style rules run over css/ and showcase/, and the shared Vue components. A
 * file of its own, because vite.config.js roots Vite in showcase/, and the tests run from the repository root. The component
 * tests need a browser-like page, so each says so at its top (@vitest-environment jsdom); the rest run in plain Node.
 */
export default defineConfig({
  plugins: [vue()],
  test: {
    root: ".",
    include: ["tests/**/*.test.js", "tests/**/*.test.ts"],
    environment: "node",
  },
});
