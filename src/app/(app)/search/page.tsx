import Link from "next/link";
import { and, eq, ilike, isNull, or } from "drizzle-orm";
import { ArrowRight, BriefcaseBusiness, Search as SearchIcon, UsersRound } from "lucide-react";
import { getDb } from "@/db";
import { clients, deals, tasks } from "@/db/schema/crm";
import { PageHeading } from "@/components/ui/page-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { getWorkspaceContext } from "@/lib/workspace";

export default async function GlobalSearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {

  const [{ q = "" }, context] = await Promise.all([searchParams, getWorkspaceContext()]);
  const query = q.trim().slice(0, 120);
  const db = getDb();
  const [clientRows, dealRows, taskRows] = query.length >= 2 ? await Promise.all([
    db.select({ id: clients.id, name: clients.name, email: clients.email, kind: clients.kind, status: clients.status }).from(clients).where(and(eq(clients.organizationId, context.organization.id), isNull(clients.deletedAt), or(ilike(clients.name, `%${query}%`), ilike(clients.email, `%${query}%`), ilike(clients.phone, `%${query}%`)))).orderBy(clients.name).limit(8),
    db.select({ id: deals.id, title: deals.title, amount: deals.amount, stage: deals.stage, clientName: clients.name }).from(deals).innerJoin(clients, and(eq(clients.id, deals.clientId), eq(clients.organizationId, deals.organizationId))).where(and(eq(deals.organizationId, context.organization.id), isNull(deals.deletedAt), isNull(clients.deletedAt), or(ilike(deals.title, `%${query}%`), ilike(clients.name, `%${query}%`)))).orderBy(deals.updatedAt).limit(8),
    db.select({ id: tasks.id, title: tasks.title, dueAt: tasks.dueAt, status: tasks.status }).from(tasks).where(and(eq(tasks.organizationId, context.organization.id), isNull(tasks.deletedAt), ilike(tasks.title, `%${query}%`))).orderBy(tasks.dueAt).limit(8),
  ]) : [[], [], []];
  const total = clientRows.length + dealRows.length + taskRows.length;

  return <>
          <PageHeading
           eyebrow="PESQUISA GLOBAL" 
           title="Buscar no CRM" 
           description="Encontre clientes, oportunidades e tarefas do seu workspace." 
          />

          <form className="global-search-form" action="/search">
            <label className="search-field">
              <SearchIcon size={17} />

              <span className="visually-hidden">Termo de busca</span>

              <input
               className="input" 
               autoFocus 
               name="q" 
               type="search" 
               minLength={2} 
               maxLength={120} 
               defaultValue={query} 
               placeholder="Digite um nome, e-mail ou assunto" 
              />
            </label>

            <button className="button button--primary" type="submit">
              Pesquisar
            </button>
          </form>

          {query.length < 2 
          ? <div className="panel empty-state">
              <span className="empty-state-icon">
                <SearchIcon size={18} />
              </span>

              <strong>Digite ao menos 2 caracteres</strong>

              <p>
                A busca procura nomes, e-mails, oportunidades e tarefas neste workspace.
              </p>
            </div> 
          : <>
              <p className="search-result-count">
                {total} {total === 1 
                 ? "resultado" 
                 : "resultados"} para 
                <strong>“{query}”</strong> 
                <span>Mostrando até 8 por categoria.</span>
              </p>

              <div className="search-results-grid">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Clientes</h2>
                      <p>{clientRows.length} encontrados</p>
                    </div>
                    <UsersRound size={17} />
                  </div>
                  {clientRows.length 
                  ? clientRows.map((client) => 
                    <Link
                    className="search-result" 
                    href={`/clients/${client.id}`} 
                    key={client.id}
                    >
                      <span>
                        <strong>{client.name}</strong>
                        <small>{client.email ?? (client.kind === "company" 
                          ? "Empresa" 
                          : "Pessoa")}
                        </small>
                      </span>
                      <StatusBadge value={client.status} />
                      <ArrowRight size={14} />
                    </Link>) 
                  : <p className="search-empty">
                      Nenhum cliente corresponde à busca.
                    </p>
                  }
                </section>

                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Oportunidades</h2>
                      <p>{dealRows.length} encontradas</p>
                    </div>

                    <BriefcaseBusiness size={17} />
                  </div>{dealRows.length 
                  ? dealRows.map((deal) => 
                    <Link
                    className="search-result" 
                    href={`/deals/${deal.id}`} 
                    key={deal.id}
                    >
                      <span>
                        <strong>{deal.title}</strong>
                        <small>
                          {deal.clientName} · {formatCurrency(deal.amount)}
                        </small>
                      </span>

                      <StatusBadge value={deal.stage} />

                      <ArrowRight size={14} />
                    </Link>) 
                  : <p className="search-empty">
                      Nenhuma oportunidade corresponde à busca.
                    </p>
                  }
                </section>

                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Tarefas</h2>
                      <p>{taskRows.length} encontradas</p>
                    </div>
                  </div>

                  {taskRows.length 
                  ? taskRows.map((task) => 
                    <Link
                    className="search-result" 
                    href={`/tasks?q=${encodeURIComponent(task.title)}`} 
                    key={task.id}
                    >
                      <span>
                        <strong>{task.title}</strong>
                        <small>{formatDateTime(task.dueAt)}</small>
                      </span>

                      <StatusBadge value={task.status} />
                      
                      <ArrowRight size={14} />
                    </Link>) 
                  : <p className="search-empty">
                      Nenhuma tarefa corresponde à busca.
                    </p>
                  }
                </section>
              </div>
            </>}
        </>
  
}
