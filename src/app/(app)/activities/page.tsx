import Link from "next/link";
import { and, desc, eq, ilike, isNull, or } from "drizzle-orm";
import { ArrowRight, Clock3, Search } from "lucide-react";
import { getDb } from "@/db";
import { activities, clients, deals } from "@/db/schema/crm";
import { PageHeading } from "@/components/ui/page-heading";
import { getWorkspaceContext } from "@/lib/workspace";
import { formatDateTime } from "@/lib/utils";

const activityNames: Record<string, string> = { call: "Ligação", meeting: "Reunião", email: "E-mail", note: "Nota", follow_up: "Acompanhamento" };

export default async function ActivitiesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {

  const [{ q = "" }, context] = await Promise.all([searchParams, getWorkspaceContext()]);
  const conditions = [eq(activities.organizationId, context.organization.id)];

  if (q.trim()) conditions.push(or(ilike(activities.subject, `%${q.trim()}%`), ilike(activities.body, `%${q.trim()}%`), ilike(clients.name, `%${q.trim()}%`), ilike(deals.title, `%${q.trim()}%`))!);

  const rows = await getDb().select({ activity: activities, clientName: clients.name, clientId: clients.id, dealTitle: deals.title, dealId: deals.id })
    .from(activities)
    .leftJoin(clients, and(eq(clients.id, activities.clientId), eq(clients.organizationId, activities.organizationId), isNull(clients.deletedAt)))
    .leftJoin(deals, and(eq(deals.id, activities.dealId), eq(deals.organizationId, activities.organizationId), isNull(deals.deletedAt)))
    .where(and(...conditions)).orderBy(desc(activities.occurredAt)).limit(100);

  return <>
          <PageHeading
           eyebrow="HISTÓRICO COMERCIAL" 
           title="Atividades" 
           description="Ligações, reuniões, e-mails, notas e acompanhamentos registrados pela equipe." 
          />

          <form className="filter-bar" action="/activities">
            <label className="search-field">
              <Search size={15} />
              <span className="visually-hidden">Buscar atividades</span>

              <input
               className="input" 
               type="search" 
               name="q" 
               defaultValue={q} 
               placeholder="Buscar atividade, cliente ou oportunidade" 
              />
            </label>
            
            <button
             className="button button--secondary button--sm" 
             type="submit"
            >
              Pesquisar
            </button>
          </form>

          <section className="panel" aria-label="Histórico de atividades">
            {rows.length 
            ? <div className="activity-list activity-list--page">
                {rows.map(({ activity, clientName, clientId, dealTitle, dealId }) => 
                <article className="activity-item" key={activity.id}>
                  <span
                   className={`activity-marker activity-marker--${activity.type}`} 
                   aria-hidden="true" 
                  />

                  <div>
                    <div className="activity-meta">
                      <strong>{activity.subject}</strong>
                      <time dateTime={activity.occurredAt.toISOString()}>
                        {formatDateTime(activity.occurredAt)}
                      </time>
                    </div>
                    
                    <p>{activity.body || activityNames[activity.type]}</p>
                    
                    <div className="activity-related">
                      <span>
                        {activityNames[activity.type]}
                      </span>
                      
                      {clientId && 
                      <Link href={`/clients/${clientId}`}>
                        {clientName}
                        <ArrowRight size={11} />
                      </Link>}
                      
                      {dealId && 
                      <Link href={`/deals/${dealId}`}>
                        {dealTitle}
                        <ArrowRight size={11} />
                      </Link>}
                    </div>
                  </div>
                </article>)}
              </div> 
            : <div className="empty-state">
                <span className="empty-state-icon">
                  <Clock3 size={18} />
                </span>
                <strong>
                  {q 
                    ? "Nenhuma atividade encontrada" 
                    : "Nenhuma atividade registrada"
                  }
                </strong>
                
                <p>
                  {q 
                    ? "Experimente outros termos de busca." 
                    : "Registre interações nos perfis de clientes e oportunidades para manter um histórico compartilhado."
                  }
                </p>
              </div>
            }
          </section>
        </>
  
}
