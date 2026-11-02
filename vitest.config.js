import { defineConfig } from "vitest/config";

/**
 * The tests (npm test): the modules in js/ and the style rules run over css/ and showcase/. A file of its own, because
 * vite.config.js roots Vite in showcase/, and the tests run from the repository root.
 */
export default defineConfig({
  test: {
    root: ".",
    include: ["tests/**/*.test.js"],
    environment: "node",
  },
});
