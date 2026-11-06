import { and, asc, eq, or } from "drizzle-orm";
import { getDb } from "@/db";
import { member } from "@/db/schema/auth";
import { auditLogs } from "@/db/schema/crm";

export type AssignableMemberRole = "admin" | "member";
export type MemberRoleApiStatus = "BAD_REQUEST" | "FORBIDDEN";

export class MemberRoleChangeError extends Error {
  
  constructor(
    readonly code: string,
    readonly apiStatus: MemberRoleApiStatus,
    message: string,
  ) {

    super(message);

    this.name = "MemberRoleChangeError";

  }
}

/** Persists the membership change and its audit event in one PostgreSQL transaction. */
export async function updateMemberRoleWithAudit(input: {
  organizationId: string;
  actorUserId: string;
  memberId: string;
  role: string;
}) {

  const organizationId = input.organizationId.trim();
  const actorUserId = input.actorUserId.trim();
  const memberId = input.memberId.trim();
  const role = input.role.trim().toLowerCase();

  if (!organizationId || !actorUserId || !memberId || (role !== "admin" && role !== "member")) {

    throw new MemberRoleChangeError("INVALID_MEMBER_ROLE_CHANGE", "BAD_REQUEST", "Escolha um membro e um papel válidos.");

  }

  const db = getDb();

  return db.transaction(async (tx) => {

    // Lock both the authorizing OWNER and target in a stable order. Recheck
    // membership/role inside the same transaction that writes role + audit.
    const lockedMemberships = await tx.select({
      id: member.id,
      organizationId: member.organizationId,
      userId: member.userId,
      role: member.role,
    }).from(member)
      .where(and(
        eq(member.organizationId, organizationId),
        or(eq(member.userId, actorUserId), eq(member.id, memberId)),
      ))
      .orderBy(asc(member.userId), asc(member.id))
      .for("update");

    const actor = lockedMemberships.find((row) => row.userId === actorUserId);

    if (!actor || !actor.role.toLowerCase().split(",").map((item) => item.trim()).includes("owner")) {

      throw new MemberRoleChangeError("ROLE_CHANGE_FORBIDDEN", "FORBIDDEN", "Você não tem permissão para alterar papéis neste workspace.");

    }

    const target = lockedMemberships.find((row) => row.id === memberId);

    if (!target) {

      throw new MemberRoleChangeError("MEMBER_NOT_FOUND", "BAD_REQUEST", "Membro não encontrado neste workspace.");

    }

    if (target.userId === actorUserId) {

      throw new MemberRoleChangeError("CANNOT_CHANGE_OWN_ROLE", "FORBIDDEN", "Não é permitido alterar o próprio papel.");

    }

    if (target.role.toLowerCase().split(",").map((item) => item.trim()).includes("owner")) {

      throw new MemberRoleChangeError("OWNER_ROLE_PROTECTED", "FORBIDDEN", "O papel OWNER não pode ser alterado por este fluxo.");

    }

    const [updated] = await tx.update(member).set({ role }).where(and(
      eq(member.id, target.id),
      eq(member.organizationId, organizationId),
      eq(member.userId, target.userId),
      eq(member.role, target.role),
    )).returning({
      id: member.id,
      userId: member.userId,
      organizationId: member.organizationId,
      role: member.role,
    });

    if (!updated) {

      throw new MemberRoleChangeError("MEMBERSHIP_CHANGED_CONCURRENTLY", "FORBIDDEN", "A associação foi alterada. Atualize a página e tente novamente.");

    }

    await tx.insert(auditLogs).values({
      organizationId,
      actorUserId,
      action: "update",
      entityType: "member",
      entityId: memberId,
      details: JSON.stringify({ from: target.role, to: role }),
    });

    return updated;

  });
}
