import { defineConfig } from "prisma/config";

// Load .env when present (it never overrides variables that are already set).
try {
  process.loadEnvFile();
} catch {}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // Migrations need a direct connection; DIRECT_URL is only required when DATABASE_URL is pooled.
  datasource: { url: process.env.DIRECT_URL || process.env.DATABASE_URL },
});
