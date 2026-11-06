import { notFound } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { clients } from "@/db/schema/crm";
import { ClientForm } from "@/components/clients/client-form";
import { PageHeading } from "@/components/ui/page-heading";
import { getWorkspaceContext } from "@/lib/workspace";

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {

  const [{ id }, context] = await Promise.all([params, getWorkspaceContext()]);
  const [client] = await getDb().select({ id: clients.id, kind: clients.kind, name: clients.name, email: clients.email, phone: clients.phone, status: clients.status, source: clients.source, notes: clients.notes })
    .from(clients)
    .where(and(eq(clients.id, id), eq(clients.organizationId, context.organization.id), isNull(clients.deletedAt)))
    .limit(1);

  if (!client) notFound();

  return <>
          <PageHeading
           eyebrow="CLIENTE" 
           title="Editar cliente" 
           description="Atualize as informações deste relacionamento." 
          />

          <ClientForm client={client} />
        </>
  
}
