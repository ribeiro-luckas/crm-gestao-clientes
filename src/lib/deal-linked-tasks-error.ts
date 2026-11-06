const DEAL_LINKED_TASKS_SQLSTATE = "23001";
const DEAL_LINKED_TASKS_CONSTRAINT = "tasks_deal_client_consistency_fk";

export type DealLinkedTasksConflict = {
  ok: false;
  code: "DEAL_HAS_LINKED_TASKS";
  message: string;
};

/** Maps only the I-01 RESTRICT violation raised while changing a deal's client. */
export function mapDealLinkedTasksError(error: unknown): DealLinkedTasksConflict | undefined {
  
  const visited = new Set<object>();

  let current: unknown = error;

  while (current && typeof current === "object" && !visited.has(current)) {

    visited.add(current);

    const candidate = current as { code?: unknown; constraint?: unknown; cause?: unknown };

    if (candidate.code === DEAL_LINKED_TASKS_SQLSTATE && candidate.constraint === DEAL_LINKED_TASKS_CONSTRAINT) {

      return {
        ok: false,
        code: "DEAL_HAS_LINKED_TASKS",
        message: "Não é possível alterar o cliente desta oportunidade enquanto houver tarefas vinculadas. Reconcilie as tarefas e tente novamente.",
      };
    }

    current = candidate.cause;
  }

  return undefined;
}
