import Link from "next/link";
import { and, count, desc, eq, gte, gt, inArray, isNull, lt, ne, sql } from "drizzle-orm";
import { ArrowRight, ArrowUpRight, BriefcaseBusiness, CalendarDays, CheckCircle2, CircleDollarSign, Clock3, Handshake, Plus, UsersRound } from "lucide-react";
import { getDb } from "@/db";
import { activities, clients, deals, tasks } from "@/db/schema/crm";
import { PageHeading } from "@/components/ui/page-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { getWorkspaceContext } from "@/lib/workspace";

const openStages = ["new_lead", "qualification", "proposal", "negotiation"] as const;
const stageLabels: Record<string, string> = { new_lead: "Novo lead", qualification: "Qualificação", proposal: "Proposta", negotiation: "Negociação" };

export default async function DashboardPage() {

  const context = await getWorkspaceContext();
  const db = getDb();
  const now = new Date();
  const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const tenant = eq(clients.organizationId, context.organization.id);
  const [activeClientRows, leadRows, pipelineRows, stageRows, wonRows, lostRows, overdueRows, recentDeals, upcomingTasks, upcomingMeetings] = await Promise.all([
    db.select({ total: count() }).from(clients).where(and(tenant, eq(clients.status, "active"), isNull(clients.deletedAt))),
    db.select({ total: count() }).from(deals).where(and(eq(deals.organizationId, context.organization.id), eq(deals.stage, "new_lead"), isNull(deals.deletedAt))),
    db.select({ total: count(), value: sql<string>`coalesce(sum(${deals.amount}), 0)` }).from(deals).where(and(eq(deals.organizationId, context.organization.id), inArray(deals.stage, [...openStages]), isNull(deals.deletedAt))),
    db.select({ stage: deals.stage, total: count(), value: sql<string>`coalesce(sum(${deals.amount}), 0)` }).from(deals).where(and(eq(deals.organizationId, context.organization.id), inArray(deals.stage, [...openStages]), isNull(deals.deletedAt))).groupBy(deals.stage),
    db.select({ total: count() }).from(deals).where(and(eq(deals.organizationId, context.organization.id), eq(deals.stage, "won"), gte(deals.closedAt, periodStart), isNull(deals.deletedAt))),
    db.select({ total: count() }).from(deals).where(and(eq(deals.organizationId, context.organization.id), eq(deals.stage, "lost"), gte(deals.closedAt, periodStart), isNull(deals.deletedAt))),
    db.select({ total: count() }).from(tasks).where(and(eq(tasks.organizationId, context.organization.id), lt(tasks.dueAt, now), ne(tasks.status, "done"), ne(tasks.status, "canceled"), isNull(tasks.deletedAt))),
    db.select({ id: deals.id, title: deals.title, amount: deals.amount, stage: deals.stage, expectedCloseAt: deals.expectedCloseAt, clientName: clients.name }).from(deals).innerJoin(clients, and(eq(clients.id, deals.clientId), eq(clients.organizationId, deals.organizationId))).where(and(eq(deals.organizationId, context.organization.id), inArray(deals.stage, [...openStages]), isNull(deals.deletedAt), isNull(clients.deletedAt))).orderBy(desc(deals.updatedAt)).limit(4),
    db.select({ id: tasks.id, title: tasks.title, dueAt: tasks.dueAt, priority: tasks.priority }).from(tasks).where(and(eq(tasks.organizationId, context.organization.id), gt(tasks.dueAt, now), inArray(tasks.status, ["todo", "in_progress"]), isNull(tasks.deletedAt))).orderBy(tasks.dueAt).limit(4),
    db.select({ id: activities.id, subject: activities.subject, occurredAt: activities.occurredAt }).from(activities).where(and(eq(activities.organizationId, context.organization.id), eq(activities.type, "meeting"), gt(activities.occurredAt, now))).orderBy(activities.occurredAt).limit(3),
  ]);

  const activeClients = Number(activeClientRows[0]?.total ?? 0);
  const leadCount = Number(leadRows[0]?.total ?? 0);
  const pipelineCount = Number(pipelineRows[0]?.total ?? 0);
  const pipelineValue = pipelineRows[0]?.value ?? "0";
  const wonCount = Number(wonRows[0]?.total ?? 0);
  const lostCount = Number(lostRows[0]?.total ?? 0);
  const conversionTotal = wonCount + lostCount;
  const conversion = conversionTotal ? Math.round(wonCount / conversionTotal * 100) : 0;
  const overdueCount = Number(overdueRows[0]?.total ?? 0);
  const stageMap = new Map(stageRows.map((row) => [row.stage, row]));
  const largestStageValue = Math.max(...stageRows.map((row) => Number(row.value)), 1);

  return <>
          <PageHeading
           eyebrow="PAINEL COMERCIAL" 
           title="Visão geral" 
           description="Um retrato do que está acontecendo com seus relacionamentos." 
           action={
            <Link className="button button--primary" href="/deals/new">
              <Plus size={16} /> Nova oportunidade
            </Link>
           } 
          />

          <section className="dashboard-intro">
            <div className="dashboard-intro-copy">
              <span className="intro-symbol" aria-hidden="true">✳</span>
              <div>
                <h2>Bom noite, {context.user.name.split(" ")[0]}.</h2>
                <p>Veja o que está avançando e escolha o próximo passo.</p>
              </div>
            </div>
            <span className="dashboard-date">
              <CalendarDays size={14} />
              {formatDate(now, { dateStyle: "long" })}
            </span>
          </section>

          <section className="metric-grid" aria-label="Indicadores comerciais">

            <Metric
             title="Clientes ativos" 
             value={activeClients.toLocaleString("pt-BR")} 
             hint="Na carteira atual" 
             icon={
              <UsersRound size={15} />
             } 
            />

            <Metric
             title="Leads" 
             value={leadCount.toLocaleString("pt-BR")} 
             hint="Aguardando qualificação" 
             icon={
              <ArrowUpRight size={15} />
             } 
             tone="amber" 
            />

            <Metric
             title="Oportunidades abertas" 
             value={pipelineCount.toLocaleString("pt-BR")} 
             hint="Em todas as etapas do funil" 
             icon={
              <BriefcaseBusiness size={15} />
             } 
            />

            <Metric
             title="Valor do pipeline" 
             value={formatCurrency(pipelineValue)} 
             hint="Valor bruto em aberto" 
             icon={
              <CircleDollarSign size={15} />
             } 
             tone="green" 
            />

          </section>

          <div className="dashboard-grid">
            <div className="dashboard-main-column">
              <section className="panel" aria-labelledby="pipeline-title">
                <div className="panel-heading">
                  <div>
                    <h2 id="pipeline-title">Funil de vendas</h2>
                    <p>Valor e volume nas etapas abertas</p>
                  </div>
                  <Link
                   href="/deals" 
                   className="subtle-link"
                  >
                    Ver oportunidades <ArrowRight size={13} />
                  </Link>
                </div>
                <div className="pipeline-body">
                  <div className="pipeline-total">
                    <strong>{formatCurrency(pipelineValue)}</strong>
                    <span>{pipelineCount} oportunidades abertas</span>
                  </div>
                  
                  <div className="pipeline-stages">
                    {openStages.map((stage) => 
                    { const row = stageMap.get(stage); 
                      const width = row 
                      ? Math.max(3, Number(row.value) / largestStageValue * 100) 
                      : 0;
                      
                      return (
                        <div className="pipeline-stage" key={stage}>
                          <span>{stageLabels[stage]}</span>

                          <svg
                           className="stage-track" 
                           role="img" 
                           aria-label={`${stageLabels[stage]}: ${formatCurrency(row?.value ?? "0")}`} 
                           viewBox="0 0 100 8" 
                           preserveAspectRatio="none"
                          >
                            <rect
                             className="stage-fill" 
                             x="0" 
                             y="0" 
                             width={width} 
                             height="8" 
                             rx="4" 
                            />
                          </svg>

                          <strong>
                            {formatCurrency(row?.value ?? "0")}
                          </strong>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="panel-footer">
                  <span>Valores não ponderados</span>
                  <span>Atualizado agora</span>
                </div>
              </section>

              <section className="panel" aria-labelledby="deals-title">
                <div className="panel-heading">
                  <div>
                    <h2 id="deals-title">Negociações recentes</h2>
                    <p>Oportunidades atualizadas recentemente</p>
                  </div>

                  <Link
                   href="/deals" 
                   className="subtle-link"
                  >
                    Ver todas <ArrowRight size={13} />
                  </Link>
                </div>
                {
                recentDeals.length 
                ? <div className="deal-list">
                    {recentDeals.map((deal) => 
                    <Link
                    href={`/deals/${deal.id}`} 
                    className="deal-row" 
                    key={deal.id}
                    >
                      <span className="deal-primary">
                        <strong>{deal.title}</strong>
                        <small>
                          {deal.clientName}{deal.expectedCloseAt 
                          ? ` · previsão ${formatDate(deal.expectedCloseAt, 
                            { dateStyle: "medium", timeZone: "UTC" })}` 
                          : ""}
                        </small>
                      </span>

                      <StatusBadge value={deal.stage} />

                      <strong className="deal-value">
                        {formatCurrency(deal.amount)}
                      </strong>
                    </Link>)}
                  </div> 
                : <div className="empty-state">
                    <span className="empty-state-icon">
                      <Handshake size={17} />
                    </span>

                    <strong>Nenhuma oportunidade em aberto</strong>

                    <p>
                      Crie uma oportunidade para acompanhar o próximo negócio.
                    </p>

                    <Link
                     href="/deals/new" 
                     className="subtle-link"
                    >
                      Adicionar oportunidade <ArrowRight size={13} />
                    </Link>
                  </div>
                }
              </section>
            </div>

            <div className="dashboard-side-column">
              <section
               className="panel conversion-card" 
               aria-labelledby="conversion-title"
              >
                <div className="conversion-head">
                  <span id="conversion-title">Taxa de conversão</span>
                  <span>30 dias</span>
                </div>

                <div className="conversion-value">
                  <strong>{conversion}%</strong>

                  <span>
                    {wonCount} ganhos de {conversionTotal} encerrados
                  </span>
                </div>
                
                <svg
                 className="conversion-bar" 
                 role="img" 
                 aria-label={`${conversion}% de conversão`} 
                 viewBox="0 0 100 6" 
                 preserveAspectRatio="none"
                >
                  <rect
                   className="conversion-fill" 
                   x="0" 
                   y="0" 
                   width={conversion} 
                   height="6" 
                   rx="3" 
                  />
                </svg>
                <p className="conversion-caption">
                  Calculada sobre oportunidades marcadas como ganhas ou perdidas.
                </p>
              </section>

              <section className="panel" aria-labelledby="tasks-title">
                <div className="panel-heading">
                  <div>
                    <h2 id="tasks-title">Tarefas em atraso</h2>
                    <p>
                      {overdueCount 
                      ? "Acompanhe os próximos passos pendentes" 
                      : "Tudo em dia por aqui"}
                    </p>
                  </div>

                  <span
                   className={
                    `metric-icon ${overdueCount 
                    ? "metric-icon--amber" 
                    : "metric-icon--green"}`
                   }
                  >
                    {overdueCount 
                      ? <Clock3 size={15} /> 
                      : <CheckCircle2 size={15} />
                    }
                  </span>
                </div>

                {overdueCount 
                ? <div className="overdue-summary">
                    <strong>{overdueCount}</strong>
                    <span>
                      {overdueCount === 1 
                      ? "tarefa precisa" 
                      : "tarefas precisam"} de atenção
                    </span>
                    
                    <Link
                     href="/tasks?filter=overdue" 
                     className="subtle-link"
                    >
                      Ver tarefas <ArrowRight size={13} />
                    </Link>
                  </div> 
                : <div className="empty-state compact">
                    <strong>Nenhuma tarefa atrasada</strong>
                    <p>Continue acompanhando suas prioridades.</p>
                  </div>
                }
              </section>

              <section className="panel" aria-labelledby="upcoming-title">
                <div className="panel-heading">
                  <div>
                    <h2 id="upcoming-title">Próximos compromissos</h2>
                    <p>Tarefas e reuniões na agenda</p>
                  </div>
                  
                  <Link
                   href="/tasks" 
                   className="subtle-link" 
                   aria-label="Ver todas as tarefas"
                  >
                    <ArrowRight size={14} />
                  </Link>
                </div>

                {upcomingTasks.length || upcomingMeetings.length 
                ? <div className="task-list">
                    {[...upcomingMeetings.map((item) => ({ 
                        id: item.id, 
                        title: item.subject, 
                        dueAt: item.occurredAt, 
                        kind: "Reunião" 
                      })), ...upcomingTasks.map((item) => ({ 
                        id: item.id, 
                        title: item.title, 
                        dueAt: item.dueAt, 
                        kind: "Tarefa" 
                      }))].sort((a, b) => 
                      a.dueAt.getTime() - b.dueAt.getTime()).slice(0, 5).map((item) => 
                      <div className="task-row" key={`${item.kind}-${item.id}`}>
                        <span className="task-dot" aria-hidden="true" />
                        <span>
                          <strong>{item.title}</strong>
                          <small>{item.kind}</small>
                        </span>
                        <time className="task-due" dateTime={item.dueAt.toISOString()}>
                          {formatDateTime(item.dueAt)}
                        </time>
                      </div>
                    )}
                  </div> 
                : <div className="empty-state compact">
                      <span className="empty-state-icon">
                        <CalendarDays size={16} />
                      </span>
                    <strong>Agenda livre</strong>
                    <p>Os próximos compromissos aparecem aqui.</p>
                  </div>
                }
              </section>
            </div>
          </div>
        </>

}

function Metric({ 
  title, 
  value, 
  hint, 
  icon, 
  tone 
}: { 
  title: string; 
  value: string; 
  hint: string; 
  icon: React.ReactNode; 
  tone?: "green" | "amber" 
}) {

  return <>
          <article className="metric-card">
            <div className="metric-top">
              <span>{title}</span>
              <span
               className={`metric-icon${tone === "green" 
                ? " metric-icon--green" 
                : tone === "amber" 
                ? " metric-icon--amber" 
                : ""}`
               }
              >
                {icon}
              </span>
            </div>
            
            <p className="metric-value">{value}</p>
            
            <div className="metric-foot">
              <span>{hint}</span>
            </div>
          </article>
        </>
}
