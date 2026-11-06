import { Pool, type PoolClient } from "pg";

export interface IsolatedConnectionPair {
  poolA: Pool;
  poolB: Pool;
  clientA: PoolClient;
  clientB: PoolClient;
  cleanup: () => Promise<void>;
}

type ParsedDatabaseUrl = { url: URL; host: string; port: number; database: string; username: string; password: string };

function parseDatabaseUrl(value: string | undefined, variable: string): ParsedDatabaseUrl {
  
  if (!value) throw new Error(`${variable} não está configurada.`);

  let url: URL;

  try { url = new URL(value); } catch { throw new Error(`${variable} não é uma URL válida.`); }

  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {

    throw new Error(`${variable} deve usar o protocolo PostgreSQL.`);

  }

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const port = url.port ? Number(url.port) : 5432;
  const database = decodeURIComponent(url.pathname.slice(1)).toLowerCase();
  const username = decodeURIComponent(url.username);
  const password = decodeURIComponent(url.password);

  if (!host) throw new Error(`${variable} precisa informar um host.`);

  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`${variable} informa uma porta inválida.`);

  if (!database || database.includes("/")) throw new Error(`${variable} precisa informar um nome de banco válido.`);

  return { url, host, port, database, username, password };

}

export function validateTestDatabaseIsolation(): { testUrl: string } {

  const test = parseDatabaseUrl(process.env.TEST_DATABASE_URL, "TEST_DATABASE_URL");

  if (test.host !== "127.0.0.1" || test.port !== 5433 || test.database !== "crm_test_isolated" || test.username !== "crm_test_admin" || !test.password) {
    throw new Error("BLOQUEIO DE SEGURANÇA: TEST_DATABASE_URL deve apontar para o destino PostgreSQL temporário autorizado (127.0.0.1:5433/crm_test_isolated, usuário crm_test_admin e senha obrigatória).");

  }

  const crmValue = process.env.DATABASE_URL;

  if (crmValue) {

    const crm = parseDatabaseUrl(crmValue, "DATABASE_URL");

    if (test.host === crm.host && test.port === crm.port && test.database === crm.database) {

      throw new Error("BLOQUEIO DE SEGURANÇA: TEST_DATABASE_URL corresponde ao banco configurado em DATABASE_URL.");

    }
  }

  return { testUrl: test.url.toString() };

}

export function isTestDatabaseConfigured(): boolean {

  try { validateTestDatabaseIsolation(); return true; } catch { return false; }

}

export async function createIsolatedConnectionPair(): Promise<IsolatedConnectionPair> {

  const { testUrl } = validateTestDatabaseIsolation();
  const poolA = new Pool({ connectionString: testUrl, max: 2, connectionTimeoutMillis: 5000 });
  const poolB = new Pool({ connectionString: testUrl, max: 2, connectionTimeoutMillis: 5000 });

  let clientA: PoolClient | undefined;
  let clientB: PoolClient | undefined;

  try {

    clientA = await poolA.connect();
    clientB = await poolB.connect();

    const [identityA, identityB] = await Promise.all([
      clientA.query<{ database: string; username: string; port: number }>("select current_database() as database, current_user as username, inet_server_port() as port"),
      clientB.query<{ database: string; username: string; port: number }>("select current_database() as database, current_user as username, inet_server_port() as port"),
    ]);

    for (const identity of [identityA.rows[0], identityB.rows[0]]) {

      if (!identity || identity.database !== "crm_test_isolated" || identity.username !== "crm_test_admin" || Number(identity.port) !== 5432) {

        throw new Error("A identidade da conexão não corresponde ao banco PostgreSQL temporário autorizado.");

      }
    }
  } catch {

    try { clientA?.release(); } catch { /* cleanup best effort */ }

    try { clientB?.release(); } catch { /* cleanup best effort */ }

    await Promise.allSettled([poolA.end(), poolB.end()]);

    throw new Error("BLOQUEIO DE SEGURANÇA: conexão ou identidade do banco PostgreSQL temporário inválida; clientes e pools foram encerrados.");

  }

  return {
    poolA, poolB, clientA, clientB,
    cleanup: async () => {

      try { clientA.release(); } catch { /* cleanup best effort */ }

      try { clientB.release(); } catch { /* cleanup best effort */ }

      await Promise.allSettled([poolA.end(), poolB.end()]);

    },
  };
}
