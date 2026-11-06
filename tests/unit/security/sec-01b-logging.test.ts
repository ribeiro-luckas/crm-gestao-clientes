import { afterEach, describe, expect, it, vi } from "vitest";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "@better-auth/memory-adapter";
import { workspaceApiErrorResponse } from "@/lib/workspace";
import { createBetterAuthLogAdapter, createSafeLogger } from "@/lib/safe-logger";

afterEach(() => vi.restoreAllMocks());

describe("SEC-01-F005 — logs estruturados com campos permitidos", () => {

  it("não encaminha conteúdo sensível do Error/cause e preserva metadados úteis", async () => {

    const sink = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
    const logger = createSafeLogger(sink);
    const error = Object.assign(new Error("password=SEC01C4_PASSWORD_CANARY token=SEC01C4_TOKEN_CANARY"), {
      code: "SEC01C4_COOKIE_CANARY",
      authorization: "Bearer SEC01C4_AUTH_CANARY",
      databaseUrl: "postgres://SEC01C4_URL_CANARY",
      clientName: "SEC01C4_CLIENT_CANARY",
      email: "SEC01C4_EMAIL_CANARY",
      cause: new Error("SEC01C4_CAUSE_CANARY"),
    });

    error.stack = "SEC01C4_STACK_CANARY";

    logger.error({
      category: "internal-error",
      operation: "workspace.request",
      code: "23505",
      correlationId: "123e4567-e89b-42d3-a456-426614174000",
      error,
    });

    logger.warn({
      category: "authorization-check",
      operation: "member.role.authorization",
      code: "SEC01C4_PASSWORD_CANARY",
      correlationId: "SEC01C4_SESSION_CANARY",
      error: Object.assign(new Error("ignored"), { code: "SEC01C4_PERSONAL_DATA_CANARY" }),
    });

    expect(sink.error).toHaveBeenCalledTimes(1);

    const [encoded] = sink.error.mock.calls[0] as [string];
    const record = JSON.parse(encoded) as Record<string, unknown>;

    expect(record).toMatchObject({
      level: "error",
      category: "internal-error",
      operation: "workspace.request",
      code: "23505"
    });
    expect(record.correlationId).toBe("123e4567-e89b-42d3-a456-426614174000");
    expect(record.error).toEqual({
      kind: "Error",
      name: "Error"
    });
    expect(JSON.stringify([sink.error.mock.calls, sink.warn.mock.calls, sink.info.mock.calls])).not.toMatch(/SEC01C4_/);

    const warning = JSON.parse((sink.warn.mock.calls[0] as [string])[0]) as Record<string, unknown>;

    expect(warning).not.toHaveProperty("code");
    expect(warning).not.toHaveProperty("correlationId");
    expect(warning.error).toEqual({
      kind: "Error",
      name: "Error"
    });

  });

  it("não serializa objetos não Error, valores nulos, propriedades extras ou ciclos", () => {

    const sink = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
    const logger = createSafeLogger(sink);
    const cyclic: Record<string, unknown> = {
      email: "SEC01C4_EMAIL_CANARY"
    };

    cyclic.self = cyclic;

    logger.warn({
      category: "authorization-check",
      operation: "member.role.authorization",
      error: cyclic
    });
    logger.info({
      category: "data-load",
      operation: "team.responsibilities.load",
      error: null
    });
    logger.error({
      category: "internal-error",
      operation: "workspace.request",
      error: "SEC01C4_STRING_CANARY"
    });

    expect(sink.warn).toHaveBeenCalledTimes(1);
    expect(sink.info).toHaveBeenCalledTimes(1);
    expect(sink.error).toHaveBeenCalledTimes(1);
    expect(JSON.stringify([sink.error.mock.calls, sink.warn.mock.calls, sink.info.mock.calls])).not.toMatch(/SEC01C4_/);
    expect(JSON.parse((sink.warn.mock.calls[0] as [string])[0]).error).toEqual({ kind: "object" });
    expect(JSON.parse((sink.info.mock.calls[0] as [string])[0]).error).toEqual({ kind: "null" });

  });

  it("tolera getters hostis e falha do destino de logging sem propagar exceção", () => {

    const hostile = new Proxy(new Error("ignored"), {

      get(target, key, receiver) {

        if (key === "name" || key === "code") throw new Error("SEC01C4_GETTER_CANARY");

        return Reflect.get(target, key, receiver);

      },
    });

    const sink = { error: vi.fn(() => { throw new Error("SEC01C4_SINK_CANARY"); }), warn: vi.fn(), info: vi.fn() };
    const logger = createSafeLogger(sink);

    expect(() => logger.error({
      category: "internal-error",
      operation: "workspace.request",
      error: hostile
    })).not.toThrow();
    expect(sink.error).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(sink.error.mock.calls)).not.toContain("SEC01C4_");
  });

  it("captura cada campo uma vez para impedir getters com valor variável", () => {

    const sink = {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn()
    };
    const logger = createSafeLogger(sink);
    let nameReads = 0;
    const error = new Error("ignored");

    Object.defineProperty(error, "name", {

      get: () => ++nameReads === 1 ? "Error" : "SEC01C4_ERROR_NAME_CANARY",

    });

    let categoryReads = 0;
    let operationReads = 0;
    let codeReads = 0;
    let correlationReads = 0;
    const input = Object.defineProperties({}, {
      category: { get: () => ++categoryReads === 1 ? "internal-error" : "SEC01C4_CATEGORY_CANARY" },
      operation: { get: () => ++operationReads === 1 ? "workspace.request" : "SEC01C4_OPERATION_CANARY" },
      code: { get: () => ++codeReads === 1 ? "23505" : "SEC01C4_CODE_CANARY" },
      correlationId: { get: () => ++correlationReads === 1 ? "123e4567-e89b-42d3-a456-426614174000" : "SEC01C4_CORRELATION_CANARY" },
      error: { get: () => error },
    }) as Parameters<typeof logger.error>[0];

    logger.error(input);

    expect(sink.error).toHaveBeenCalledTimes(1);

    const [encoded] = sink.error.mock.calls[0] as [string];

    expect(JSON.stringify(sink.error.mock.calls)).not.toMatch(/SEC01C4_/);
    expect(JSON.parse(encoded)).toMatchObject({
      category: "internal-error",
      operation: "workspace.request",
      code: "23505",
      correlationId: "123e4567-e89b-42d3-a456-426614174000",
      error: {
        kind: "Error",
        name: "Error"
      },
    });

    expect([categoryReads, operationReads, codeReads, correlationReads, nameReads]).toEqual([1, 1, 1, 1, 1]);

  });

  it("tolera falha inesperada ao serializar o evento sem chamar o sink", () => {

    const sink = {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn()
    };
    const logger = createSafeLogger(sink);
    const stringify = vi.spyOn(JSON, "stringify").mockImplementation(() => {

      throw new Error("SEC01C4_SERIALIZER_CANARY");

    });

    try {

      expect(() => logger.error({
        category: "internal-error",
        operation: "workspace.request"
      })).not.toThrow();
      expect(sink.error).not.toHaveBeenCalled();

    } finally {

      stringify.mockRestore();

    }

    expect(JSON.stringify(sink.error.mock.calls)).not.toContain("SEC01C4_");
  });

  it("a resposta da API permanece genérica e o argumento do console é sanitizado", async () => {

    const marker = "SEC01C4_HTTP_CANARY";
    const error = new Error(marker);
    const logger = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = workspaceApiErrorResponse(error);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ message: "Erro interno." });
    expect(logger).toHaveBeenCalledTimes(1);
    expect(logger.mock.calls).toEqual([[expect.any(String)]]);
    expect(JSON.stringify(logger.mock.calls)).not.toContain(marker);

    const record = JSON.parse(logger.mock.calls[0]![0] as string) as Record<string, unknown>;

    expect(record).toMatchObject({
      level: "error",
      category: "internal-error",
      operation: "workspace.request"
    });
  });

  it("sanitiza as mensagens e argumentos do logger interno Better Auth, preservando nível e origem", () => {

    const sink = {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn()
    };
    const adapter = createBetterAuthLogAdapter(createSafeLogger(sink));
    const error = Object.assign(new Error("SEC01C4_AUTH_PASSWORD_CANARY"), {
      code: "23505",
      cookie: "SEC01C4_AUTH_COOKIE_CANARY",
    });

    expect(adapter.level).toBe("warn");

    adapter.log("error", "SEC01C4_AUTH_MESSAGE_CANARY", error, {
      authorization: "SEC01C4_AUTH_HEADER_CANARY",
      userEmail: "SEC01C4_AUTH_EMAIL_CANARY",
    });
    adapter.log("warn", "SEC01C4_AUTH_WARNING_CANARY", "SEC01C4_AUTH_TOKEN_CANARY");

    expect(sink.error).toHaveBeenCalledTimes(1);
    expect(sink.warn).toHaveBeenCalledTimes(1);
    expect(JSON.stringify([sink.error.mock.calls, sink.warn.mock.calls, sink.info.mock.calls])).not.toMatch(/SEC01C4_/);

    const errorEvent = JSON.parse((sink.error.mock.calls[0] as [string])[0]);

    expect(errorEvent).toMatchObject({
      level: "error",
      category: "authentication-error",
      operation: "auth.api",
      code: "BETTER_AUTH_LOG_EVENT",
      error: {
        kind: "Error",
        name: "Error",
        code: "23505"
      },
    });

    const warningEvent = JSON.parse((sink.warn.mock.calls[0] as [string])[0]);

    expect(warningEvent).toMatchObject({
      level: "warn",
      category: "authentication-error",
      operation: "auth.api"
    });

  });

  it("mantém sanitização quando Better Auth emite warning durante uma requisição real em memória", async () => {

    const sink = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
    const auth = betterAuth({
      appName: "Synthetic F005 Runtime Probe",
      baseURL: "http://localhost:4107",
      secret: "SYNTHETIC_ONLY_SECRET_FOR_LOCAL_TEST_0123456789",
      database: memoryAdapter({
        user: [],
        session: [],
        account: [],
        verification: []
      }),
      emailAndPassword: {
        enabled: true,
        minPasswordLength: 12
      },
      logger: createBetterAuthLogAdapter(createSafeLogger(sink)),
    });
    const response = await auth.handler(new Request("http://localhost:4107/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Synthetic User",
        email: "sec01c4.invalid@example.invalid",
        password: "SYN",
      }),
    }));
    const capturedOutput = JSON.stringify([sink.error.mock.calls, sink.warn.mock.calls, sink.info.mock.calls]);

    expect(response.status).toBe(400);
    expect(sink.warn).toHaveBeenCalledTimes(1);
    expect(capturedOutput).not.toMatch(/SYNTHETIC_ONLY_SECRET|sec01c4\.invalid@example\.invalid|Synthetic User|\bSYN\b/);

    const warning = JSON.parse((sink.warn.mock.calls[0] as [string])[0]);

    expect(warning).toMatchObject({
      level: "warn",
      category: "authentication-error",
      operation: "auth.api",
      code: "BETTER_AUTH_LOG_EVENT",
    });
    
  });
});
