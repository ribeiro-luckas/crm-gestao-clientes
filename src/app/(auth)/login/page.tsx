import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {

  const { reason } = await searchParams;

  return <>
          <main className="auth-page">
            <section className="auth-panel" aria-labelledby="login-title">
              <Link className="brand-lockup auth-brand" href="/">
                <span className="brand-mark" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                <span className="brand-name">rota<span>.</span>
                <small>CRM COMERCIAL</small>
              </span>
              </Link>

              <div className="auth-heading">
                <span className="eyebrow">BEM-VINDO DE VOLTA</span>

                <h1 id="login-title">
                  Seu próximo passo
                  <br />
                  começa <em>aqui.</em>
                </h1>

                <p>
                  Entre para acompanhar seus relacionamentos e oportunidades.
                </p>
              </div>

              {reason === "session" && 
              <p className="form-message form-message--error" role="alert">
                Sua sessão não está ativa. Entre novamente para continuar.
              </p>}

              {reason === "no-workspace" && 
              <p className="form-message form-message--error" role="alert">
                Sua conta ainda não está vinculada a um workspace. Procure o administrador.
              </p>}

              <LoginForm />
              
              <p className="auth-footnote">
                Acesso restrito à equipe convidada.
              </p>
            </section>

            <aside
             className="auth-art" 
             aria-label="Uma ilustração abstrata sobre caminhos e oportunidades"
            >
              <span className="art-coordinate">
                REC · 08°03′S<br />CRM / 01
              </span>

              <div className="art-orbit art-orbit--a" />
              <div className="art-orbit art-orbit--b" />
              <div className="art-shape art-shape--blue" />
              <div className="art-shape art-shape--lime" />
              <div className="art-shape art-shape--coral" />
              
              <div className="art-caption">
                <span>01 — RELACIONAR</span>
                <span>O caminho se constrói<br />em cada conversa.</span>
              </div>
            </aside>
          </main>
        </>
}
