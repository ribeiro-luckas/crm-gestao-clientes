import Link from "next/link";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import { getDb } from "@/db";
import { clients, deals } from "@/db/schema/crm";
import { TaskForm } from "@/components/tasks/task-form";
import { PageHeading } from "@/components/ui/page-heading";
import { getWorkspaceContext } from "@/lib/workspace";

export default async function NewTaskPage() {

  const context = await getWorkspaceContext();
  const db = getDb();
  const [clientRows, dealRows] = await Promise.all([
    db.select({ id: clients.id, name: clients.name }).from(clients).where(and(eq(clients.organizationId, context.organization.id), isNull(clients.deletedAt))).orderBy(asc(clients.name)),
    db.select({ id: deals.id, title: deals.title, clientId: deals.clientId }).from(deals).where(and(eq(deals.organizationId, context.organization.id), inArray(deals.stage, ["new_lead", "qualification", "proposal", "negotiation"]), isNull(deals.deletedAt))).orderBy(asc(deals.title)),
  ]);

  return <>
          <Link className="back-link" href="/tasks">
            <ChevronLeft size={15} /> Voltar para tarefas
          </Link>
          
          <PageHeading 
            eyebrow="PRÓXIMO PASSO" 
            title="Criar tarefa" 
            description="Defina o que precisa acontecer e quando." />
            
          <TaskForm clients={clientRows} deals={dealRows} />
        </>
  
}
