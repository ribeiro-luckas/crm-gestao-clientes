import { defineConfig } from "drizzle-kit";

const migrationUrl = process.env.DATABASE_URL_MIGRATIONS;

if (!migrationUrl) {
  throw new Error("DATABASE_URL_MIGRATIONS ausente. Migração bloqueada.");
}

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: migrationUrl },
  strict: true,
  verbose: true,
});
