export function getIsolatedTestDatabaseUrl(value = process.env.TEST_DATABASE_URL): string {
  if (!value) throw new Error("TEST_DATABASE_URL ausente no modo de teste.");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("TEST_DATABASE_URL inválida no modo de teste.");
  }
  const database = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  const username = decodeURIComponent(url.username);
  if (!["postgres:", "postgresql:"].includes(url.protocol) || url.hostname !== "127.0.0.1" ||
    (url.port || "5432") !== "5433" || database !== "crm_test_isolated" || username !== "crm_test_admin" || !url.password) {
    throw new Error("BLOQUEIO: modo de teste exige PostgreSQL crm_test_isolated em 127.0.0.1:5433.");
  }
  return url.toString();
}
