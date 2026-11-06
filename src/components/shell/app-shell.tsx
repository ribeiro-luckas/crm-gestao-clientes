"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Bell, BriefcaseBusiness, Building2, CalendarDays, CheckSquare, ChevronDown, CircleHelp, LayoutDashboard, ListChecks, Search, Settings2, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/shell/logout-button";
import { initials } from "@/lib/utils";

const navigation = [
  { label: "Visão geral", href: "/", icon: LayoutDashboard },
  { label: "Clientes", href: "/clients", icon: Building2 },
  { label: "Oportunidades", href: "/deals", icon: BriefcaseBusiness },
  { label: "Tarefas", href: "/tasks", icon: CheckSquare },
  { label: "Atividades", href: "/activities", icon: ListChecks },
  { label: "Equipe", href: "/team", icon: UsersRound },
];

export function AppShell({ children, user, organization, role }: { children: ReactNode; user: { name: string; email: string }; organization: { id: string; name: string }; role: string }) {

  const pathname = usePathname();
  const pageName = navigation.find((item) => item.href === pathname)?.label ?? "Visão geral";

  return <>
          <div className="app-frame">
            <a className="skip-link" href="#main-content">
              Pular para o conteúdo
            </a>

            <aside className="sidebar" aria-label="Workspace e navegação">
              <Link className="brand-lockup" href="/">
                <span className="brand-mark" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                </span>

                <span className="brand-name">
                  rota
                  <span>
                    .
                  </span>
                  <small>
                    CRM COMERCIAL
                  </small>
                </span>
              </Link>

              <Link className="workspace-switcher" href="/workspace/select">
                <span className="workspace-avatar">
                  {initials(organization.name)}
                </span>

                <span className="workspace-copy">
                  <strong>{organization.name}</strong>
                  <small>Trocar workspace</small>
                </span>
                <ChevronDown size={15} aria-hidden="true" />
              </Link>

              <div className="sidebar-section-label">ESPAÇO DE TRABALHO</div>

              <nav className="main-nav" aria-label="Navegação principal">
                {navigation.map(({ label, href, icon: Icon }) => 
                <Link
                 href={href} 
                 className={`nav-link${pathname === href 
                 ? " is-active" 
                 : ""}`} 
                 aria-current={pathname === href 
                 ? "page" 
                 : undefined} 
                 key={href}
                >
                  <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                  <span>{label}</span>
                </Link>)}
              </nav>

              <div className="sidebar-spacer" />

              <div className="sidebar-note">
                <span className="note-spark">✳</span>
                <div>
                  <strong>Um bom próximo passo.</strong>
                  <small>O relacionamento cresce no acompanhamento.</small>
                </div>
                <ArrowUpRight size={15} aria-hidden="true" />
              </div>

              <nav className="sidebar-bottom" aria-label="Ajuda e configurações">
                <Link href="/settings" className="nav-link">
                  <Settings2 size={18} aria-hidden="true" />
                  <span>Configurações</span>
                </Link>
                <Link href="/help" className="nav-link">
                  <CircleHelp size={18} aria-hidden="true" />
                  <span>Ajuda</span>
                </Link>
              </nav>
            </aside>

            <div className="main-column">
              <header className="topbar">
                <div className="breadcrumb">
                  <span>Comercial</span>
                  <span aria-hidden="true">/</span>
                  <strong>{pageName}</strong>
                </div>

                <div className="topbar-actions">
                  <Link
                   href="/search" 
                   className="icon-button" 
                   aria-label="Pesquisar no CRM"
                  >
                    <Search size={17} />
                  </Link>

                  <button
                   type="button" 
                   className="icon-button notification-button" 
                   aria-label="Notificações"
                  >
                    <Bell size={17} />
                    <i />
                  </button>

                  <span className="topbar-divider" />

                  <div className="user-chip">
                    <span className="user-avatar">{initials(user.name)}</span>
                    <span>
                      <strong>{user.name}</strong>
                      <small>
                        {role === "owner" 
                          ? "Proprietário" 
                          : role === "admin" 
                          ? "Administrador" 
                          : "Membro"
                        }
                      </small>
                    </span>

                    <ChevronDown size={15} aria-hidden="true" />
                  </div>

                  <LogoutButton />
                </div>
              </header>

              <main id="main-content" className="main-content">
                {children}
              </main>

              <footer className="app-footer">
                <span>ROTA CRM <i>·</i> GESTÃO COMERCIAL</span>

                <span>
                  Todos os horários em Recife 
                  <CalendarDays size={13} aria-hidden="true" />
                </span>
              </footer>
            </div>
          </div>
        </>

}
