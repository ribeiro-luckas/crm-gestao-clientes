# Estrutura do repositório

| Caminho | Conteúdo e função |
|---|---|
| `src/app/` | Rotas App Router, layouts, páginas, APIs CSV/Auth, CSS global. Grupos `(app)` e `(auth)` organizam rotas sem compor o URL. |
| `src/components/` | Componentes React agrupados por atividade, autenticação, clientes, negócios, tarefas, equipe, shell, settings e UI. |
| `src/modules/` | Operações de domínio, Server Actions, schemas e políticas de negócio por área. |
| `src/lib/` | Autenticação, CSP, CSV, contexto de erros, autorização de organização, logger seguro e utilitários. |
| `src/db/` | Pool e Drizzle, schema Better Auth/CRM, guardas de URL de teste e migrations SQL. |
| `scripts/` | Bootstrap pontual do OWNER, helpers de bootstrap, migração diagnóstica e build Render. |
| `tests/unit/` | Testes de funções, schemas, políticas, componentes/helpers e segurança. |
| `tests/integration/` | Testes com Better Auth e PostgreSQL para transações, tenancy, integridade e RBAC. |
| `tests/e2e/` | Cenários Playwright de fluxos, segurança e acessibilidade. |
| `tests/helpers/` | URL isolada, autenticação de E2E e fixtures. |
| `docs/` | Documentação de arquitetura, guias, referência e relatórios históricos. |
| raiz | Configurações Next, TypeScript, ESLint, Vitest, Playwright, Drizzle, Node e Render; manifestos npm. |

Referências completas: [arquivos da aplicação](../reference/files/application.md), [arquivos de testes](../reference/files/tests.md), [funções](../reference/index.md) e migrations descritas em [DEPLOY-02](../deployment/DEPLOY-02-local-preflight.md).

## Rotas observadas

- Público/autenticação: `/`, `/login`.
- Workspace autenticado: `/dashboard`, `/clients`, `/clients/new`, `/clients/[id]`, `/clients/[id]/edit`, `/deals`, `/deals/new`, `/deals/[id]`, `/deals/[id]/edit`, `/tasks`, `/tasks/new`, `/activities`, `/search`, `/team`, `/settings`, `/help`.
- Seleção: `/workspace/select`.
- APIs: `/api/auth/[...all]`, `/api/export/clients.csv`, `/api/export/deals.csv`.

As rotas listadas correspondem aos arquivos presentes em `src/app`; os grupos de rotas não aparecem no URL.
