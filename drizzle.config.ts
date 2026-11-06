import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Nunca use a credencial de runtime para aplicar migrations.
    url: process.env.DATABASE_URL_MIGRATIONS
      ?? "postgresql://invalid:invalid@localhost:5432/invalid",
  },
  strict: true,
  verbose: true,
});
