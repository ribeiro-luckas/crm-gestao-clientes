import { Archive, BriefcaseBusiness, CheckCheck, CircleUserRound, ContactRound, Mail, ShieldCheck } from "lucide-react";
import type { MemberAssignmentSummary } from "@/modules/team/actions";
import { AssignmentTransferControl } from "@/components/team/assignment-transfer-control";

const roleNames: Record<string, string> = { owner: "Proprietário", admin: "Administrador", member: "Membro" };

function CountCell({ active, archived, label, activeLabel, archivedLabel }: { active: number; archived: number; label: string; activeLabel: string; archivedLabel: string }) {
  const total = active + archived;
  return (
    <td>
      <span
       className="responsibility-count" 
       aria-label={`${total} ${label} no total`}
      >
        {total}
      </span>

      <span className="responsibility-breakdown">
        <span>
          <CheckCheck size={11} aria-hidden="true" /> {active} {activeLabel}
        </span>
        
        <span>
          <Archive size={11} aria-hidden="true" /> {archived} {archivedLabel}
        </span>
      </span>
    </td>
  );
}

export function MemberResponsibilities({ members }: { members: MemberAssignmentSummary[] }) {
  return (
    <section
     className="panel responsibility-panel" 
     aria-labelledby="responsibility-title" 
     aria-describedby="responsibility-description"
    >
      <div className="panel-heading">
        <div>
          <h2 id="responsibility-title">Responsabilidades por pessoa</h2>
          <p id="responsibility-description">
            Atribuições do workspace atual, com registros ativos e arquivados separados.
          </p>
        </div>

        <span className="responsibility-owner-label">
          <ShieldCheck size={13} aria-hidden="true" /> Visão de proprietário
        </span>
      </div>

      {members.length === 0 
      ? (
        <div className="empty-state" role="status">
          <span className="empty-state-icon">
            <CircleUserRound size={18} aria-hidden="true" />
          </span>
          <strong>Nenhum membro encontrado</strong>
          <p>
            Quando houver pessoas no workspace, as responsabilidades aparecerão aqui.
          </p>
        </div>
      ) 
      : (
        <div
         className="table-wrap responsibility-table-wrap" 
         role="region" 
         tabIndex={0} 
         aria-label="Tabela de responsabilidades por membro. Use a rolagem horizontal para consultar todas as colunas."
        >
          <table className="data-table responsibility-table">
            <caption className="responsibility-caption">
              Responsabilidades comerciais dos membros do workspace
            </caption>

            <thead>
              <tr>
                <th scope="col">Pessoa</th>
                <th scope="col">
                  <span className="responsibility-column">
                    <ContactRound size={13} aria-hidden="true" /> Clientes
                  </span>
                </th>
                <th scope="col">
                  <span className="responsibility-column">
                    <BriefcaseBusiness
                     size={13} 
                     aria-hidden="true" 
                    /> Oportunidades
                  </span>
                </th>
                <th scope="col">
                  <span className="responsibility-column">
                    <CheckCheck size={13} aria-hidden="true" /> Tarefas
                  </span>
                </th>
                <th scope="col">Total</th>
              </tr>
            </thead>
            <tbody>
              {members.map((person) => {
                const hasAssignments = person.total.all > 0;
                return (
                  <tr key={person.memberId}>
                    <th scope="row" className="responsibility-person-cell">
                      <span className="team-person">
                        <span className="contact-avatar" aria-hidden="true">
                          {person.name.slice(0, 1).toUpperCase()}
                        </span>
                        <span className="table-primary">
                          <strong>{person.name}</strong>
                          <small>
                            <Mail size={11} aria-hidden="true" /> {person.email}
                          </small>
                          <span className={`role-pill role-pill--${person.role}`}>
                            <ShieldCheck
                             size={12} 
                             aria-hidden="true" 
                            /> {roleNames[person.role] ?? person.role}
                          </span>

                          {!hasAssignments && 
                            <span className="responsibility-none">
                              Sem atribuições
                            </span>
                          }
                        </span>
                      </span>
                    </th>
                    <CountCell
                     active={person.clients.active} 
                     archived={person.clients.archived} 
                     label="clientes" 
                     activeLabel="ativos" 
                     archivedLabel="arquivados" 
                    />

                    <CountCell
                     active={person.deals.active} 
                     archived={person.deals.archived} 
                     label="oportunidades" 
                     activeLabel="ativas" 
                     archivedLabel="arquivadas" 
                    />

                    <CountCell
                     active={person.tasks.active} 
                     archived={person.tasks.archived} 
                     label="tarefas" 
                     activeLabel="ativas" 
                     archivedLabel="arquivadas" 
                    />

                    <td>
                      <span
                       className="responsibility-count responsibility-count--total">
                        {person.total.all}
                      </span>

                      <span className="responsibility-breakdown">
                        <span>
                          {person.total.active} responsabilidades ativas
                        </span>

                        <span>
                          {person.total.archived} responsabilidades arquivadas
                        </span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="responsibility-footnote">
        <Archive
         size={12} 
         aria-hidden="true" 
        /> Arquivadas permanecem atribuídas e entram na contagem total.
      </p>

      {members.length > 0 && 
        <AssignmentTransferControl members={members} />
      }
    </section>
  );
}
