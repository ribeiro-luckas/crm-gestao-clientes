"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, sql, or, ne, countDistinct } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { auditLogs, clients, contacts, deals, tasks } from "@/db/schema/crm";
import { member } from "@/db/schema/auth";
import { requireWorkspaceRole } from "@/lib/workspace";
import { clientSchema } from "./schema";
import { evaluateClientArchivalEligibility } from "./archive-rules";

export type ActionResult = { ok: true; id?: string } | { ok: false; message: string; fields?: Record<string, string> };

export async function createClient(input: unknown): Promise<ActionResult> {
  
  const parsed = clientSchema.safeParse(input);
  
  if (!parsed.success) {
    
    const fields = Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message]));
    
    return { ok: false, message: "Confira os campos destacados.", fields };
  }

  const context = await requireWorkspaceRole(["owner", "admin", "member"]);
  const db = getDb();
  const data = parsed.data;
  const [created] = await db.transaction(async (tx) => {
    
    const [row] = await tx.insert(clients).values({
      organizationId: context.organization.id,
      kind: data.kind,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      status: data.status,
      source: data.source || null,
      notes: data.notes || null,
      ownerUserId: context.user.id,
    }).returning({ id: clients.id });

    await tx.insert(auditLogs).values({
      organizationId: context.organization.id,
      actorUserId: context.user.id,
      action: "create",
      entityType: "client",
      entityId: row.id,
      details: JSON.stringify({ kind: data.kind, status: data.status }),
    });

    return [row];
  });

  revalidatePath("/clients");
  revalidatePath("/dashboard");
  
  return { ok: true, id: created.id };
}

export async function updateClient(id: string, input: unknown): Promise<ActionResult> {
  
  const parsedId = z.uuid().safeParse(id);
  const parsed = clientSchema.safeParse(input);
  
  if (!parsedId.success || !parsed.success) return { ok: false, message: "Confira os dados do cliente." };
  
  const context = await requireWorkspaceRole(["owner", "admin", "member"]);
  const db = getDb();
  const data = parsed.data;
  const result = await db.transaction(async (tx) => {
    
    const [existing] = await tx.select({ id: clients.id, kind: clients.kind })
      .from(clients)
      .where(and(eq(clients.id, id), eq(clients.organizationId, context.organization.id), isNull(clients.deletedAt)))
      .for("update").limit(1);

    if (!existing) return { ok: false as const, message: "Cliente não encontrado." };

    if (existing.kind !== data.kind) return { ok: false as const, message: "O tipo de cliente não pode ser alterado depois do cadastro." };

    const [updated] = await tx.update(clients).set({
      kind: data.kind,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      status: data.status,
      source: data.source || null,
      notes: data.notes || null,
      updatedAt: new Date(),
    }).where(and(eq(clients.id, id), eq(clients.organizationId, context.organization.id), isNull(clients.deletedAt))).returning({ id: clients.id });

    if (!updated) return { ok: false as const, message: "Cliente não encontrado." };

    await tx.insert(auditLogs).values({ organizationId: context.organization.id, actorUserId: context.user.id, action: "update", entityType: "client", entityId: id, details: JSON.stringify({ kind: data.kind, status: data.status }) });

    return { ok: true as const };
  });

  if (!result.ok) return result;
  
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  revalidatePath("/dashboard");
  
  return { ok: true, id };
}

