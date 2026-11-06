import { describe, expect, it } from "vitest";
import { mapDealLinkedTasksError } from "@/lib/deal-linked-tasks-error";

const publicConflict = {
  ok: false,
  code: "DEAL_HAS_LINKED_TASKS",
  message: "Não é possível alterar o cliente desta oportunidade enquanto houver tarefas vinculadas. Reconcilie as tarefas e tente novamente.",
};

describe("mapDealLinkedTasksError", () => {

  it("reconhece a combinação exata de SQLSTATE e constraint I-01", () => {

    expect(mapDealLinkedTasksError({
      code: "23001",
      constraint: "tasks_deal_client_consistency_fk"
    })).toEqual(publicConflict);

  });

  it("reconhece erro encapsulado em cause", () => {

    const error = new Error("Drizzle query wrapper", {
      cause: Object.assign(new Error("database error"), {
        code: "23001",
        constraint: "tasks_deal_client_consistency_fk"
      }),
    });

    expect(mapDealLinkedTasksError(error)).toEqual(publicConflict);

  });

  it("percorre causas em vários níveis", () => {

    const error = new Error("outer", {
      cause: new Error("middle", {
        cause: Object.assign(new Error("postgres"), {
          code: "23001",
          constraint: "tasks_deal_client_consistency_fk"
        }),
      }),
    });

    expect(mapDealLinkedTasksError(error)).toEqual(publicConflict);

  });

  it.each([

    {
      code: "23001",
      constraint: "other_restrict_fk"
    },
    {
      code: "23503",
      constraint: "tasks_deal_client_consistency_fk"
    },
    {
      code: "23514",
      constraint: "organization_requires_owner"
    },
    {
      message: "unknown database error"
    },

    new Error("no cause or PostgreSQL metadata"),

  ])("não classifica erro diferente do contrato I-01: %j", (error) => {

    expect(mapDealLinkedTasksError(error)).toBeUndefined();

  });

  it("lida com causas cíclicas", () => {

    const error: {
      code: string;
      constraint: string;
      cause?: unknown
    } = {
      code: "XX000",
      constraint: "unknown"
    };

    error.cause = error;

    expect(mapDealLinkedTasksError(error)).toBeUndefined();

  });
});
