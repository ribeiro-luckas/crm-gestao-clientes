import { PageHeading } from "@/components/ui/page-heading";

export default function HelpPage() {

  return <>
          <PageHeading
           eyebrow="CENTRAL DE AJUDA" 
           title="Como podemos ajudar?" 
           description="Orientações rápidas para manter sua rotina comercial fluindo." 
          />

          <div className="help-grid">
            <article className="panel help-card">
              <span>01</span>
              <h2>Organize sua carteira</h2>
              <p>
                Cadastre empresas e pessoas com nome, canais de contato e responsável. 
                Empresas podem ter vários contatos vinculados.
              </p>
            </article>
            
            <article className="panel help-card">
              <span>02</span>
              <h2>Acompanhe oportunidades</h2>
              <p>
                Crie uma negociação vinculada a um cliente e avance pelas etapas. 
                Ao perder um negócio, registre o motivo para manter o histórico útil.
              </p>
            </article>
            
            <article className="panel help-card">
              <span>03</span>
              <h2>Registre cada conversa</h2>
              <p>
                Use atividades para anotar ligações, reuniões, e-mails e acompanhamentos. 
                A equipe poderá consultar a linha do tempo do relacionamento.
              </p>
            </article>
          </div>
        </>
  
}
