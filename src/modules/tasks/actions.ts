"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { auditLogs, clients, deals, tasks } from "@/db/schema/crm";
import { member } from "@/db/schema/auth";
import { requireWorkspaceRole } from "@/lib/workspace";

const taskSchema = z.object({
  title: z.string().trim().min(2, "Informe um título.").max(160),
  description: z.string().trim().max(2000).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  dueAt: z.iso.datetime("Informe uma data e hora válidas."),
  clientId: z.union([z.uuid(), z.literal("")]).optional(),
  dealId: z.union([z.uuid(), z.literal("")]).optional(),
});

export async function createTask(input: unknown) {

  const parsed = taskSchema.safeParse(input);

  if (!parsed.success) return { ok: false as const, message: parsed.error.issues[0]?.message ?? "Confira os campos." };

  const context = await requireWorkspaceRole(["owner", "admin", "member"]);
  const db = getDb();
  const clientId = parsed.data.clientId || null;
  const dealId = parsed.data.dealId || null;

  const result = await db.transaction(async (tx) => {

    let dealClientId: string | null = null;

    if (dealId) {

      const [deal] = await tx.select({ id: deals.id, clientId: deals.clientId }).from(deals)
        .where(and(eq(deals.id, dealId), eq(deals.organizationId, context.organization.id), isNull(deals.deletedAt))).for("update").limit(1);

      if (!deal) return { ok: false as const, message: "Oportunidade não encontrada ou arquivada." };

      dealClientId = deal.clientId;

      if (clientId && clientId !== deal.clientId) return { ok: false as const, message: "A oportunidade não pertence ao cliente selecionado." };

    }
    const involvedIds = [...new Set([clientId, dealClientId].filter((value): value is string => Boolean(value)))].sort();

    if (involvedIds.length) {

      const lockedClients = await tx.select({ id: clients.id }).from(clients)
        .where(and(eq(clients.organizationId, context.organization.id), inArray(clients.id, involvedIds), isNull(clients.deletedAt)))
        .orderBy(asc(clients.id)).for("key share");

      if (lockedClients.length !== involvedIds.length) return { ok: false as const, message: "Cliente não encontrado ou arquivado." };

    }

    const [created] = await tx.insert(tasks).values({ organizationId: context.organization.id, title: parsed.data.title, description: parsed.data.description || null, priority: parsed.data.priority, dueAt: new Date(parsed.data.dueAt), assigneeUserId: context.user.id, clientId, dealId }).returning({ id: tasks.id });
    await tx.insert(auditLogs).values({ organizationId: context.organization.id, actorUserId: context.user.id, action: "create", entityType: "task", entityId: created.id, details: JSON.stringify({ priority: parsed.data.priority, clientId, dealId }) });
    
    return { ok: true as const, id: created.id };

  });

  if (!result.ok) return result;

  revalidatePath("/tasks");
  revalidatePath("/dashboard");

  if (clientId) revalidatePath(`/clients/${clientId}`);

  return { ok: true as const, id: result.id };

}

