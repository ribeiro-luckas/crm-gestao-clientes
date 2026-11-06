import { describe, expect, it } from "vitest";
import { mapOrganizationRequiresOwnerError } from "@/lib/organization-owner-invariant-error";
import { handleAuthRequestWithMappedErrors, recordOrganizationOwnerInvariantError } from "@/lib/auth-http-error-context";

describe("mapOrganizationRequiresOwnerError", () => {

  it("converte a constraint exata mesmo quando está aninhada em cause", () => {
    
    const error = new Error("Failed query: delete from member", {
      cause: Object.assign(new Error("database error"), {
        cause: Object.assign(new Error("check constraint failed"), {
          code: "23514",
          constraint: "organization_requires_owner",
        }),
      }),
    });

    const mapped = mapOrganizationRequiresOwnerError(error);

    expect(mapped).toEqual({
      code: "ORGANIZATION_REQUIRES_OWNER",
      message: "A organização precisa manter pelo menos um proprietário.",
    });

  });

  it.each([
    [{ code: "23514", constraint: "some_other_constraint" }],
    [{ code: "23503", constraint: "organization_requires_owner" }],
    [{ code: "23514" }],
    [new Error("Falha interna sem metadados PostgreSQL")],
  ])("não converte erros que não correspondem à constraint exata: %j", (error) => {

    expect(mapOrganizationRequiresOwnerError(error)).toBeUndefined();

  });

  it("percorre causas cíclicas sem travar", () => {

    const error: { code: string; constraint: string; cause?: unknown } = {
      code: "XX000",
      constraint: "unrelated",
    };

    error.cause = error;

    expect(mapOrganizationRequiresOwnerError(error)).toBeUndefined();

  });

  it("só transforma a resposta 500 dos endpoints de remoção protegidos", async () => {

    const postgresError = Object.assign(new Error("db details"), {
      code: "23514",
      constraint: "organization_requires_owner",
    });

    const response = await handleAuthRequestWithMappedErrors(
      "/api/auth/organization/leave",

      async () => {

        // Simula o Better Auth reportando a exceção para onAPIError antes de
        // produzir seu SERVER_ERROR genérico; a integração verifica o fluxo real.
        recordOrganizationOwnerInvariantError(postgresError);

        return new Response(null, {
          status: 500
        });

      },
    );

    expect(response.status).toBe(409);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toMatchObject({
      code: "ORGANIZATION_REQUIRES_OWNER"
    });

    const unrelatedDatabaseError = Object.assign(new Error("other check violation"), {
      code: "23514",
      constraint: "unrelated_check_constraint",
    });
    const preservedServerError = await handleAuthRequestWithMappedErrors(
      "/api/auth/organization/remove-member",

      async () => {

        recordOrganizationOwnerInvariantError(unrelatedDatabaseError);

        return new Response(null, {
          status: 500
        });

      },
    );

    expect(preservedServerError.status).toBe(500);
    expect(await preservedServerError.text()).toBe("");

    const unrelatedRoute = await handleAuthRequestWithMappedErrors(
      "/api/auth/sign-in/email",
      async () => {

        recordOrganizationOwnerInvariantError(postgresError);

        return new Response(null, { status: 500 });

      },
    );

    expect(unrelatedRoute.status).toBe(500);
    expect(await unrelatedRoute.text()).toBe("");

  });

  it("mapeia a exceção original propagada pela rota sem exigir callback observacional", async () => {

    const postgresError = new Error("drizzle wrapper", {
      cause: Object.assign(new Error("database constraint"), {
        code: "23514",
        constraint: "organization_requires_owner",
      }),
    });
    const response = await handleAuthRequestWithMappedErrors("/api/auth/organization/leave", async () => {

      throw postgresError;

    });

    expect(response.status).toBe(409);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toMatchObject({
      code: "ORGANIZATION_REQUIRES_OWNER"
    });

  });

  it("propaga exceções que não correspondem à constraint de OWNER", async () => {

    const original = new Error("unclassified database failure");

    await expect(handleAuthRequestWithMappedErrors("/api/auth/organization/leave", async () => {

      throw original;

    })).rejects.toBe(original);

  });
});
