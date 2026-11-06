import Link from "next/link";
import { and, asc, eq, ilike, isNull, or } from "drizzle-orm";
import { Download, Plus, Search } from "lucide-react";
import { getDb } from "@/db";
import { clients, deals } from "@/db/schema/crm";
import { StageControl } from "@/components/deals/stage-control";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getWorkspaceContext } from "@/lib/workspace";

const stages = [{ value: "new_lead", label: "Novo lead" }, { value: "qualification", label: "Qualificação" }, { value: "proposal", label: "Proposta" }, { value: "negotiation", label: "Negociação" }, { value: "won", label: "Ganho" }, { value: "lost", label: "Perdido" }] as const;

export default async function DealsPage({ searchParams }: { searchParams: Promise<{ q?: string; stage?: string }> }) {
  const [{ q = "", stage = "all" }, context] = await Promise.all([searchParams, getWorkspaceContext()]);
  const conditions = [eq(deals.organizationId, context.organization.id), isNull(deals.deletedAt)];
  if (q.trim()) conditions.push(or(ilike(deals.title, `%${q.trim()}%`), ilike(clients.name, `%${q.trim()}%`))!);
  if (stages.some((item) => item.value === stage)) conditions.push(eq(deals.stage, stage as typeof stages[number]["value"]));
  const rows = await getDb().select({ id: deals.id, title: deals.title, stage: deals.stage, amount: deals.amount, expectedCloseAt: deals.expectedCloseAt, clientId: clients.id, clientName: clients.name })
    .from(deals).innerJoin(clients, and(eq(clients.id, deals.clientId), eq(clients.organizationId, deals.organizationId)))
    .where(and(...conditions, isNull(clients.deletedAt))).orderBy(asc(deals.expectedCloseAt));
  const total = rows.length;
  const totalValue = rows.filter((deal) => !["won", "lost"].includes(deal.stage)).reduce((sum, deal) => sum + Number(deal.amount), 0);

  return <>
          <PageHeading
           eyebrow="PIPELINE COMERCIAL" 
           title="Oportunidades" 
           description="Acompanhe as negociações e mantenha o próximo passo visível." 
           action={
            <>
              {(context.role === "owner" || context.role === "admin") && 
              <a
               className="button button--secondary" 
               href={`/api/export/deals.csv?q=${encodeURIComponent(q)}&stage=${stage}`}
              >
                <Download size={15} /> Exportar CSV
              </a>}
              
              <Link
               className="button button--primary" 
               href="/deals/new"
              >
                <Plus size={16} /> Nova oportunidade
              </Link>
            </>
           } 
          />

          <div className="deal-summary-bar">
            <span>
              <strong>{total}</strong> 
              {total === 1 ? "oportunidade" : "oportunidades"} encontradas
            </span>
            
            <span>
              Pipeline aberto <strong>{formatCurrency(totalValue)}</strong>
            </span>
          </div>

          <form className="filter-bar" action="/deals">
            <label className="search-field">
              <Search size={15} />

              <span className="visually-hidden">Buscar oportunidades</span>

              <input
               className="input" 
               type="search" 
               name="q" 
               defaultValue={q} 
               placeholder="Buscar por negociação ou cliente" 
              />
            </label>
            
            <select
             className="input select filter-select" 
             name="stage" 
             defaultValue={stage} 
             aria-label="Filtrar por etapa"
            >
              <option value="all">Todas as etapas</option>

              {stages.map((item) => 
                <option value={item.value} key={item.value}>
                  {item.label}
                </option>
              )}
            </select>
            
            <Button variant="secondary" size="sm" type="submit">
              Filtrar
            </Button>
          </form>

          <section
           className="board-scroll" 
           aria-label="Funil de oportunidades por etapa" 
           tabIndex={0}
          >
            <div className="kanban">
              {stages.map((item) => 
                { const cards = rows.filter((deal) => 
                deal.stage === item.value); 
                
                return (
                        <section
                         className={`kanban-column kanban-column--${item.value}`} 
                         key={item.value} 
                         aria-labelledby={`stage-${item.value}`}
                        >
                          <div className="kanban-column-head">
                            <h2 id={`stage-${item.value}`}>{item.label}</h2>
                            <span>{cards.length}</span>
                          </div>
                          
                          <div className="kanban-cards">
                            {cards.map((deal) => 
                            <article className="kanban-card" key={deal.id}>
                              <Link href={`/deals/${deal.id}`}>
                                <h3>{deal.title}</h3>
                                <p>{deal.clientName}</p>
                              </Link>
                              
                              <footer>
                                <strong>{formatCurrency(deal.amount)}</strong>
                                <span>
                                  {deal.expectedCloseAt 
                                  ? formatDate(deal.expectedCloseAt, 
                                    { dateStyle: "short", timeZone: "UTC" }) 
                                  : "Sem data"}
                                </span>
                              </footer>
                              
                              <StageControl
                               dealId={deal.id} 
                               currentStage={deal.stage} 
                              />
                            </article>)}
                          </div>
                        </section>
                      );
              })}
            </div>
          </section>
        </>
}
