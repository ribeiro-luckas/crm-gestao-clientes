const MEMBER_ASSIGNMENT_CODE = "23001";
const MEMBER_ASSIGNMENT_CONSTRAINTS = new Set([
  "clients_owner_member_assignment_fk",
  "deals_owner_member_assignment_fk",
  "tasks_assignee_member_assignment_fk",
]);

export type MemberAssignmentConflict = {
  code: "MEMBER_HAS_ASSIGNMENTS";
  message: string;
};

/** Maps only the three PostgreSQL RESTRICT constraints introduced by M-01. */
export function mapMemberAssignmentIntegrityError(error: unknown): MemberAssignmentConflict | undefined {
  
  const visited = new Set<object>();

  let current: unknown = error;

  while (current && typeof current === "object" && !visited.has(current)) {

    visited.add(current);

    const candidate = current as { code?: unknown; constraint?: unknown; cause?: unknown };

    if (candidate.code === MEMBER_ASSIGNMENT_CODE &&
      typeof candidate.constraint === "string" &&
      MEMBER_ASSIGNMENT_CONSTRAINTS.has(candidate.constraint)) {
        
      return {
        code: "MEMBER_HAS_ASSIGNMENTS",
        message: "Este membro ainda possui responsabilidades atribuídas. Transfira ou remova as atribuições antes de continuar.",
      };
    }

    current = candidate.cause;
  }

  return undefined;
}
