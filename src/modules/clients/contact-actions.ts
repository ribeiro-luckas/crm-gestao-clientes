"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { auditLogs, clients, contacts } from "@/db/schema/crm";
import { requireWorkspaceRole } from "@/lib/workspace";

const contactSchema = z.object({
  companyClientId: z.uuid(),
  name: z.string().trim().min(2, "Informe o nome do contato.").max(160),
  title: z.string().trim().max(100).optional(),
  email: z.union([z.email("Informe um e-mail válido.").max(254), z.literal("")]).optional(),
  phone: z.string().trim().max(40).optional(),
});

export async function createContact(input: unknown) {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, message: parsed.error.issues[0]?.message ?? "Confira os campos." };
  
  const context = await requireWorkspaceRole(["owner", "admin", "member"]);
  const db = getDb();
  const companyId = parsed.data.companyClientId;
  const result = await db.transaction(async (tx) => {
    
    const [company] = await tx.select({ id: clients.id }).from(clients).where(and(
      eq(clients.id, companyId), eq(clients.organizationId, context.organization.id), eq(clients.kind, "company"), isNull(clients.deletedAt),
    )).for("key share").limit(1);

    if (!company) return { ok: false as const, message: "Empresa não encontrada ou arquivada." };

    const [row] = await tx.insert(contacts).values({
      organizationId: context.organization.id,
      companyClientId: company.id,
      name: parsed.data.name,
      title: parsed.data.title || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
    }).returning({ id: contacts.id });

    await tx.insert(auditLogs).values({ organizationId: context.organization.id, actorUserId: context.user.id, action: "create", entityType: "contact", entityId: row.id, details: JSON.stringify({ companyClientId: company.id }) });

    return { ok: true as const, id: row.id, clientId: company.id };
  });

  if (!result.ok) return result;

  revalidatePath(`/clients/${result.clientId}`);

  return { ok: true as const, id: result.id };
}
