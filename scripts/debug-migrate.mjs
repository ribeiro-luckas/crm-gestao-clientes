import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const connectionString = process.env.DATABASE_URL_MIGRATIONS;

if (!connectionString) {
  throw new Error("DATABASE_URL_MIGRATIONS ausente. Migração bloqueada.");
}

const pool = new Pool({
  connectionString,
  max: 1,
  connectionTimeoutMillis: 5000
});

async function main() {
  try {
    const db = drizzle(pool);

    await migrate(db, {
      migrationsFolder: "./src/db/migrations"
    });

    console.log("Migrations aplicadas com sucesso!");
  } catch {
    console.error("Falha na migration. Os detalhes originais do erro foram omitidos do log.");
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
