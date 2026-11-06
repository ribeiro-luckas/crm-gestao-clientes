"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { activities, auditLogs, clients, deals } from "@/db/schema/crm";
import { requireWorkspaceRole } from "@/lib/workspace";

const activitySchema = z.object({
  clientId: z.union([z.uuid(), z.literal("")]).optional(),
  dealId: z.union([z.uuid(), z.literal("")]).optional(),
  type: z.enum(["call", "meeting", "email", "note", "follow_up"]),
  subject: z.string().trim().min(2, "Informe um resumo da atividade.").max(160),
  body: z.string().trim().max(2000).optional(),
  occurredAt: z.iso.datetime().optional(),
}).refine((data) => Boolean(data.clientId || data.dealId), {
  message: "Associe a atividade a um cliente ou oportunidade."
});

export async function createActivity(input: unknown) {
  
  const parsed = activitySchema.safeParse(input);
  
  if (!parsed.success) return {
    
    ok: false as const, message: parsed.error.issues[0]?.message ?? "Confira os campos."

  };
  
  const context = await requireWorkspaceRole(["owner", "admin", "member"]);
  const db = getDb();
  const clientId = parsed.data.clientId || null;
  const dealId = parsed.data.dealId || null;
  
  const result = await db.transaction(async (tx) => {

    let dealClientId: string | null = null;

    if (dealId) {

      const [deal] = await tx.select({
        id: deals.id, clientId: deals.clientId
      }).from(deals)
        .where(and(eq(deals.id, dealId),
        eq(deals.organizationId, context.organization.id),
        isNull(deals.deletedAt))).for("update").limit(1);

      if (!deal) return {

        ok: false as const,
        message: "Oportunidade não encontrada ou arquivada."

      };

      dealClientId = deal.clientId;

      if (clientId && clientId !== deal.clientId) return {

        ok: false as const,
        message: "A oportunidade não pertence ao cliente informado."

      };
    }
    const involvedIds = [...new Set([clientId, dealClientId].filter((value): value is string => Boolean(value)))].sort();

    if (involvedIds.length) {

      const activeClients = await tx.select({ id: clients.id }).from(clients)
        .where(and(eq(clients.organizationId, context.organization.id),
        inArray(clients.id, involvedIds),
        isNull(clients.deletedAt)))
        .orderBy(asc(clients.id)).for("key share");

      if (activeClients.length !== involvedIds.length) return {

        ok: false as const,
        message: "Cliente não encontrado ou arquivado."

      };
    }
    
    const [row] = await tx.insert(activities).values({
      organizationId: context.organization.id,
      type: parsed.data.type,
      subject: parsed.data.subject,
      body: parsed.data.body || null,
      occurredAt: parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : new Date(),
      actorUserId: context.user.id,
      clientId,
      dealId,
    }).returning({ id: activities.id });

    await tx.insert(auditLogs).values({
      organizationId: context.organization.id,
      actorUserId: context.user.id,
      action: "create",
      entityType: "activity",
      entityId: row.id,
      details: JSON.stringify({
        type: parsed.data.type,
        clientId,
        dealId })
      });

    return {
      ok: true as const,
      id: row.id
    };
  });

  if (!result.ok) return result;
  
  if (clientId) revalidatePath(`/clients/${clientId}`);
  
  if (dealId) revalidatePath(`/deals/${dealId}`);
  
  revalidatePath("/activities");
  revalidatePath("/dashboard");
  
  return { ok: true as const, id: result.id };
}
