import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { Building2 } from "lucide-react";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/shell/logout-button";
import { getDb } from "@/db";
import { member, organization } from "@/db/schema/auth";
import { getAuth } from "@/lib/auth";
import { headers } from "next/headers";
import { selectWorkspace } from "@/modules/workspaces/actions";

export const metadata: Metadata = { title: "Escolher workspace" };
export const dynamic = "force-dynamic";

const reasonMessages: Record<string, string> = {
  required: "Escolha o workspace que deseja acessar.",
  invalid: "O workspace ativo não está mais disponível. Escolha um workspace ao qual sua conta ainda tem acesso.",
  "selection-failed": "Não foi possível confirmar essa seleção. Escolha novamente um workspace disponível.",
  "invalid-selection": "Essa seleção não está disponível para sua conta. Escolha um dos workspaces listados.",
  "no-workspaces": "Sua conta ainda não está vinculada a um workspace. Procure o administrador da equipe.",
  "invalid-role": "O papel da sua associação precisa ser revisado por um administrador.",
};

function roleLabel(role: string) {
  switch (role.toLowerCase()) {
    case "owner": return "Proprietário";
    case "admin": return "Administrador";
    default: return "Membro";
  }
}

export default async function SelectWorkspacePage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const [{ reason }, requestHeaders] = await Promise.all([searchParams, headers()]);
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session) redirect("/login?reason=session");

  const memberships = await getDb().select({
    organizationId: organization.id,
    organizationName: organization.name,
    role: member.role,
  }).from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(eq(member.userId, session.user.id))
    .orderBy(asc(member.createdAt));

  const message = reason ? reasonMessages[reason] : undefined;

  return <>
          <main className="workspace-select-page">
            <section
             className="workspace-select-panel" 
             aria-labelledby="workspace-select-title"
            >
              <span className="eyebrow">ROTA CRM · ACESSO</span>
              <h1 id="workspace-select-title">Escolha um workspace</h1>
              <p className="workspace-select-description">
                Cada workspace mantém seus clientes e atividades separados.
              </p>
              {message && 
              <p className="form-message form-message--error" role="alert">
                {message}
              </p>}

              {memberships.length > 0 
              ? <ul className="workspace-choice-list">
                  {memberships.map((item) => <li key={item.organizationId}>
                    <form action={selectWorkspace}>
                      <input
                      type="hidden" 
                      name="organizationId" 
                      value={item.organizationId} 
                      />

                      <button className="workspace-choice" type="submit">
                        <Building2 size={19} aria-hidden="true" />

                        <span className="workspace-choice-copy">
                          <strong>{item.organizationName}</strong>
                          <small>{roleLabel(item.role)}</small>
                        </span>

                        <span className="workspace-choice-action">
                          Selecionar
                        </span>
                      </button>
                    </form>
                  </li>)}
                </ul> 
              : <p className="workspace-select-empty">
                  Nenhum workspace está associado à sua conta.
                </p>
              }

              <div className="workspace-select-footer">
                <LogoutButton />
              </div>
            </section>
          </main>
        </>
}
