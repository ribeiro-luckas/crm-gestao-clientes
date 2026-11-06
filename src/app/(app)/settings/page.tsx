import { getWorkspaceContext } from "@/lib/workspace";
import Link from "next/link";
import { PageHeading } from "@/components/ui/page-heading";
import { ThemeControl } from "@/components/settings/theme-control";

export default async function SettingsPage() {

  const context = await getWorkspaceContext();

  return <>
          <PageHeading 
            eyebrow="PREFERÊNCIAS" 
            title="Configurações" 
            description="Ajustes da sua experiência no Rota CRM." 
          />

          <div className="settings-grid">
            <section className="panel settings-card">
              <span className="eyebrow">APARÊNCIA</span>
              <h2>Tema da interface</h2>
              <p>
                Escolha o modo que fica mais confortável para o seu ambiente.
              </p>
              <ThemeControl />
            </section>

            <section className="panel settings-card">
              <span className="eyebrow">WORKSPACE</span>
              <h2>{context.organization.name}</h2>
              <p>
                Seu espaço de trabalho está preparado para separar os dados comerciais desta equipe.
              </p>
              <div className="settings-meta">
                <span>Papel nesta equipe</span>
                <strong>
                  {context.role === "owner"
                   ? "Proprietário" 
                   : context.role === "admin" 
                   ? "Administrador" 
                   : "Membro"
                  }
                </strong>
              </div>
              <Link
               className="button button--secondary workspace-settings-link" 
               href="/workspace/select">
                Trocar workspace
              </Link>
            </section>
            
            <section className="panel settings-card">
              <span className="eyebrow">SEGURANÇA</span>
              <h2>Conta e senha</h2>
              <p>
                A recuperação de senha por e-mail ficará disponível depois de configurar o serviço de envio.
              </p>
              <span className="status-badge status-badge--prospect">
                E-mail pendente de configuração
              </span>
            </section>
          </div>
        </>
}
