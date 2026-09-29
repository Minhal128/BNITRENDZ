import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// Tests run against their own database, which is wiped before every test.
const env = loadEnv("test", process.cwd(), "");
if (!env.TEST_DATABASE_URL) throw new Error("Set TEST_DATABASE_URL in .env to run the tests.");
if (env.TEST_DATABASE_URL === env.DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL must differ from DATABASE_URL: the tests wipe it.");
}
process.env.DATABASE_URL = env.TEST_DATABASE_URL;
process.env.DIRECT_URL = env.TEST_DATABASE_URL;
process.env.NEXTAUTH_SECRET = "test-secret";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    environment: "node",
    globalSetup: ["tests/global-setup.ts"],
    setupFiles: ["tests/setup.ts"],
    fileParallelism: false, // files share one database
    testTimeout: 30_000,
  },
});
