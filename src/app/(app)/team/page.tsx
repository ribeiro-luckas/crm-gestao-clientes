import { asc, eq } from "drizzle-orm";
import { Mail, ShieldCheck, UsersRound } from "lucide-react";
import { getDb } from "@/db";
import { member, user } from "@/db/schema/auth";
import { PageHeading } from "@/components/ui/page-heading";
import { getWorkspaceContext } from "@/lib/workspace";
import { MemberRoleControl } from "@/components/team/member-role-control";
import { MemberResponsibilities } from "@/components/team/member-responsibilities";
import { canManageMemberRoles } from "@/modules/team/permissions";
import { getMemberAssignmentSummary } from "@/modules/team/actions";
import { safeLogger } from "@/lib/safe-logger";

const roleNames: Record<string, string> = { owner: "Proprietário", admin: "Administrador", member: "Membro" };

export default async function TeamPage() {

  const context = await getWorkspaceContext();
  const members = await getDb().select({ memberId: member.id, role: member.role, joinedAt: member.createdAt, name: user.name, email: user.email, userId: user.id })
    .from(member).innerJoin(user, eq(user.id, member.userId)).where(eq(member.organizationId, context.organization.id)).orderBy(asc(member.createdAt));
  const canManage = canManageMemberRoles(context.role);
  let responsibilities: Awaited<ReturnType<typeof getMemberAssignmentSummary>> | null = null;
  let responsibilitiesFailed = false;
  if (context.role === "owner") {
    try {
      responsibilities = await getMemberAssignmentSummary();
    } catch (error) {
      responsibilitiesFailed = true;
      safeLogger.error({ category: "data-load", operation: "team.responsibilities.load", error });
    }
  }

  return <>
          <PageHeading 
          eyebrow="PESSOAS E ACESSO" 
          title="Equipe" 
          description={`Pessoas com acesso ao workspace ${context.organization.name}.`} 
          action={
          <span className="team-total">
            <UsersRound size={15} />{members.length} {members.length === 1 
            ? "membro" 
            : "membros"}
          </span>} />

          <section className="panel" aria-label="Membros do workspace">
            <div className="panel-heading">
              <div>
                <h2>Membros do workspace</h2>
                <p>Papéis determinam as ações disponíveis para cada pessoa.</p>
              </div>
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Pessoa</th>
                    <th>Papel atual</th>
                    <th>Desde</th>
                    {canManage && <th>Gerenciar</th>}
                  </tr>
                </thead>
                
                <tbody>
                  {members.map((person) => <tr key={person.memberId}>
                    <td>
                      <span className="team-person">
                        <span className="contact-avatar">
                          {person.name.slice(0, 1).toUpperCase()}
                        </span>
                        <span className="table-primary">
                          <strong>
                            {person.name}{person.userId === context.user.id && 
                            " (você)"}
                          </strong>
                          <small>
                            <Mail size={11} />
                            {person.email}
                          </small>
                        </span>
                      </span>
                    </td>
                    
                    <td>
                      <span className={`role-pill role-pill--${person.role}`}>
                        <ShieldCheck size={13} />
                        {roleNames[person.role] ?? person.role}
                      </span>
                    </td>
                    
                    <td className="table-muted">
                      {new Intl.DateTimeFormat("pt-BR", { 
                        dateStyle: "medium", 
                        timeZone: "America/Recife" 
                      }).format(person.joinedAt)}
                    </td>
                    {canManage && 
                    <td>{person.role === "owner" 
                      ? <span className="table-muted">Protegido</span> 
                      : <MemberRoleControl 
                      memberId={person.memberId} 
                      memberName={person.name} 
                      memberEmail={person.email} 
                      role={person.role} />}
                    </td>}
                  </tr>)}
                </tbody>
              </table>
            </div>
          </section>

          {context.role === "owner" && (responsibilitiesFailed
            ? <section 
               className="panel responsibility-panel" 
               aria-labelledby="responsibility-error-title"
              >

                <div className="panel-heading">
                  <div>
                    <h2 id="responsibility-error-title">
                      Responsabilidades por pessoa
                    </h2>
                    <p>Resumo administrativo do workspace.</p>
                  </div>
                </div>
                
                <div className="responsibility-error" role="alert">
                  <strong>
                    Não foi possível carregar as responsabilidades.
                  </strong>

                  <p>
                    Tente atualizar a página. Nenhuma atribuição foi alterada.
                  </p>
                </div>
              </section>
            : responsibilities && 
              <MemberResponsibilities members={responsibilities} />
            )}

          <aside className="notice-panel">
            <span className="intro-symbol">
              <Mail size={16} />
            </span>
            
            <div>
              <strong>
                Convites por e-mail ainda não estão configurados.
              </strong>
              <p>
                Para adicionar pessoas, configure um serviço de envio de e-mail. O cadastro público permanece desativado.
              </p>
            </div>
          </aside>
        </>

}
