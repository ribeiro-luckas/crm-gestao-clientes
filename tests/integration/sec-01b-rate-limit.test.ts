import { afterAll, beforeAll, expect, it } from "vitest";
import { randomBytes, randomInt } from "node:crypto";
import { createIsolatedConnectionPair, type IsolatedConnectionPair } from "../helpers/test-db";

let connection: IsolatedConnectionPair | undefined;
let postAuth: (request: Request) => Promise<Response>;
let restoreEnvironment: (() => void) | undefined;

beforeAll(async () => {
  
  if (process.env.DATABASE_URL) throw new Error("Esta suíte proíbe DATABASE_URL.");

  connection = await createIsolatedConnectionPair();

  const previous = {
    nodeEnv: process.env.NODE_ENV,
    secret: process.env.BETTER_AUTH_SECRET,
    url: process.env.BETTER_AUTH_URL,
    crmTestMode: process.env.CRM_TEST_MODE,
  };

  // A conexão foi validada pelo helper antes de carregar o handler real.
  // Ative o caminho exclusivo de TEST_DATABASE_URL antes do import, pois o
  // módulo da rota constrói Better Auth e resolve getDb() no topo do módulo.
  process.env.CRM_TEST_MODE = "1";

  // Better Auth captura o ambiente ao construir a instância. Isto valida o
  // comportamento da versão instalada em modo de produção, somente em teste.
  Reflect.set(process.env, "NODE_ENV", "production");
  process.env.BETTER_AUTH_SECRET = randomBytes(48).toString("base64url");
  process.env.BETTER_AUTH_URL = "https://localhost:3000";

  restoreEnvironment = () => {

    if (previous.nodeEnv === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else Reflect.set(process.env, "NODE_ENV", previous.nodeEnv);

    if (previous.secret === undefined) delete process.env.BETTER_AUTH_SECRET;
    else process.env.BETTER_AUTH_SECRET = previous.secret;

    if (previous.url === undefined) delete process.env.BETTER_AUTH_URL;
    else process.env.BETTER_AUTH_URL = previous.url;

    if (previous.crmTestMode === undefined) delete process.env.CRM_TEST_MODE;
    else process.env.CRM_TEST_MODE = previous.crmTestMode;

  };

  const route = await import("@/app/api/auth/[...all]/route");

  postAuth = route.POST;

});

afterAll(async () => {

  restoreEnvironment?.();

  if (connection) await connection.cleanup();

});

it("F002 aplica o limite instalado de login com quatro requests sintéticos locais", async () => {

  const syntheticIp = `198.51.100.${randomInt(10, 240)}`;
  const statuses: number[] = [];

  for (let attempt = 0; attempt < 4; attempt += 1) {

    const response = await postAuth(new Request("https://localhost:3000/api/auth/sign-in/email", {
      method: "POST",
      headers: {
        origin: "https://localhost:3000",
        "content-type": "application/json",
        "x-forwarded-for": syntheticIp,
      },
      body: JSON.stringify({ email: `sec01b-missing-${randomBytes(8).toString("hex")}@example.invalid`, password: "synthetic-invalid-password" }),
    }));

    statuses.push(response.status);

  }

  expect(statuses).toEqual([401, 401, 401, 429]);

});