export async function setTaskStatus(input: unknown) {

  const parsed = z.object({ taskId: z.uuid(), status: z.enum(["todo", "in_progress", "done", "canceled"]) }).safeParse(input);

  if (!parsed.success) return { ok: false as const, message: "Dados da tarefa inválidos." };

  const context = await requireWorkspaceRole(["owner", "admin", "member"]);
  const db = getDb();
  const result = await db.transaction(async (tx) => {
    
    const [snapshot] = await tx.select({ id: tasks.id, dealId: tasks.dealId }).from(tasks)
      .where(and(eq(tasks.id, parsed.data.taskId), eq(tasks.organizationId, context.organization.id), isNull(tasks.deletedAt)))
      .limit(1);
    if (!snapshot) return { ok: false as const, message: "Tarefa não encontrada." };

    // ON UPDATE RESTRICT checks referencing task rows with key-share locks.
    // Locking the deal first avoids a deal -> task / task -> deal lock cycle.
    let deal: { id: string; clientId: string } | undefined;

    if (snapshot.dealId) {

      [deal] = await tx.select({ id: deals.id, clientId: deals.clientId }).from(deals)
        .where(and(eq(deals.id, snapshot.dealId), eq(deals.organizationId, context.organization.id), isNull(deals.deletedAt)))
        .for("update").limit(1);

      if (!deal) return { ok: false as const, message: "A oportunidade vinculada não está ativa." };

    }

    const [task] = await tx.select({ id: tasks.id, status: tasks.status, clientId: tasks.clientId, dealId: tasks.dealId }).from(tasks)
      .where(and(eq(tasks.id, snapshot.id), eq(tasks.organizationId, context.organization.id), isNull(tasks.deletedAt)))
      .for("update").limit(1);

    if (!task) return { ok: false as const, message: "Tarefa não encontrada." };

    if (task.dealId !== snapshot.dealId) return { ok: false as const, message: "A tarefa foi alterada em paralelo. Atualize e tente novamente." };

    const dealClientId = deal?.clientId ?? null;

    if (task.dealId && task.clientId && task.clientId !== dealClientId) {

      return { ok: false as const, message: "A tarefa possui vínculos inconsistentes." };

    }

    const involvedIds = [...new Set([task.clientId, dealClientId].filter((value): value is string => Boolean(value)))].sort();
    const pendingStatus = parsed.data.status === "todo" || parsed.data.status === "in_progress";

    if (pendingStatus && involvedIds.length) {

      const activeClients = await tx.select({ id: clients.id }).from(clients)
        .where(and(eq(clients.organizationId, context.organization.id), inArray(clients.id, involvedIds), isNull(clients.deletedAt)))
        .orderBy(asc(clients.id)).for("key share");

      if (activeClients.length !== involvedIds.length) return { ok: false as const, message: "Não é possível reabrir tarefa vinculada a cliente arquivado." };
    }

    const [updated] = await tx.update(tasks).set({ status: parsed.data.status, updatedAt: new Date() }).where(and(eq(tasks.id, task.id), eq(tasks.organizationId, context.organization.id), isNull(tasks.deletedAt))).returning({ id: tasks.id });

    if (!updated) return { ok: false as const, message: "Tarefa não encontrada." };

    await tx.insert(auditLogs).values({ organizationId: context.organization.id, actorUserId: context.user.id, action: "update", entityType: "task", entityId: task.id, details: JSON.stringify({ from: task.status, to: parsed.data.status }) });

    return { ok: true as const, clientId: task.clientId };
  });

  if (!result.ok) return result;

  revalidatePath("/tasks");
  revalidatePath("/dashboard");

  if (result.clientId) revalidatePath(`/clients/${result.clientId}`);

  return { ok: true as const };

}

export async function reassignTaskAssignee(input: unknown) {

  const parsed = z.object({ taskId: z.uuid(), newUserId: z.string().min(1).nullable() }).safeParse(input);

  if (!parsed.success) return { ok: false as const, message: "Confira os dados do responsável." };

  const context = await requireWorkspaceRole(["owner"]);
  const db = getDb();
  const result = await db.transaction(async (tx) => {

    const [task] = await tx.select({
      id: tasks.id,
      assigneeUserId: tasks.assigneeUserId,
      clientId: tasks.clientId,
      dealId: tasks.dealId,
    }).from(tasks)
      .where(and(eq(tasks.id, parsed.data.taskId), eq(tasks.organizationId, context.organization.id), isNull(tasks.deletedAt)))
      .for("update").limit(1);

    if (!task) return { ok: false as const, message: "Tarefa não encontrada ou não editável." };

    if (task.assigneeUserId === parsed.data.newUserId) return { ok: true as const, changed: false };

    if (parsed.data.newUserId !== null) {

      const [membership] = await tx.select({ userId: member.userId }).from(member)
        .where(and(eq(member.organizationId, context.organization.id), eq(member.userId, parsed.data.newUserId)))
        .for("key share").limit(1);

      if (!membership) return { ok: false as const, message: "Responsável não encontrado neste workspace." };

    }

    const [updated] = await tx.update(tasks).set({ assigneeUserId: parsed.data.newUserId, updatedAt: new Date() })
      .where(and(eq(tasks.id, task.id), eq(tasks.organizationId, context.organization.id), isNull(tasks.deletedAt)))
      .returning({ id: tasks.id });

    if (!updated) return { ok: false as const, message: "Tarefa não encontrada ou não editável." };

    await tx.insert(auditLogs).values({
      organizationId: context.organization.id,
      actorUserId: context.user.id,
      action: parsed.data.newUserId === null ? "unassign" : "reassign",
      entityType: "task",
      entityId: task.id,
      details: JSON.stringify({ fromUserId: task.assigneeUserId, toUserId: parsed.data.newUserId }),
    });
    
    return { ok: true as const, changed: true, clientId: task.clientId, dealId: task.dealId };

  });

  if (!result.ok) return result;

  if (result.changed) {

    revalidatePath("/tasks");
    revalidatePath("/dashboard");

    if (result.clientId) revalidatePath(`/clients/${result.clientId}`);

    if (result.dealId) revalidatePath(`/deals/${result.dealId}`);

  }

  return { ok: true as const, id: parsed.data.taskId };

}
