import { and, eq, ilike, isNull, or } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, clients, deals } from "@/db/schema/crm";
import { csvDocument } from "@/lib/csv";
import { requireApiWorkspaceRole, workspaceApiErrorResponse } from "@/lib/workspace";

const stages = ["new_lead", "qualification", "proposal", "negotiation", "won", "lost"] as const;

export async function GET(request: Request) {
  try {
    const context = await requireApiWorkspaceRole(["owner", "admin"]);
    const params = new URL(request.url).searchParams;
    const q = params.get("q")?.trim().slice(0, 120) ?? "";
    const stage = params.get("stage") ?? "all";
    const conditions = [eq(deals.organizationId, context.organization.id), isNull(deals.deletedAt), isNull(clients.deletedAt)];

    if (q) conditions.push(or(ilike(deals.title, `%${q}%`), ilike(clients.name, `%${q}%`))!);

    if (stages.includes(stage as typeof stages[number])) conditions.push(eq(deals.stage, stage as typeof stages[number]));

    const rows = await getDb().select({ deal: deals, clientName: clients.name }).from(deals).innerJoin(clients, and(eq(clients.id, deals.clientId), eq(clients.organizationId, deals.organizationId))).where(and(...conditions)).orderBy(deals.createdAt).limit(5000);

    const db = getDb();

    await db.insert(auditLogs).values({ organizationId: context.organization.id, actorUserId: context.user.id, action: "export", entityType: "deal", entityId: "csv", details: JSON.stringify({ rowCount: rows.length }) });

    const content = csvDocument(["Oportunidade", "Cliente", "Etapa", "Valor", "Moeda", "Previsão de fechamento", "Criado em"], rows.map(({ deal, clientName }) => [deal.title, clientName, deal.stage, deal.amount, deal.currency, deal.expectedCloseAt, deal.createdAt]));

    return new Response(`\uFEFF${content}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=oportunidades.csv", "Cache-Control": "private, no-store" } });
  } catch (error) {
    return workspaceApiErrorResponse(error);
  }
}
