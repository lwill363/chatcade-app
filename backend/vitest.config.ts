import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@features": path.resolve(__dirname, "src/features"),
      "@common": path.resolve(__dirname, "src/common"),
      "@test": path.resolve(__dirname, "src/test"),
    },
  },
  test: {
    globals: false,
    typecheck: {
      tsconfig: "./tsconfig.test.json",
    },
  },
});
