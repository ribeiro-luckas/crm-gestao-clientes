import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, isNull } from "drizzle-orm";
import { ArrowLeft, Building2, CalendarDays, CircleDollarSign, Pencil, UserRound } from "lucide-react";
import { getDb } from "@/db";
import { activities, clients, deals } from "@/db/schema/crm";
import { ActivityForm } from "@/components/activities/activity-form";
import { PageHeading } from "@/components/ui/page-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { StageControl } from "@/components/deals/stage-control";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { getWorkspaceContext } from "@/lib/workspace";

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, context] = await Promise.all([params, getWorkspaceContext()]);
  const db = getDb();
  const [row] = await db.select({ deal: deals, client: clients }).from(deals).innerJoin(clients, and(eq(clients.id, deals.clientId), eq(clients.organizationId, deals.organizationId))).where(and(eq(deals.id, id), eq(deals.organizationId, context.organization.id), isNull(deals.deletedAt), isNull(clients.deletedAt))).limit(1);
  if (!row) notFound();
  const activityRows = await db.select().from(activities).where(and(eq(activities.organizationId, context.organization.id), eq(activities.dealId, row.deal.id))).orderBy(desc(activities.occurredAt)).limit(15);
  const stageLabel = { new_lead: "Novo lead", qualification: "Qualificação", proposal: "Proposta", negotiation: "Negociação", won: "Ganho", lost: "Perdido" }[row.deal.stage];

  return <>
          <Link className="back-link" href="/deals">
            <ArrowLeft size={15} /> Todas as oportunidades
          </Link>

          <PageHeading
           eyebrow="OPORTUNIDADE COMERCIAL" 
           title={row.deal.title} 
           description={`Relacionada a ${row.client.name}.`} 
           action={
            <> 
              <Link
               className="button button--secondary button--sm" 
               href={`/deals/${row.deal.id}/edit`}
              >
                <Pencil size={14} /> Editar
              </Link>
              
              <StatusBadge value={row.deal.stage} />
            </>
           } 
          />
          
          <div className="detail-grid">
            <div className="dashboard-main-column">
              <section className="panel profile-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Resumo da negociação</h2>
                    <p>Etapa atual: {stageLabel}</p>
                  </div>
                  
                  <StatusBadge value={row.deal.stage} />
                </div>
                
                <div className="deal-facts">
                  <div>
                    <CircleDollarSign size={17} />
                    <span>
                      <small>Valor estimado</small>
                      <strong>{formatCurrency(row.deal.amount)}</strong>
                    </span>
                  </div>
                
                  <div>
                    <CalendarDays size={17} />
                    <span>
                      <small>Fechamento previsto</small>
                      <strong>{row.deal.expectedCloseAt 
                        ? formatDate(row.deal.expectedCloseAt, 
                          { dateStyle: "long", timeZone: "UTC" }) 
                        : "Não definido"}
                      </strong>
                    </span>
                  </div>
                  
                  <Link href={`/clients/${row.client.id}`}>
                    <Building2 size={17} />
                    <span>
                      <small>Cliente</small>
                      <strong>{row.client.name}</strong>
                    </span>
                  </Link>

                  <div>
                    <UserRound size={17} />
                    <span>
                      <small>Responsável</small>
                      <strong>
                        {row.deal.ownerUserId === context.user.id 
                        ? "Você" 
                        : "Equipe"}
                      </strong>
                    </span>
                  </div>
                </div>
                
                {row.deal.stage === "lost" && 
                row.deal.lossReason && 
                <div className="loss-reason">
                  <strong>Motivo da perda</strong>
                  <p>{row.deal.lossReason}</p>
                </div>}
              </section>

              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Atualizar etapa</h2>
                    <p>
                      Movimentar o negócio registra uma entrada no histórico de auditoria.
                    </p>
                  </div>
                </div>
                
                <div className="panel-padding">
                  <StageControl
                   dealId={row.deal.id} 
                   currentStage={row.deal.stage} 
                  />
                </div>
              </section>

              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Histórico da oportunidade</h2>
                    <p>Atividades relacionadas à negociação</p>
                  </div>
                </div>{activityRows.length 
                ? <div className="activity-list">
                    {activityRows.map((activity) => 
                    <article className="activity-item" key={activity.id}>
                      <span
                       className={`activity-marker activity-marker--${activity.type}`} 
                      />

                      <div>
                        <div className="activity-meta">
                          <strong>{activity.subject}</strong>

                          <time
                           dateTime={activity.occurredAt.toISOString()}
                          >
                            {formatDateTime(activity.occurredAt)}
                          </time>
                        </div>

                        <p>
                          {activity.body || `Registro de ${activity.type}.`}
                        </p>
                      </div>
                    </article>)}
                  </div> 
                : <div className="empty-state compact">
                      <strong>Nenhuma atividade registrada</strong>
                      <p>
                        Adicione notas e acompanhamentos para manter o contexto da negociação.
                      </p>
                    </div>}
                </section>
            </div>

            <div className="dashboard-side-column">
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Registrar atividade</h2>
                    <p>Registre uma conversa desta oportunidade</p>
                  </div>
                </div>
                
                <div className="panel-padding">
                  <ActivityForm
                   dealId={row.deal.id} 
                   clientId={row.client.id} 
                  />
                </div>
              </section>
            </div>
          </div>
        </>
}
