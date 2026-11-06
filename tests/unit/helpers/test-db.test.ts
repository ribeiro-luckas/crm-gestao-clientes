import { beforeEach, describe, expect, it, vi } from "vitest";

const { poolInstances, identityRows } = vi.hoisted(() => ({
  poolInstances: [] as Array<{ connect: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn>; client: { release: ReturnType<typeof vi.fn>; query: ReturnType<typeof vi.fn> } }>,
  identityRows: [] as Array<{ database: string; username: string; port: number }>,
}));

vi.mock("pg", () => ({
  Pool: class {
    index = poolInstances.length;
    client = {
      release: vi.fn(),
      query: vi.fn().mockImplementation(() => Promise.resolve({
        rows: [identityRows[this.index] ?? {
          database: "crm_test_isolated",
          username: "crm_test_admin",
          port: 5432
        }]
      }))
    };
    connect = vi.fn().mockResolvedValue(this.client);
    end = vi.fn().mockResolvedValue(undefined);
    constructor() { poolInstances.push(this); }
  },
}));

import { createIsolatedConnectionPair, validateTestDatabaseIsolation } from "../../helpers/test-db";

const validUrl = "postgresql://crm_test_admin:secret-test-password@127.0.0.1:5433/crm_test_isolated";

describe("test database isolation", () => {

  beforeEach(() => {

    vi.clearAllMocks();
    poolInstances.length = 0;
    identityRows.length = 0;
    delete process.env.DATABASE_URL;
    process.env.TEST_DATABASE_URL = validUrl;

  });

  it("accepts the authorized URL", () => {

    expect(validateTestDatabaseIsolation().testUrl).toBe(validUrl);

  });

  it.each([
    ["URL ausente", undefined],
    ["host incorreto", validUrl.replace("127.0.0.1", "localhost")],
    ["porta incorreta", validUrl.replace(":5433", ":5432")],
    ["banco incorreto", validUrl.replace("crm_test_isolated", "crm")],
    ["usuário incorreto", validUrl.replace("crm_test_admin", "postgres")],
    ["protocolo inválido", validUrl.replace("postgresql:", "mysql:")],
    ["senha ausente", "postgresql://crm_test_admin@127.0.0.1:5433/crm_test_isolated"],
  ])("rejeita %s", (_case, value) => {

    if (value === undefined) delete process.env.TEST_DATABASE_URL;

    else process.env.TEST_DATABASE_URL = value;

    expect(() => validateTestDatabaseIsolation()).toThrow();

  });

  it("rejeita DATABASE_URL igual ao destino de testes", () => {

    process.env.DATABASE_URL = validUrl;

    expect(() => validateTestDatabaseIsolation()).toThrow(/corresponde ao banco configurado/);

  });

  it("não inclui senhas em mensagens de erro", () => {

    process.env.TEST_DATABASE_URL = validUrl.replace("secret-test-password", "sensitive-value").replace("127.0.0.1", "example.invalid");
    process.env.DATABASE_URL = "not-a-url-sensitive-value";

    let message = "";

    try {

      validateTestDatabaseIsolation();

    } catch (error) {

      message = (error as Error).message;

    }

    expect(message).not.toContain("sensitive-value");

  });

  it("fecha clientes e pools se a identidade retornada não for autorizada", async () => {

    identityRows.push(
      {
        database: "crm_test_isolated",
        username: "crm_test_admin",
        port: 5432
      },
      {
        database: "crm",
        username: "crm_test_admin",
        port: 5432
      },
    );

    await expect(createIsolatedConnectionPair()).rejects.toThrow(/identidade.*inválida/i);

    expect(poolInstances[0].client.release).toHaveBeenCalledOnce();
    expect(poolInstances[1].client.release).toHaveBeenCalledOnce();
    expect(poolInstances).toHaveLength(2);
    expect(poolInstances[0].end).toHaveBeenCalledOnce();
    expect(poolInstances[1].end).toHaveBeenCalledOnce();

  });
});
