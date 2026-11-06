const OWNER_INVARIANT_CODE = "23514";
const OWNER_INVARIANT_CONSTRAINT = "organization_requires_owner";

export type OrganizationOwnerConflict = {
  code: "ORGANIZATION_REQUIRES_OWNER";
  message: string;
};

/** Maps only the PostgreSQL invariant that prevents an organization losing every OWNER. */
export function mapOrganizationRequiresOwnerError(error: unknown): OrganizationOwnerConflict | undefined {
  
  const visited = new Set<object>();

  let current: unknown = error;

  while (current && typeof current === "object" && !visited.has(current)) {

    visited.add(current);

    const candidate = current as { code?: unknown; constraint?: unknown; cause?: unknown };

    if (candidate.code === OWNER_INVARIANT_CODE && candidate.constraint === OWNER_INVARIANT_CONSTRAINT) {

      return {
        code: "ORGANIZATION_REQUIRES_OWNER",
        message: "A organização precisa manter pelo menos um proprietário.",
      };
    }

    current = candidate.cause;
  }

  return undefined;
}
