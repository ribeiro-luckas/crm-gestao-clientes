import { defineConfig } from "drizzle-kit";

const rawUrl = process.env.TEST_DATABASE_URL;

if (!rawUrl) {
  throw new Error(
    "TEST_DATABASE_URL ausente. Migração bloqueada."
  );
}

let testUrl: URL;

try {
  testUrl = new URL(rawUrl);
} catch {
  throw new Error("TEST_DATABASE_URL inválida. Migração bloqueada.");
}

const databaseName = decodeURIComponent(
  testUrl.pathname.replace(/^\/+/, "")
);

const username = decodeURIComponent(testUrl.username);
const port = testUrl.port || "5432";

if (
  !["postgres:", "postgresql:"].includes(testUrl.protocol) ||
  testUrl.hostname !== "127.0.0.1" ||
  port !== "5433" ||
  databaseName !== "crm_test_isolated" ||
  username !== "crm_test_admin" ||
  !testUrl.password
) {
  throw new Error(
    "BLOQUEIO: conexão não corresponde ao PostgreSQL isolado."
  );
}

// Defesa adicional caso DATABASE_URL esteja presente.
const crmRawUrl = process.env.DATABASE_URL;

if (crmRawUrl) {
  let crmUrl: URL;

  try {
    crmUrl = new URL(crmRawUrl);
  } catch {
    throw new Error(
      "DATABASE_URL inválida. Migração bloqueada."
    );
  }

  const crmDatabase = decodeURIComponent(
    crmUrl.pathname.replace(/^\/+/, "")
  );

  const crmPort = crmUrl.port || "5432";

  if (
    crmUrl.hostname === testUrl.hostname &&
    crmPort === port &&
    crmDatabase === databaseName
  ) {
    throw new Error(
      "BLOQUEIO: banco de testes e banco CRM apontam para a mesma conexão."
    );
  }
}

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: rawUrl,
  },
  migrations: {
    table: "__drizzle_migrations",
    schema: "drizzle",
  },
  strict: true,
  verbose: true,
});
