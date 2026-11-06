"use server";

import { revalidatePath } from "next/cache";
import { and, asc, count, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { auditLogs, clients, deals, tasks } from "@/db/schema/crm";
import { member, user } from "@/db/schema/auth";
import { requireWorkspaceRole } from "@/lib/workspace";
import { updateMemberRoleWithAudit } from "@/modules/team/member-role-service";
import { safeLogger } from "@/lib/safe-logger";

class IncompleteAssignmentTransferError extends Error {

  constructor() {

    super("A transferência não pôde ser concluída integralmente por alteração concorrente.");

    this.name = "IncompleteAssignmentTransferError";
    
  }

}

type AssignmentTransferResult =
  | { ok: false; message: string }
  | {
      ok: true;
      counts: { clients: number; deals: number; tasks: number; total: number };
      archivedReferencesPending: { clients: number; deals: number; tasks: number; total: number };
    };

export type MemberAssignmentSummary = {
  memberId: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  clients: { active: number; archived: number };
  deals: { active: number; archived: number };
  tasks: { active: number; archived: number };
  total: { active: number; archived: number; all: number };
};

/** Resumo administrativo, sempre limitado ao workspace autenticado e a OWNER. */
export async function getMemberAssignmentSummary(): Promise<MemberAssignmentSummary[]> {

  const context = await requireWorkspaceRole(["owner"]);
  const db = getDb();

  return db.transaction(async (tx) => {

    // Revalida e mantém a membership durante a leitura para não servir o painel
    // se a membership for removida ou o papel mudar entre o guard e a consulta.
    const [authorizedMember] = await tx.select({ role: member.role }).from(member)
      .where(and(eq(member.organizationId, context.organization.id), eq(member.userId, context.user.id)))
      .for("share").limit(1);

    if (!authorizedMember || authorizedMember.role.toLowerCase() !== "owner") {

      throw new Error("Acesso não autorizado ao resumo de responsabilidades.");

    }

    const members = await tx.select({
      memberId: member.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      role: member.role,
    }).from(member)
      .innerJoin(user, eq(user.id, member.userId))
      .where(eq(member.organizationId, context.organization.id))
      .orderBy(asc(member.createdAt));

    const clientCounts = await tx.select({
      userId: clients.ownerUserId,
      active: sql<number>`count(*) filter (where ${clients.deletedAt} is null)::int`,
      archived: sql<number>`count(*) filter (where ${clients.deletedAt} is not null)::int`,
    }).from(clients)
      .where(and(eq(clients.organizationId, context.organization.id), isNotNull(clients.ownerUserId)))
      .groupBy(clients.ownerUserId);

    const dealCounts = await tx.select({
      userId: deals.ownerUserId,
      active: sql<number>`count(*) filter (where ${deals.deletedAt} is null)::int`,
      archived: sql<number>`count(*) filter (where ${deals.deletedAt} is not null)::int`,
    }).from(deals)
      .where(and(eq(deals.organizationId, context.organization.id), isNotNull(deals.ownerUserId)))
      .groupBy(deals.ownerUserId);

    const taskCounts = await tx.select({
      userId: tasks.assigneeUserId,
      active: sql<number>`count(*) filter (where ${tasks.deletedAt} is null)::int`,
      archived: sql<number>`count(*) filter (where ${tasks.deletedAt} is not null)::int`,
    }).from(tasks)
      .where(and(eq(tasks.organizationId, context.organization.id), isNotNull(tasks.assigneeUserId)))
      .groupBy(tasks.assigneeUserId);

    const clientsByUser = new Map(clientCounts.map((row) => [row.userId, { active: row.active, archived: row.archived }]));
    const dealsByUser = new Map(dealCounts.map((row) => [row.userId, { active: row.active, archived: row.archived }]));
    const tasksByUser = new Map(taskCounts.map((row) => [row.userId, { active: row.active, archived: row.archived }]));

    return members.map((person) => {

      const personClients = clientsByUser.get(person.userId) ?? { active: 0, archived: 0 };
      const personDeals = dealsByUser.get(person.userId) ?? { active: 0, archived: 0 };
      const personTasks = tasksByUser.get(person.userId) ?? { active: 0, archived: 0 };
      const active = personClients.active + personDeals.active + personTasks.active;
      const archived = personClients.archived + personDeals.archived + personTasks.archived;

      return {
        ...person,
        clients: personClients,
        deals: personDeals,
        tasks: personTasks,
        total: { active, archived, all: active + archived },
      };

    });
  }, { isolationLevel: "repeatable read" });
}

export async function updateMemberRole(memberId: string, role: string) {

  if (!memberId || !["admin", "member"].includes(role)) throw new Error("Escolha um papel válido.");

  const context = await requireWorkspaceRole(["owner"]);
  const db = getDb();
  const [target] = await db.select({ id: member.id, role: member.role, userId: member.userId }).from(member).where(and(eq(member.id, memberId), eq(member.organizationId, context.organization.id))).limit(1);

  if (!target) throw new Error("Membro não encontrado neste workspace.");

  if (target.userId === context.user.id) throw new Error("Não é permitido alterar o próprio papel.");

  if (target.role === "owner") throw new Error("O papel OWNER não pode ser alterado por este fluxo.");

  try {

    await updateMemberRoleWithAudit({
      organizationId: context.organization.id,
      actorUserId: context.user.id,
      memberId,
      role,
    });

  } catch (error) {

    safeLogger.error({ category: "internal-error", operation: "team.role.update", error });

    throw new Error("Não foi possível atualizar o papel do membro.");

  }

  revalidatePath("/team");

}

export async function transferMemberAssignments(input: unknown) {

  const parsed = z.object({
    fromUserId: z.string().min(1),
    toUserId: z.string().min(1).nullable(),
  }).safeParse(input);

  if (!parsed.success) return { ok: false as const, message: "Informe membros válidos para a transferência." };

  const context = await requireWorkspaceRole(["owner"]);

  if (parsed.data.toUserId === parsed.data.fromUserId) {

    return { ok: false as const, message: "A origem e o destino devem ser diferentes." };

  }

  const db = getDb();

  let result: AssignmentTransferResult;

  try {

    result = await db.transaction(async (tx) => {

      // Ordem global de locks compatível com as ações existentes:
      // tarefas -> oportunidades -> clientes -> memberships ordenadas por userId.
      // Inclui deletedAt preenchido para não deixar referências arquivadas órfãs.
      const lockedTasks = await tx.select({ id: tasks.id }).from(tasks)
        .where(and(eq(tasks.organizationId, context.organization.id), eq(tasks.assigneeUserId, parsed.data.fromUserId)))
        .orderBy(asc(tasks.id)).for("update");
      const lockedDeals = await tx.select({ id: deals.id }).from(deals)
        .where(and(eq(deals.organizationId, context.organization.id), eq(deals.ownerUserId, parsed.data.fromUserId)))
        .orderBy(asc(deals.id)).for("update");
      const lockedClients = await tx.select({ id: clients.id }).from(clients)
        .where(and(eq(clients.organizationId, context.organization.id), eq(clients.ownerUserId, parsed.data.fromUserId)))
        .orderBy(asc(clients.id)).for("update");

      const membershipUserIds = [parsed.data.fromUserId, ...(parsed.data.toUserId ? [parsed.data.toUserId] : [])].sort();
      const memberships = await tx.select({ userId: member.userId }).from(member)
        .where(and(eq(member.organizationId, context.organization.id), inArray(member.userId, membershipUserIds)))
        .orderBy(asc(member.userId)).for("update");

      if (memberships.length !== membershipUserIds.length) {

        return { ok: false as const, message: "Origem ou destino não é membro deste workspace." };

      }

      const auditEntries: (typeof auditLogs.$inferInsert)[] = [];
      const nextUserId = parsed.data.toUserId;
      const action = nextUserId === null ? "unassign" : "reassign";

      const updatedTaskIds: string[] = [];

      for (let offset = 0; offset < lockedTasks.length; offset += 500) {

        const ids = lockedTasks.slice(offset, offset + 500).map((row) => row.id);
        const rows = await tx.update(tasks).set({ assigneeUserId: nextUserId, updatedAt: new Date() })
          .where(and(eq(tasks.organizationId, context.organization.id), eq(tasks.assigneeUserId, parsed.data.fromUserId), inArray(tasks.id, ids)))
          .returning({ id: tasks.id });

        updatedTaskIds.push(...rows.map((row) => row.id));

      }

      for (const id of updatedTaskIds) auditEntries.push({
        organizationId: context.organization.id, actorUserId: context.user.id, action, entityType: "task", entityId: id,
        details: JSON.stringify({ fromUserId: parsed.data.fromUserId, toUserId: nextUserId }),
      });

      const updatedDealIds: string[] = [];

      for (let offset = 0; offset < lockedDeals.length; offset += 500) {

        const ids = lockedDeals.slice(offset, offset + 500).map((row) => row.id);
        const rows = await tx.update(deals).set({ ownerUserId: nextUserId, updatedAt: new Date() })
          .where(and(eq(deals.organizationId, context.organization.id), eq(deals.ownerUserId, parsed.data.fromUserId), inArray(deals.id, ids)))
          .returning({ id: deals.id });

        updatedDealIds.push(...rows.map((row) => row.id));

      }

      for (const id of updatedDealIds) auditEntries.push({
        organizationId: context.organization.id, actorUserId: context.user.id, action, entityType: "deal", entityId: id,
        details: JSON.stringify({ fromUserId: parsed.data.fromUserId, toUserId: nextUserId }),
      });

      const updatedClientIds: string[] = [];

      for (let offset = 0; offset < lockedClients.length; offset += 500) {

        const ids = lockedClients.slice(offset, offset + 500).map((row) => row.id);
        const rows = await tx.update(clients).set({ ownerUserId: nextUserId, updatedAt: new Date() })
          .where(and(eq(clients.organizationId, context.organization.id), eq(clients.ownerUserId, parsed.data.fromUserId), inArray(clients.id, ids)))
          .returning({ id: clients.id });

        updatedClientIds.push(...rows.map((row) => row.id));

      }
      
      for (const id of updatedClientIds) auditEntries.push({
        organizationId: context.organization.id, actorUserId: context.user.id, action, entityType: "client", entityId: id,
        details: JSON.stringify({ fromUserId: parsed.data.fromUserId, toUserId: nextUserId }),
      });

      for (let offset = 0; offset < auditEntries.length; offset += 300) {

        await tx.insert(auditLogs).values(auditEntries.slice(offset, offset + 300));

      }

      // Confirma que as referências arquivadas também foram tratadas. Se novas
      // referências apareceram durante o lote, abortamos em vez de reportar sucesso parcial.
      const [archivedClients] = await tx.select({ value: count() }).from(clients).where(and(
        eq(clients.organizationId, context.organization.id), eq(clients.ownerUserId, parsed.data.fromUserId), isNotNull(clients.deletedAt),
      ));
      const [archivedDeals] = await tx.select({ value: count() }).from(deals).where(and(
        eq(deals.organizationId, context.organization.id), eq(deals.ownerUserId, parsed.data.fromUserId), isNotNull(deals.deletedAt),
      ));
      const [archivedTasks] = await tx.select({ value: count() }).from(tasks).where(and(
        eq(tasks.organizationId, context.organization.id), eq(tasks.assigneeUserId, parsed.data.fromUserId), isNotNull(tasks.deletedAt),
      ));
      const archivedReferencesPending = {
        clients: archivedClients.value,
        deals: archivedDeals.value,
        tasks: archivedTasks.value,
        total: archivedClients.value + archivedDeals.value + archivedTasks.value,
      };

      const [remainingClients] = await tx.select({ value: count() }).from(clients).where(and(
        eq(clients.organizationId, context.organization.id), eq(clients.ownerUserId, parsed.data.fromUserId),
      ));
      const [remainingDeals] = await tx.select({ value: count() }).from(deals).where(and(
        eq(deals.organizationId, context.organization.id), eq(deals.ownerUserId, parsed.data.fromUserId),
      ));
      const [remainingTasks] = await tx.select({ value: count() }).from(tasks).where(and(
        eq(tasks.organizationId, context.organization.id), eq(tasks.assigneeUserId, parsed.data.fromUserId),
      ));

      if (remainingClients.value || remainingDeals.value || remainingTasks.value) throw new IncompleteAssignmentTransferError();

      return {

        ok: true as const,
        counts: {
          clients: updatedClientIds.length,
          deals: updatedDealIds.length,
          tasks: updatedTaskIds.length,
          total: updatedClientIds.length + updatedDealIds.length + updatedTaskIds.length,
        },
        archivedReferencesPending,
        
      };
    });
  } catch (error) {

    if (error instanceof IncompleteAssignmentTransferError) {

      return { ok: false as const, message: "A transferência foi revertida porque não pôde abranger todas as atribuições. Tente novamente." };

    }

    throw error;

  }

  if (!result.ok) return result;

  if (result.counts.total > 0) {

    revalidatePath("/team");
    revalidatePath("/clients");
    revalidatePath("/deals");
    revalidatePath("/tasks");
    revalidatePath("/dashboard");

  }

  return result;

}
