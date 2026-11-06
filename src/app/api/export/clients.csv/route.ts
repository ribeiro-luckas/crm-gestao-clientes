import { and, eq, ilike, isNull, or } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, clients } from "@/db/schema/crm";
import { csvDocument } from "@/lib/csv";
import { requireApiWorkspaceRole, workspaceApiErrorResponse } from "@/lib/workspace";

export async function GET(request: Request) {
  try {
    const context = await requireApiWorkspaceRole(["owner", "admin"]);
    const params = new URL(request.url).searchParams;
    const q = params.get("q")?.trim().slice(0, 120) ?? "";
    const status = params.get("status") ?? "all";
    const filters = [eq(clients.organizationId, context.organization.id), isNull(clients.deletedAt)];
  
    if (q) filters.push(or(ilike(clients.name, `%${q}%`), ilike(clients.email, `%${q}%`), ilike(clients.phone, `%${q}%`))!);
  
    if (["active", "prospect", "inactive"].includes(status)) filters.push(eq(clients.status, status as "active" | "prospect" | "inactive"));
  
    const db = getDb();
    const rows = await db.select().from(clients).where(and(...filters)).orderBy(clients.name).limit(5000);
  
    await db.insert(auditLogs).values({ organizationId: context.organization.id, actorUserId: context.user.id, action: "export", entityType: "client", entityId: "csv", details: JSON.stringify({ rowCount: rows.length }) });
  
    const content = csvDocument(["Nome", "Tipo", "E-mail", "Telefone", "Status", "Origem", "Criado em"], rows.map((row) => [row.name, row.kind === "company" ? "Empresa" : "Pessoa", row.email, row.phone, row.status, row.source, row.createdAt]));
    return new Response(`\uFEFF${content}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=clientes.csv", "Cache-Control": "private, no-store" } });
  } catch (error) {
    return workspaceApiErrorResponse(error);
  }
}