export async function reassignClientOwner(input: unknown): Promise<ActionResult> {

  const parsed = z.object({ clientId: z.uuid(), newUserId: z.string().min(1).nullable() }).safeParse(input);

  if (!parsed.success) return { ok: false, message: "Confira os dados do responsável." };

  const context = await requireWorkspaceRole(["owner"]);
  const db = getDb();
  const result = await db.transaction(async (tx) => {

    const [client] = await tx.select({ id: clients.id, ownerUserId: clients.ownerUserId })
      .from(clients)
      .where(and(eq(clients.id, parsed.data.clientId), eq(clients.organizationId, context.organization.id), isNull(clients.deletedAt)))
      .for("update").limit(1);

    if (!client) return { ok: false as const, message: "Cliente não encontrado ou não editável." };

    if (client.ownerUserId === parsed.data.newUserId) return { ok: true as const, changed: false };

    if (parsed.data.newUserId !== null) {

      const [membership] = await tx.select({ userId: member.userId }).from(member)
        .where(and(eq(member.organizationId, context.organization.id), eq(member.userId, parsed.data.newUserId)))
        .for("key share").limit(1);

      if (!membership) return { ok: false as const, message: "Responsável não encontrado neste workspace." };

    }

    const [updated] = await tx.update(clients).set({ ownerUserId: parsed.data.newUserId, updatedAt: new Date() })
      .where(and(eq(clients.id, client.id), eq(clients.organizationId, context.organization.id), isNull(clients.deletedAt)))
      .returning({ id: clients.id });

    if (!updated) return { ok: false as const, message: "Cliente não encontrado ou não editável." };

    await tx.insert(auditLogs).values({
      organizationId: context.organization.id,
      actorUserId: context.user.id,
      action: parsed.data.newUserId === null ? "unassign" : "reassign",
      entityType: "client",
      entityId: client.id,
      details: JSON.stringify({ fromUserId: client.ownerUserId, toUserId: parsed.data.newUserId }),
    });

    return { ok: true as const, changed: true };
  });

  if (!result.ok) return result;

  if (result.changed) {

    revalidatePath("/clients");
    revalidatePath(`/clients/${parsed.data.clientId}`);

  }

  return { ok: true, id: parsed.data.clientId };
}

export async function archiveClient(id: string): Promise<ActionResult> {

  const context = await requireWorkspaceRole(["owner", "admin"]);
  const parsedId = z.uuid().safeParse(id);

  if (!parsedId.success) return { ok: false, message: "Cliente não encontrado." };

  const db = getDb();
  const result = await db.transaction(async (tx) => {

    const [client] = await tx.select({ id: clients.id, kind: clients.kind })
      .from(clients)
      .where(and(eq(clients.id, parsedId.data), eq(clients.organizationId, context.organization.id), isNull(clients.deletedAt)))
      .for("update").limit(1);

    if (!client) return { ok: false as const, message: "Cliente não encontrado." };

    const [contactCount] = await tx.select({ value: sql<number>`count(*)::int` }).from(contacts).where(and(
      eq(contacts.organizationId, context.organization.id), eq(contacts.companyClientId, client.id), isNull(contacts.deletedAt),
    ));
    const [dealCount] = await tx.select({ value: sql<number>`count(*)::int` }).from(deals).where(and(
      eq(deals.organizationId, context.organization.id), eq(deals.clientId, client.id), isNull(deals.deletedAt), ne(deals.stage, "won"), ne(deals.stage, "lost"),
    ));
    const [taskCount] = await tx.select({ value: countDistinct(tasks.id) }).from(tasks)
      .leftJoin(deals, and(eq(deals.id, tasks.dealId), eq(deals.organizationId, tasks.organizationId)))
      .where(and(eq(tasks.organizationId, context.organization.id), isNull(tasks.deletedAt), ne(tasks.status, "done"), ne(tasks.status, "canceled"), or(
        eq(tasks.clientId, client.id), eq(deals.clientId, client.id),
      )));
    const eligibility = evaluateClientArchivalEligibility({ activeContacts: contactCount.value, openDeals: dealCount.value, pendingTasks: taskCount.value });

    if (!eligibility.canArchive) return { ok: false as const, message: eligibility.reason ?? "Cliente possui dependências ativas." };

    const [archived] = await tx.update(clients).set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(clients.id, client.id), eq(clients.organizationId, context.organization.id), isNull(clients.deletedAt)))
      .returning({ id: clients.id });

    if (!archived) return { ok: false as const, message: "Cliente não encontrado." };

    await tx.insert(auditLogs).values({ organizationId: context.organization.id, actorUserId: context.user.id, action: "archive", entityType: "client", entityId: client.id, details: JSON.stringify({ kind: client.kind }) });

    return { ok: true as const };
  });

  if (!result.ok) return result;

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  revalidatePath("/deals");
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  
  return { ok: true };
}
