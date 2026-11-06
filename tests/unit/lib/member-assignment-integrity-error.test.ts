import { describe, expect, it } from "vitest";
import { mapMemberAssignmentIntegrityError } from "@/lib/member-assignment-integrity-error";
import { handleAuthRequestWithMappedErrors, recordMemberAssignmentIntegrityError } from "@/lib/auth-http-error-context";

const constraints = [
  "clients_owner_member_assignment_fk",
  "deals_owner_member_assignment_fk",
  "tasks_assignee_member_assignment_fk",
] as const;

const publicConflict = {
  code: "MEMBER_HAS_ASSIGNMENTS",
  message: "Este membro ainda possui responsabilidades atribuídas. Transfira ou remova as atribuições antes de continuar.",
};

describe("mapMemberAssignmentIntegrityError", () => {
  
  it.each(constraints)("reconhece apenas SQLSTATE 23001 com a constraint %s", (constraint) => {

    expect(mapMemberAssignmentIntegrityError({
      code: "23001",
      constraint
    })).toEqual(publicConflict);

  });

  it("reconhece o erro PostgreSQL encapsulado em cause", () => {

    const error = new Error("Drizzle query wrapper", {
      cause: Object.assign(new Error("database error"), {
        code: "23001",
        constraint: constraints[0],
      }),
    });

    expect(mapMemberAssignmentIntegrityError(error)).toEqual(publicConflict);

  });

  it("percorre múltiplos níveis de cause", () => {

    const error = new Error("outer", {
      cause: new Error("middle", {
        cause: Object.assign(new Error("postgres"), {
          code: "23001",
          constraint: constraints[2]
        }),
      }),
    });

    expect(mapMemberAssignmentIntegrityError(error)).toEqual(publicConflict);

  });

  it.each([

    {
      code: "23001",
      constraint: "unknown_assignment_fk"
    },
    {
      code: "23503",
      constraint: constraints[0]
    },
    {
      message: "unclassified error"
    },

    new Error("no cause or PostgreSQL metadata"),

    {
      code: "23514",
      constraint: "organization_requires_owner"
    },

  ])("não classifica erro fora do contrato M-01: %j", (error) => {

    expect(mapMemberAssignmentIntegrityError(error)).toBeUndefined();

  });

  it("atravessa causas cíclicas sem classificar o erro", () => {

    const error: {
      code: string;
      constraint: string;
      cause?: unknown
    } = {
      code: "XX000",
      constraint: "unrelated"
    };

    error.cause = error;

    expect(mapMemberAssignmentIntegrityError(error)).toBeUndefined();

  });
});

describe("recordMemberAssignmentIntegrityError", () => {

  it.each([
    "/api/auth/organization/leave",
    "/api/auth/organization/remove-member",
  ])("converte a violação estrita em resposta 409 somente em %s", async (path) => {

    const response = await handleAuthRequestWithMappedErrors(path, async () => {

      recordMemberAssignmentIntegrityError({
        code: "23001",
        constraint: constraints[1]
      });

      return new Response("internal database details", {
        status: 500
      });

    });

    expect(response.status).toBe(409);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual(publicConflict);

  });

  it("não converte erros não relacionados nem erros de OWNER", async () => {

    const response = await handleAuthRequestWithMappedErrors("/api/auth/organization/remove-member", async () => {

      recordMemberAssignmentIntegrityError({
        code: "23001",
        constraint: "other_restrict_fk"
      });
      recordMemberAssignmentIntegrityError({
        code: "23514",
        constraint: "organization_requires_owner"
      });

      return new Response("", {
        status: 500
      });

    });

    expect(response.status).toBe(500);
    expect(await response.text()).toBe("");

  });

  it("não converte erro M-01 em rota diferente", async () => {

    const response = await handleAuthRequestWithMappedErrors("/api/auth/sign-in/email", async () => {

      expect(recordMemberAssignmentIntegrityError({
        code: "23001",
        constraint: constraints[0]
      })).toBe(false);

      return new Response("", {
        status: 500
      });

    });

    expect(response.status).toBe(500);
    expect(await response.text()).toBe("");

  });

  it("mapeia a exceção original propagada pela rota", async () => {

    const error = new Error("drizzle wrapper", {
      cause: Object.assign(new Error("assignment constraint"), {
        code: "23001",
        constraint: constraints[1],
      }),
    });
    const response = await handleAuthRequestWithMappedErrors("/api/auth/organization/remove-member", async () => {

      throw error;

    });

    expect(response.status).toBe(409);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual(publicConflict);

  });

  it("propaga exceções que não correspondem a uma constraint M-01", async () => {

    const original = new Error("unclassified database failure");

    await expect(handleAuthRequestWithMappedErrors("/api/auth/organization/remove-member", async () => {

      throw original;

    })).rejects.toBe(original);

  });
});
