import { notFound } from "next/navigation";
import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { clients, deals } from "@/db/schema/crm";
import { DealForm } from "@/components/deals/deal-form";
import { PageHeading } from "@/components/ui/page-heading";
import { getWorkspaceContext } from "@/lib/workspace";

export default async function EditDealPage({ params }: { params: Promise<{ id: string }> }) {

  const [{ id }, context] = await Promise.all([params, getWorkspaceContext()]);
  const db = getDb();
  const [[deal], clientRows] = await Promise.all([
    db.select({ id: deals.id, clientId: deals.clientId, title: deals.title, amount: deals.amount, expectedCloseAt: deals.expectedCloseAt })
      .from(deals).where(and(eq(deals.id, id), eq(deals.organizationId, context.organization.id), isNull(deals.deletedAt))).limit(1),
    db.select({ id: clients.id, name: clients.name }).from(clients).where(and(eq(clients.organizationId, context.organization.id), isNull(clients.deletedAt))).orderBy(asc(clients.name)),
  ]);

  if (!deal) notFound();

  return <>
          <PageHeading
           eyebrow="OPORTUNIDADE" 
           title="Editar oportunidade" 
           description="Atualize valor, previsão e cliente relacionado." 
          />
          
          <DealForm clients={clientRows} deal={deal} />
        </>
  
}
