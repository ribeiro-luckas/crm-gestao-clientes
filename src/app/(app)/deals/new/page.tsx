import Link from "next/link";
import { and, asc, eq, isNull } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import { getDb } from "@/db";
import { clients } from "@/db/schema/crm";
import { DealForm } from "@/components/deals/deal-form";
import { PageHeading } from "@/components/ui/page-heading";
import { getWorkspaceContext } from "@/lib/workspace";

export default async function NewDealPage({ searchParams }: { searchParams: Promise<{ clientId?: string }> }) {

  const [{ clientId }, context] = await Promise.all([searchParams, getWorkspaceContext()]);
  const clientRows = await getDb().select({ id: clients.id, name: clients.name }).from(clients).where(and(eq(clients.organizationId, context.organization.id), isNull(clients.deletedAt))).orderBy(asc(clients.name));

  return <>
          <Link className="back-link" href="/deals">
            <ChevronLeft size={15} /> Voltar para oportunidades
          </Link>

          <PageHeading
           eyebrow="NOVA NEGOCIAÇÃO" 
           title="Criar oportunidade" 
           description="Registre uma negociação para acompanhar cada avanço." 
          />
          
          <DealForm clients={clientRows} initialClientId={clientId} />
        </>;
  
}
