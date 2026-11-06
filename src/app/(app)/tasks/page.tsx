import Link from "next/link";
import { and, asc, count, eq, gt, ilike, isNull, lt, ne, or } from "drizzle-orm";
import { CalendarClock, Plus, Search } from "lucide-react";
import { getDb } from "@/db";
import { clients, deals, tasks } from "@/db/schema/crm";
import { TaskStatusControl } from "@/components/tasks/task-status-control";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/utils";
import { getWorkspaceContext } from "@/lib/workspace";

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string; status?: string }> }) {

  const [{ q = "", filter = "all", status = "all" }, context] = await Promise.all([searchParams, getWorkspaceContext()]);
  const now = new Date();
  const conditions = [eq(tasks.organizationId, context.organization.id), isNull(tasks.deletedAt)];

  if (q.trim()) conditions.push(or(ilike(tasks.title, `%${q.trim()}%`), ilike(clients.name, `%${q.trim()}%`), ilike(deals.title, `%${q.trim()}%`))!);

  if (["todo", "in_progress", "done", "canceled"].includes(status)) conditions.push(eq(tasks.status, status as "todo" | "in_progress" | "done" | "canceled"));

  if (filter === "overdue") conditions.push(lt(tasks.dueAt, now), ne(tasks.status, "done"), ne(tasks.status, "canceled"));

  if (filter === "upcoming") conditions.push(gt(tasks.dueAt, now), ne(tasks.status, "done"), ne(tasks.status, "canceled"));
  
  const db = getDb();
  const [rows, totalResult] = await Promise.all([
    db.select({ task: tasks, clientName: clients.name, dealTitle: deals.title }).from(tasks)
      .leftJoin(clients, and(eq(clients.id, tasks.clientId), eq(clients.organizationId, tasks.organizationId)))
      .leftJoin(deals, and(eq(deals.id, tasks.dealId), eq(deals.organizationId, tasks.organizationId)))
      .where(and(...conditions)).orderBy(asc(tasks.dueAt)).limit(100),
    db.select({ total: count() }).from(tasks).where(and(eq(tasks.organizationId, context.organization.id), isNull(tasks.deletedAt))),
  ]);
  const total = Number(totalResult[0]?.total ?? 0);
  
  return <>
          <PageHeading 
            eyebrow="ACOMPANHAMENTO" 
            title="Tarefas" 
            description="Mantenha os próximos passos claros e no tempo certo." 
            action={
              <Link className="button button--primary" href="/tasks/new">
                <Plus size={16} /> Nova tarefa
              </Link>} 
          />

          <form className="filter-bar" action="/tasks">
            <label className="search-field">
              <Search size={15} />
              <span className="visually-hidden">Buscar tarefas</span>
              <input 
                className="input" 
                type="search" 
                name="q" 
                defaultValue={q} 
                placeholder="Buscar tarefa, cliente ou oportunidade" 
              />
            </label>
            <select 
              className="input select filter-select" 
              name="filter" 
              defaultValue={filter} 
              aria-label="Filtrar por vencimento"
            >
              <option value="all">Todas as tarefas</option>
              <option value="overdue">Em atraso</option>
              <option value="upcoming">Próximas</option>
            </select>
            
            <select 
              className="input select filter-select"
              name="status" 
              defaultValue={status} 
              aria-label="Filtrar por status"
            >
              <option value="all">Todos os status</option>
              <option value="todo">A fazer</option>
              <option value="in_progress">Em andamento</option>
              <option value="done">Concluídas</option>
              <option value="canceled">Canceladas</option>
            </select>
            
            <Button variant="secondary" size="sm" type="submit">
              Filtrar
            </Button>
            
            <span className="filter-total">{total} tarefas</span>
          </form>

          <section className="panel" aria-label="Lista de tarefas">
            {rows.length 
            ? <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Tarefa</th>
                      <th>Relacionada a</th>
                      <th>Prioridade</th>
                      <th>Vencimento</th>
                      <th>Ação</th>
                    </tr>
                  </thead>
                  
                  <tbody>
                    {rows.map(({ task, clientName, dealTitle }) => { 
                      const overdue = task.dueAt < now && 
                      task.status !== "done" && 
                      task.status !== "canceled"; 
                      return <tr key={task.id} className={
                        overdue 
                        ? "task-row-overdue" 
                        : undefined}>
                          <td>
                            <TaskStatusControl
                             taskId={task.id} 
                             status={task.status} 
                            />
                          </td>

                          <td>
                            <span className="table-primary">
                              <strong>{task.title}</strong>
                              <small>
                                {task.description ??
                               "Sem descrição"}
                              </small>
                            </span>
                          </td>

                          <td className="table-muted">
                            {dealTitle 
                            ?? clientName 
                            ?? "Sem vínculo"}
                          </td>
                          
                          <td>
                            <StatusBadge value={task.priority} />
                          </td>
                          
                          <td>
                            <time
                             className={
                              overdue 
                              ? "text-danger" 
                              : "table-muted"} 
                             dateTime={task.dueAt.toISOString()}
                            >
                              {formatDateTime(task.dueAt)}
                            </time>
                          </td>
                          
                          <td>
                            <StatusBadge value={task.status} />
                          </td>
                      </tr>; })}
                  </tbody>
                </table>
              </div> 
              : <div className="empty-state">
                  <span className="empty-state-icon">
                    <CalendarClock size={18} />
                  </span>
                  <strong>{q || filter !== "all" 
                    ? "Nenhuma tarefa encontrada" 
                    : "Sua lista está vazia"}
                  </strong>
                  <p>
                    {q || filter !== "all" 
                      ? "Ajuste a busca ou os filtros para ver outras tarefas." 
                      : "Crie lembretes e próximos passos para não perder o ritmo das conversas."
                    }
                  </p>

                  {filter === "all" && !q && 
                  <Link className="button button--primary button--sm" href="/tasks/new">
                    <Plus size={14} /> Criar tarefa
                  </Link>}
                </div>}
          </section>
        </>
  
}
