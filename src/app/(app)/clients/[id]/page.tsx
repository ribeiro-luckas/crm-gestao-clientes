import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, isNull } from "drizzle-orm";
import { ArrowLeft, Building2, CalendarClock, Mail, MapPin, Pencil, Phone, Plus, Tag, UserRound } from "lucide-react";
import { getDb } from "@/db";
import { activities, contacts, deals, clients } from "@/db/schema/crm";
import { PageHeading } from "@/components/ui/page-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { getWorkspaceContext } from "@/lib/workspace";
import { ContactForm } from "@/components/clients/contact-form";
import { ActivityForm } from "@/components/activities/activity-form";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, context] = await Promise.all([params, getWorkspaceContext()]);
  const db = getDb();
  const where = and(eq(clients.id, id), eq(clients.organizationId, context.organization.id), isNull(clients.deletedAt));
  const [client] = await db.select().from(clients).where(where).limit(1);
  if (!client) notFound();
  const [contactRows, dealRows, activityRows] = await Promise.all([
    db.select().from(contacts).where(and(eq(contacts.organizationId, context.organization.id), eq(contacts.companyClientId, client.id), isNull(contacts.deletedAt))).orderBy(contacts.name),
    db.select().from(deals).where(and(eq(deals.organizationId, context.organization.id), eq(deals.clientId, client.id), isNull(deals.deletedAt))).orderBy(desc(deals.updatedAt)).limit(8),
    db.select().from(activities).where(and(eq(activities.organizationId, context.organization.id), eq(activities.clientId, client.id))).orderBy(desc(activities.occurredAt)).limit(12),
  ]);

  return <>
          <Link className="back-link" href="/clients">
            <ArrowLeft size={15} /> Todos os clientes
          </Link>

          <PageHeading
           eyebrow={client.kind === "company" ? "EMPRESA" : "PESSOA"} 
           title={client.name} 
           description="Perfil e histórico do relacionamento." 
           action={
            <>
              <Link
               className="button button--secondary button--sm" 
               href={`/clients/${client.id}/edit`}
              >
                <Pencil size={14} /> Editar
              </Link>
              
              <StatusBadge value={client.status} />
            </>
           } 
          />

          <div className="detail-grid">
            <div className="dashboard-main-column">
              <section className="panel profile-panel">
                <div className="profile-top">
                  <span className="profile-symbol">
                    {client.kind === "company" 
                      ? <Building2 size={21} /> 
                      : <UserRound size={21} />
                    }
                  </span>
                  
                  <div>
                    <span className="eyebrow">
                      {client.kind === "company" 
                      ? "EMPRESA" 
                      : "PESSOA"}
                    </span>
                    <h2>{client.name}</h2>
                  </div>
                </div>

                <div className="profile-facts">
                  {client.email && 
                  <a href={`mailto:${client.email}`}>
                    <Mail size={14} />{client.email}
                  </a>}

                  {client.phone && 
                  <a href={`tel:${client.phone}`}>
                    <Phone size={14} />{client.phone}
                  </a>}

                  {client.source && 
                  <span>
                    <MapPin size={14} />Origem: {client.source}
                  </span>}
                  
                  <span>
                    <CalendarClock size={14} />Criado em {formatDateTime(client.createdAt)}
                  </span>
                </div>

                {client.notes && 
                <div className="profile-notes">
                  <h3>Observações</h3>
                  <p>{client.notes}</p>
                </div>}
              </section>

              {client.kind === "company" && 
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Contatos</h2>
                    <p>Pessoas relacionadas a esta empresa</p>
                  </div>
                </div>

                {contactRows.length 
                ? <div className="contact-list">
                    {contactRows.map((contact) => 
                    <div className="contact-row" key={contact.id}>
                      <span className="contact-avatar">
                        {contact.name.slice(0, 1).toUpperCase()}
                      </span>
                      
                      <div>
                        <strong>{contact.name}</strong>
                        <small>
                          {contact.title ?? "Contato"}
                          {contact.email ? ` · ${contact.email}` : ""}
                        </small>
                      </div>
                      
                      {contact.phone && 
                      <a href={`tel:${contact.phone}`} className="contact-phone">
                        <Phone size={13} />
                        {contact.phone}
                      </a>}
                    </div>)}
                  </div> 
                : <div className="empty-state compact">
                    <span className="empty-state-icon">
                      <UserRound size={17} />
                    </span>
                    <strong>Nenhum contato cadastrado</strong>
                    <p>
                      Adicione as pessoas com quem sua equipe conversa nesta empresa.
                    </p>
                  </div>
                }

                <details className="inline-create">
                  <summary><Plus size={14} /> Adicionar contato</summary>
                  <ContactForm companyClientId={client.id} />
                </details>
              </section>}

              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Oportunidades</h2>
                    <p>Negociações vinculadas ao cliente</p>
                  </div>
                  
                  <Link
                   className="subtle-link" 
                   href={`/deals/new?clientId=${client.id}`}
                  >
                    <Plus size={14} /> Nova oportunidade
                  </Link>
                </div>

                {dealRows.length 
                ? <div className="deal-list">
                    {dealRows.map((deal) => 
                      <Link
                      href={`/deals/${deal.id}`} 
                      className="deal-row" 
                      key={deal.id}
                      >
                        <span className="deal-primary">
                          <strong>{deal.title}</strong>
                          <small>{deal.expectedCloseAt 
                          ? `Previsão ${deal.expectedCloseAt}` 
                          : "Sem previsão"}
                          </small>
                        </span>
                        
                        <StatusBadge value={deal.stage} />
                        
                        <strong className="deal-value">
                          {formatCurrency(deal.amount)}
                        </strong>
                      </Link>
                    )}
                  </div> 
                : <div className="empty-state compact">
                      <span className="empty-state-icon">
                        <Tag size={17} />
                      </span>
                      
                      <strong>Sem oportunidades por enquanto</strong>
                      <p>
                        Registre a primeira negociação para acompanhar o avanço comercial.
                      </p>
                    </div>
                }
              </section>
            </div>

            <div className="dashboard-side-column">
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Registrar atividade</h2>
                    <p>Atualize o histórico deste relacionamento</p>
                  </div>
                </div>
                
                <div className="panel-padding">
                  <ActivityForm clientId={client.id} />
                </div>
              </section>

              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Histórico recente</h2>
                    <p>Conversas e acompanhamentos</p>
                  </div>
                </div>

                {activityRows.length 
                ? <div className="activity-list">
                    {activityRows.map((activity) => 
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
                        
                        <p>
                          {activity.body || `Registro de ${activity.type === "call" 
                            ? "ligação" 
                            : activity.type === "meeting" 
                            ? "reunião" 
                            : activity.type === "email" 
                            ? "e-mail" 
                            : activity.type === "note" 
                            ? "nota" 
                            : "acompanhamento"}.`
                          }
                        </p>
                      </div>
                    </article>)}
                  </div> 
                : <div className="empty-state compact">
                    <span className="empty-state-icon">
                      <CalendarClock size={17} />
                    </span>
                    <strong>O histórico está vazio</strong>
                    <p>
                      As atividades registradas aparecerão nesta linha do tempo.
                    </p>
                  </div>
                }
              </section>
            </div>
          </div>
        </>
}
