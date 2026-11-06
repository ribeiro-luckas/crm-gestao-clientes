import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { getIsolatedTestDatabaseUrl } from "./test-url";

const globalForDb = globalThis as unknown as { crmPool?: Pool; crmDb?: ReturnType<typeof createDatabase> };

function getPool() {
  const url = process.env.CRM_TEST_MODE === "1"
    ? getIsolatedTestDatabaseUrl()
    : process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não configurada. Copie .env.example para .env.local e configure o banco local.");
  if (!globalForDb.crmPool) {
    globalForDb.crmPool = new Pool({ connectionString: url, max: 10, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000 });
  }
  return globalForDb.crmPool;
}

export function getDb() {
  if (!globalForDb.crmDb) globalForDb.crmDb = createDatabase();
  return globalForDb.crmDb;
}

function createDatabase() {
  return drizzle(getPool(), { schema });
}
