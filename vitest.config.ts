import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["dist/**", "web-dist/**", "node_modules/**"],
  },
});
