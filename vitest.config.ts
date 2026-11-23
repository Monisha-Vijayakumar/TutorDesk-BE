import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["./tests/globalSetup.ts"],
    setupFiles: ["./tests/setup.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
    env: {
      NODE_ENV: "test",
      MONGODB_URI: "mongodb://set-by-tests-setup",
      JWT_SECRET: "test-secret-that-is-long-enough-for-the-env-check",
      JWT_EXPIRES_IN: "1h",
      CLIENT_URL: "http://localhost:5173",
      APP_TIMEZONE: "Asia/Kolkata",
      STUDENT_CODE_START: "100000001",
    },
  },
})
