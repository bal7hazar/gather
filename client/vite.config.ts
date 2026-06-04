/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves this project at https://<user>.github.io/gather/,
// so production assets must be referenced under the /gather/ base path.
export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "/gather/" : "/",
  plugins: [react()],
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
}));
