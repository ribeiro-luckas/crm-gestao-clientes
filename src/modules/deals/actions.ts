"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { auditLogs, clients, deals } from "@/db/schema/crm";
import { member } from "@/db/schema/auth";
import { mapDealLinkedTasksError } from "@/lib/deal-linked-tasks-error";
import { requireWorkspaceRole } from "@/lib/workspace";

const dealSchema = z.object({
  clientId: z.uuid("Selecione um cliente válido."),
  title: z.string().trim().min(2, "Informe o nome da oportunidade.").max(160),
  amount: z.string().regex(/^\d{1,12}(?:\.\d{1,2})?$/, "Informe um valor válido com até duas casas decimais."),
  expectedCloseAt: z.union([z.iso.date(), z.literal("")]).optional(),
});

export async function createDeal(input: unknown) {

  const parsed = dealSchema.safeParse(input);

  if (!parsed.success) return { ok: false as const, message: parsed.error.issues[0]?.message ?? "Confira os campos." };

  const context = await requireWorkspaceRole(["owner", "admin", "member"]);
  const db = getDb();
  const amount = parsed.data.amount.includes(".") ? parsed.data.amount : `${parsed.data.amount}.00`;
  const result = await db.transaction(async (tx) => {
    
    const [client] = await tx.select({ id: clients.id }).from(clients).where(and(eq(clients.id, parsed.data.clientId), eq(clients.organizationId, context.organization.id), isNull(clients.deletedAt))).for("key share").limit(1);

    if (!client) return { ok: false as const, message: "Cliente não encontrado ou arquivado." };

    const [row] = await tx.insert(deals).values({ organizationId: context.organization.id, clientId: client.id, title: parsed.data.title, amount, expectedCloseAt: parsed.data.expectedCloseAt || null, ownerUserId: context.user.id }).returning({ id: deals.id });

    await tx.insert(auditLogs).values({ organizationId: context.organization.id, actorUserId: context.user.id, action: "create", entityType: "deal", entityId: row.id, details: JSON.stringify({ clientId: client.id, stage: "new_lead", currency: "BRL" }) });

    return { ok: true as const, id: row.id, clientId: client.id };

  });

  if (!result.ok) return result;

  revalidatePath("/deals");
  revalidatePath("/dashboard");
  revalidatePath(`/clients/${result.clientId}`);

  return { ok: true as const, id: result.id };
}

export async function updateDeal(id: string, input: unknown) {

  const parsedId = z.uuid().safeParse(id);
  const parsed = dealSchema.safeParse(input);

  if (!parsedId.success || !parsed.success) return { ok: false as const, message: "Confira os dados da oportunidade." };

  const context = await requireWorkspaceRole(["owner", "admin", "member"]);
  const db = getDb();
  const amount = parsed.data.amount.includes(".") ? parsed.data.amount : `${parsed.data.amount}.00`;

  let result;

  try {

    result = await db.transaction(async (tx) => {

      const [existing] = await tx.select({ id: deals.id, clientId: deals.clientId })
        .from(deals)
        .where(and(eq(deals.id, id), eq(deals.organizationId, context.organization.id), isNull(deals.deletedAt)))
        .for("update").limit(1);

      if (!existing) return { ok: false as const, message: "Oportunidade não encontrada." };

      const involvedIds = [...new Set([existing.clientId, parsed.data.clientId])].sort();
      const lockedClients = await tx.select({ id: clients.id })
        .from(clients)
        .where(and(eq(clients.organizationId, context.organization.id), inArray(clients.id, involvedIds), isNull(clients.deletedAt)))
        .orderBy(asc(clients.id)).for("key share");

      if (lockedClients.length !== involvedIds.length) return { ok: false as const, message: "Cliente não encontrado ou arquivado." };

      const [updated] = await tx.update(deals).set({
        clientId: parsed.data.clientId,
        title: parsed.data.title,
        amount,
        expectedCloseAt: parsed.data.expectedCloseAt || null,
        updatedAt: new Date(),
      }).where(and(eq(deals.id, id), eq(deals.organizationId, context.organization.id), isNull(deals.deletedAt))).returning({ id: deals.id });

      if (!updated) return { ok: false as const, message: "Oportunidade não encontrada." };

      await tx.insert(auditLogs).values({ organizationId: context.organization.id, actorUserId: context.user.id, action: "update", entityType: "deal", entityId: id, details: JSON.stringify({ clientId: parsed.data.clientId, amount, expectedCloseAt: parsed.data.expectedCloseAt || null }) });

      return { ok: true as const, oldClientId: existing.clientId, clientId: parsed.data.clientId };

    });
  } catch (error) {

    const conflict = mapDealLinkedTasksError(error);

    if (conflict) return conflict;

    throw error;

  }

  if (!result.ok) return result;

  revalidatePath("/deals");
  revalidatePath(`/deals/${id}`);
  revalidatePath(`/clients/${result.oldClientId}`);
  revalidatePath(`/clients/${result.clientId}`);
  revalidatePath("/dashboard");

  return { ok: true as const, id };
}

