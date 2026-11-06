import Link from "next/link";
import { and, count, desc, eq, ilike, isNull, or } from "drizzle-orm";
import { ArrowDownWideNarrow, ArrowRight, Download, Plus, Search, UsersRound } from "lucide-react";
import { getDb } from "@/db";
import { clients } from "@/db/schema/crm";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { FocusVisibleScrollRegion } from "@/components/ui/focus-visible-scroll-region";
import { formatDate } from "@/lib/utils";
import { getWorkspaceContext } from "@/lib/workspace";

const PAGE_SIZE = 20;

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; status?: string }> }) {
  const [{ q = "", page: pageString = "1", status = "all" }, context] = await Promise.all([searchParams, getWorkspaceContext()]);
  const page = Math.max(1, Number.parseInt(pageString, 10) || 1);
  const filters = [eq(clients.organizationId, context.organization.id), isNull(clients.deletedAt)];
  if (q.trim()) filters.push(or(ilike(clients.name, `%${q.trim()}%`), ilike(clients.email, `%${q.trim()}%`), ilike(clients.phone, `%${q.trim()}%`))!);
  if (status === "active" || status === "prospect" || status === "inactive") filters.push(eq(clients.status, status));
  const where = and(...filters);
  const db = getDb();
  const [rows, totalResult] = await Promise.all([
    db.select().from(clients).where(where).orderBy(desc(clients.updatedAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(clients).where(where),
  ]);
  const total = Number(totalResult[0]?.total ?? 0);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return <>
          <PageHeading
           eyebrow="RELACIONAMENTOS" 
           title="Clientes" 
           description="Empresas e pessoas que fazem parte da sua carteira." 
           action={
            <>
              {(context.role === "owner" || context.role === "admin") && 
              <a
               className="button button--secondary" 
               href={`/api/export/clients.csv?q=${encodeURIComponent(q)}&status=${status}`}
              >
                <Download size={15} aria-hidden="true" /> Exportar CSV
              </a>}
              
              <Link className="button button--primary" href="/clients/new">
                <Plus size={16} aria-hidden="true" /> Novo cliente
              </Link></>
           } 
          />

          <form className="filter-bar" action="/clients">
            <label className="search-field">
              <Search size={15} aria-hidden="true" />

              <span className="visually-hidden">Pesquisar clientes</span>

              <input
               className="input" 
               type="search" 
               name="q" 
               defaultValue={q} 
               placeholder="Buscar por nome, e-mail ou telefone" 
              />
            </label>

            <select
             className="input select filter-select" 
             name="status" 
             defaultValue={status} 
             aria-label="Filtrar por status"
            >
              <option value="all">Todos os status</option>
              <option value="active">Ativos</option>
              <option value="prospect">Prospectos</option>
              <option value="inactive">Inativos</option>
            </select>
            
            <Button variant="secondary" size="sm" type="submit">
              <ArrowDownWideNarrow size={14} aria-hidden="true" /> Filtrar
            </Button>

            <span className="filter-total">
              {total} {total === 1 
                ? "registro" 
                : "registros"
              }
            </span>
          </form>

          <section className="panel" aria-label="Lista de clientes">
            {rows.length 
            ? (
              <FocusVisibleScrollRegion
               className="table-wrap client-list-table-wrap"
              >
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Tipo</th>
                      <th>Status</th>
                      <th>Responsável</th>
                      <th>Atualizado</th>
                      <th>
                        <span className="visually-hidden">Abrir</span>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((client) => (
                      <tr key={client.id}>
                        <td>
                          <Link
                           className="table-primary table-row-link" 
                           href={`/clients/${client.id}`}
                          >
                            <strong>{client.name}</strong>
                            <small>
                              {client.email 
                                ?? client.phone 
                                ?? "Sem dados de contato"
                              }
                            </small>
                          </Link>
                        </td>
                        <td className="table-muted">
                          {client.kind === "company" 
                            ? "Empresa" 
                            : "Pessoa"
                          }
                        </td>
                        <td>
                          <StatusBadge value={client.status} />
                        </td>
                        <td className="table-muted">
                          {client.ownerUserId === context.user.id 
                            ? "Você" 
                            : "Equipe"
                          }
                        </td>
                        <td className="table-muted">
                          {formatDate(client.updatedAt, 
                            { dateStyle: "medium" })}
                        </td>
                        <td>
                          <Link
                           href={`/clients/${client.id}`} 
                           className="row-action" 
                           aria-label={`Abrir ${client.name}`}
                          >
                            <ArrowRight size={15} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </FocusVisibleScrollRegion>
            ) 
            : (
              <div className="empty-state">
                <span className="empty-state-icon">
                  <UsersRound size={18} />
                </span>

                <strong>
                  {q 
                    ? "Nenhum cliente encontrado" 
                    : "Sua carteira começa aqui"
                  }
                </strong>

                <p>
                  {q 
                      ? "Tente ajustar a busca ou os filtros." 
                      : "Cadastre seu primeiro cliente para manter as conversas e oportunidades em um só lugar."
                  }
                </p>

                {!q && 
                <Link
                 className="button button--primary button--sm" 
                 href="/clients/new"
                >
                  <Plus size={14} /> Cadastrar cliente
                </Link>}
              </div>
            )}

            <div className="pagination">
              <span>
                Mostrando {total 
                  ? (page - 1) * PAGE_SIZE + 1 
                  : 0
                }–{Math.min(page * PAGE_SIZE, total)} de {total}
              </span>

              <div className="pagination-actions">
                {page <= 1 
                ? <span
                   className="button button--secondary button--sm is-disabled"
                  >
                    Anterior
                  </span> 

                : <Link
                   className="button button--secondary button--sm" 
                   href={`/clients?q=${encodeURIComponent(q)}&status=${status}&page=${page - 1}`}
                  >
                    Anterior
                  </Link>
                }
                
                {page >= pages 
                ? <span
                   className="button button--secondary button--sm is-disabled"
                  >
                    Próxima
                  </span> 
                : <Link
                   className="button button--secondary button--sm" 
                   href={`/clients?q=${encodeURIComponent(q)}&status=${status}&page=${page + 1}`}
                  >
                    Próxima
                  </Link>
                }
              </div>
            </div>
          </section>
        </>
}