const stageSchema = z.object({ dealId: z.uuid(), stage: z.enum(["new_lead", "qualification", "proposal", "negotiation", "won", "lost"]), lossReason: z.string().trim().max(500).optional() });

export async function updateDealStage(input: unknown) {

  const parsed = stageSchema.safeParse(input);

  if (!parsed.success) return { ok: false as const, message: "Dados de etapa inválidos." };

  if (parsed.data.stage === "lost" && !parsed.data.lossReason?.trim()) return { ok: false as const, message: "Informe o motivo da perda." };

  const context = await requireWorkspaceRole(["owner", "admin", "member"]);
  const db = getDb();
  const closed = parsed.data.stage === "won" || parsed.data.stage === "lost";
  const result = await db.transaction(async (tx) => {

    const [existing] = await tx.select({ id: deals.id, stage: deals.stage, clientId: deals.clientId }).from(deals)
      .where(and(eq(deals.id, parsed.data.dealId), eq(deals.organizationId, context.organization.id), isNull(deals.deletedAt)))
      .for("update").limit(1);

    if (!existing) return { ok: false as const, message: "Oportunidade não encontrada." };

    const [client] = await tx.select({ id: clients.id }).from(clients).where(and(eq(clients.id, existing.clientId), eq(clients.organizationId, context.organization.id), isNull(clients.deletedAt))).for("key share").limit(1);

    if (!client) return { ok: false as const, message: "Não é possível alterar uma oportunidade vinculada a cliente arquivado." };

    const [updated] = await tx.update(deals).set({ stage: parsed.data.stage, lossReason: parsed.data.stage === "lost" ? parsed.data.lossReason?.trim() : null, closedAt: closed ? new Date() : null, updatedAt: new Date() }).where(and(eq(deals.id, existing.id), eq(deals.organizationId, context.organization.id), isNull(deals.deletedAt))).returning({ id: deals.id });

    if (!updated) return { ok: false as const, message: "Oportunidade não encontrada." };

    await tx.insert(auditLogs).values({ organizationId: context.organization.id, actorUserId: context.user.id, action: "stage_change", entityType: "deal", entityId: existing.id, details: JSON.stringify({ from: existing.stage, to: parsed.data.stage, ...(parsed.data.stage === "lost" ? { lossReason: parsed.data.lossReason?.trim() } : {}) }) });

    return { ok: true as const, dealId: existing.id, clientId: existing.clientId };

  });

  if (!result.ok) return result;

  revalidatePath("/deals");
  revalidatePath(`/deals/${result.dealId}`);
  revalidatePath(`/clients/${result.clientId}`);
  revalidatePath("/dashboard");

  return { ok: true as const };
}

export async function reassignDealOwner(input: unknown) {

  const parsed = z.object({ dealId: z.uuid(), newUserId: z.string().min(1).nullable() }).safeParse(input);

  if (!parsed.success) return { ok: false as const, message: "Confira os dados do responsável." };

  const context = await requireWorkspaceRole(["owner"]);
  const db = getDb();
  const result = await db.transaction(async (tx) => {

    const [deal] = await tx.select({ id: deals.id, ownerUserId: deals.ownerUserId })
      .from(deals)
      .where(and(eq(deals.id, parsed.data.dealId), eq(deals.organizationId, context.organization.id), isNull(deals.deletedAt)))
      .for("update").limit(1);

    if (!deal) return { ok: false as const, message: "Oportunidade não encontrada ou não editável." };

    if (deal.ownerUserId === parsed.data.newUserId) return { ok: true as const, changed: false };

    if (parsed.data.newUserId !== null) {

      const [membership] = await tx.select({ userId: member.userId }).from(member)
        .where(and(eq(member.organizationId, context.organization.id), eq(member.userId, parsed.data.newUserId)))
        .for("key share").limit(1);

      if (!membership) return { ok: false as const, message: "Responsável não encontrado neste workspace." };

    }

    const [updated] = await tx.update(deals).set({ ownerUserId: parsed.data.newUserId, updatedAt: new Date() })
      .where(and(eq(deals.id, deal.id), eq(deals.organizationId, context.organization.id), isNull(deals.deletedAt)))
      .returning({ id: deals.id });

    if (!updated) return { ok: false as const, message: "Oportunidade não encontrada ou não editável." };

    await tx.insert(auditLogs).values({
      organizationId: context.organization.id,
      actorUserId: context.user.id,
      action: parsed.data.newUserId === null ? "unassign" : "reassign",
      entityType: "deal",
      entityId: deal.id,
      details: JSON.stringify({ fromUserId: deal.ownerUserId, toUserId: parsed.data.newUserId }),
    });

    return { ok: true as const, changed: true };

  });

  if (!result.ok) return result;

  if (result.changed) {

    revalidatePath("/deals");
    revalidatePath(`/deals/${parsed.data.dealId}`);

  }

  return { ok: true as const, id: parsed.data.dealId };

}
