# DEPLOY-03 — Revisão do primeiro commit e documentação técnica

**Data:** 2026-11-04 (America/Recife)  
**Escopo:** documentação, organização local e preparação de uma allowlist; sem staging, commit, remote, push ou deploy.  
**Decisão:** commit inicial preparado para revisão, ainda não autorizado a executar.

## Resumo executivo

A estrutura e os arquivos executáveis foram inventariados. Foram criados README, arquitetura, fluxos, guias, referência navegável de arquivos/funções/variáveis e catálogo de ambiente. `.gitignore` agora exclui as instruções locais AGENTS/CLAUDE/GEMINI sem apagar os arquivos. O código de negócio não foi alterado. O estado Git continua sem commits, sem arquivos rastreados e sem remote; nenhum arquivo foi staged.

A análise estática TypeScript cobriu 134 arquivos: 1626 declarações de função/callback, 3094 declarações/bindings variáveis, 1231 parâmetros e 759 propriedades. Os catálogos dividem aplicação (85 arquivos) e testes/helpers (49). Essa contagem não atribui semântica não demonstrada a cada callback local; funções de domínio e seus fluxos são explicados nos documentos de arquitetura. Limites são descritos em [referência](../reference/index.md).

## Documentação

### Criados

- `docs/README.md` — índice.
- `docs/architecture/overview.md`, `structure.md`, `flows.md` — camadas, diretórios, rotas e fluxos implementados.
- `docs/reference/index.md`, `environment-variables.md`, `files/{application,tests,non-typescript}.md`, `functions/{application,tests}.md`, `variables/{application,tests}.md` — catálogos.
- `docs/guides/{development,testing,deployment}.md` — procedimentos.
- Este relatório.

### Atualizados

- `README.md`: instalação, scripts, segurança, limites e links.
- `docs/architecture.md`: agora encaminha à arquitetura atual; marca proposta anterior como desatualizada.
- `.gitignore`: padrões específicos de instruções de agentes.

### Cobertura e limitações

- Arquivos AST: 134; funções/callbacks: 1626; variáveis/bindings: 3094; parâmetros: 1231; propriedades declaradas: 759.
- Variáveis de ambiente estáticas: BETTER_AUTH_SECRET, BETTER_AUTH_URL, CI, CRM_ORGANIZATION_NAME, CRM_ORGANIZATION_SLUG, CRM_OWNER_EMAIL, CRM_OWNER_NAME, CRM_OWNER_PASSWORD, CRM_TEST_MODE, DATABASE_URL, DATABASE_URL_MIGRATIONS, NODE_ENV, RUN_MEMBER_ASSIGNMENT_INTEGRITY_TESTS, RUN_TASK_DEAL_CLIENT_INTEGRITY_TESTS, TEST_DATABASE_URL (15).
- Módulos cobertos: `src/app`, `src/components`, `src/modules`, `src/lib`, `src/db`, `scripts`, configurações TS/JS e `tests/{unit,integration,e2e,helpers}`.
- Fluxos explicados: login/sessão/logout, seleção de workspace/tenancy, bootstrap OWNER, clientes/contatos, negócios/tarefas/atividades, equipe/transferência, CSV, CSP/logging.
- Imports/exports e assinaturas/tipos foram extraídos via AST/checker. Chamadas conhecidas são pistas sintáticas; chamadas dinâmicas podem não ser identificadas. Assinaturas estruturais longas são truncadas na apresentação.
- Tipos de variáveis cobrem escopo, nome, tipo, presença/origem sintática de inicialização e contexto lexical. Valores de inicializadores foram omitidos; literais URL em tipos foram sanitizados. O inventário não resolve todas as referências de uso de cada variável individual; veja a função/contexto e o fluxo de domínio. Não se afirma descrição semântica completa de cada variável local trivial.
- CSS, SQL, YAML, JSON, shell, Markdown e assets não são símbolos TypeScript. Migrations, scripts/configuração não TS e arquivos operacionais foram descritos por finalidade em `files/non-typescript.md`. Propriedades de objetos de configuração e variáveis CSS não são símbolos locais TS e não entram na contagem AST.
- Nenhum símbolo foi omitido silenciosamente da extração AST; eventuais relações não inferíveis estão declaradas como limitação.

## Git

### Estado

- Branch: `master`.
- Commits: nenhum.
- Arquivos rastreados antes: 0.
- Remote: nenhum configurado.
- Todos os arquivos candidatos estavam não rastreados; nenhum foi adicionado ao index.

### Ignore e preservação local

Padrões adicionados: `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` na raiz e recursivamente, além de `docs/knowledge/` para preservar localmente a base da fábrica consultada por agentes. Padrões que já existiam: `.agents/`, `.knowledge-base-path`, `.env*` com exceção de `.env.example`, dependências, Next build, caches/artefatos Playwright, logs, traces, `*.tsbuildinfo`, `*.bak`.

Arquivos locais de agentes encontrados: `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`; permanecem no disco e ignorados. A pasta `docs/knowledge/` e `.knowledge-base-path` também permanecem locais e ignorados. `.agents/skills/engineering-knowledge` é symlink para a base compartilhada externa e permanece intacto/ignorado. Foram também observados symlinks gerados sob `.next/`; diretório ignorado. Nenhuma configuração global ou estrutura compartilhada foi alterada.

`git check-ignore -v` confirmou os padrões para instruções, `.agents`, pointer local, `.env.local`, `node_modules`, `.next`, cobertura, report Playwright e traces. Código-fonte, testes, migrations e docs técnicas não foram ignorados.

### Allowlist candidata ao primeiro commit

A simulação abaixo é apenas uma lista de caminhos; não houve `git add`. Inclui código executável, testes, manifestos/configuração, migrations e documentação técnica geral atualizada. Propostas e relatórios de fase inicial foram mantidos fora da allowlist. Exclui relatórios SEC/DEPLOY históricos, documentação de incidentes/contexto da fábrica, auditorias UX/design/roadmap, SQL preflight, agentes, `.env.local`, artefatos e dependências instaladas.

**Total: 173 caminhos.**

```text
.env.example
.gitignore
.node-version
README.md
docs/README.md
docs/architecture.md
docs/architecture/flows.md
docs/architecture/overview.md
docs/architecture/structure.md
docs/deployment/DEPLOY-03-initial-commit-review.md
docs/guides/deployment.md
docs/guides/development.md
docs/guides/testing.md
docs/reference/environment-variables.md
docs/reference/files/application.md
docs/reference/files/non-typescript.md
docs/reference/files/tests.md
docs/reference/functions/application.md
docs/reference/functions/tests.md
docs/reference/index.md
docs/reference/variables/application.md
docs/reference/variables/tests.md
drizzle.config.ts
drizzle.migrate.config.ts
drizzle.test.config.ts
eslint.config.mjs
next-env.d.ts
next.config.ts
package-lock.json
package.json
playwright.config.ts
postcss.config.mjs
render.yaml
scripts/bootstrap-owner.ts
scripts/debug-migrate.mjs
scripts/lib/bootstrap-organization.ts
scripts/render-build.sh
src/app/(app)/activities/page.tsx
src/app/(app)/clients/[id]/edit/page.tsx
src/app/(app)/clients/[id]/page.tsx
src/app/(app)/clients/new/page.tsx
src/app/(app)/clients/page.tsx
src/app/(app)/dashboard/page.tsx
src/app/(app)/deals/[id]/edit/page.tsx
src/app/(app)/deals/[id]/page.tsx
src/app/(app)/deals/new/page.tsx
src/app/(app)/deals/page.tsx
src/app/(app)/help/page.tsx
src/app/(app)/layout.tsx
src/app/(app)/search/page.tsx
src/app/(app)/settings/page.tsx
src/app/(app)/tasks/new/page.tsx
src/app/(app)/tasks/page.tsx
src/app/(app)/team/loading.tsx
src/app/(app)/team/page.tsx
src/app/(auth)/login/page.tsx
src/app/api/auth/[...all]/route.ts
src/app/api/export/clients.csv/route.ts
src/app/api/export/deals.csv/route.ts
src/app/globals.css
src/app/layout.tsx
src/app/page.tsx
src/app/workspace/select/page.tsx
src/components/activities/activity-form.tsx
src/components/auth/login-form.tsx
src/components/clients/client-form.tsx
src/components/clients/contact-form.tsx
src/components/deals/deal-form.tsx
src/components/deals/stage-control.tsx
src/components/settings/theme-control.tsx
src/components/shell/app-shell.tsx
src/components/shell/logout-button.tsx
src/components/tasks/task-form.tsx
src/components/tasks/task-status-control.tsx
src/components/team/assignment-transfer-control.tsx
src/components/team/assignment-transfer-utils.ts
src/components/team/member-responsibilities.tsx
src/components/team/member-role-control.tsx
src/components/ui/button.tsx
src/components/ui/field.tsx
src/components/ui/focus-visible-scroll-region.tsx
src/components/ui/page-heading.tsx
src/components/ui/status-badge.tsx
src/components/zod-csp-provider.tsx
src/db/index.ts
src/db/migrations/0000_initial.sql
src/db/migrations/0001_organization_owner_guard.sql
src/db/migrations/0002_organization_creation_owner_required.sql
src/db/migrations/0003_member_assignment_integrity.sql
src/db/migrations/0004_member_assignment_integrity_validate.sql
src/db/migrations/0005_task_deal_client_consistency.sql
src/db/migrations/0006_task_deal_client_consistency_validate.sql
src/db/migrations/meta/_journal.json
src/db/schema/auth.ts
src/db/schema/crm.ts
src/db/schema/index.ts
src/db/test-url.ts
src/lib/auth-client.ts
src/lib/auth-http-error-context.ts
src/lib/auth.ts
src/lib/content-security-policy.ts
src/lib/csv.ts
src/lib/deal-linked-tasks-error.ts
src/lib/member-assignment-integrity-error.ts
src/lib/organization-access.ts
src/lib/organization-owner-invariant-error.ts
src/lib/safe-logger.ts
src/lib/utils.ts
src/lib/workspace.ts
src/modules/activities/actions.ts
src/modules/clients/actions.ts
src/modules/clients/archive-rules.ts
src/modules/clients/contact-actions.ts
src/modules/clients/schema.ts
src/modules/deals/actions.ts
src/modules/tasks/actions.ts
src/modules/team/actions.ts
src/modules/team/member-role-service.ts
src/modules/team/permissions.ts
src/modules/workspaces/actions.ts
src/proxy.ts
tests/e2e/accessibility-forms.spec.ts
tests/e2e/contacts-activities-archive.spec.ts
tests/e2e/crm-core-flows.spec.ts
tests/e2e/multitenant-security.spec.ts
tests/e2e/pipeline-listing-filters.spec.ts
tests/e2e/sec-01b-security-headers.spec.ts
tests/e2e/team-assignment-transfer.spec.ts
tests/e2e/team-role-rbac.spec.ts
tests/e2e/ux-visual-audit.spec.ts
tests/helpers/e2e-auth.ts
tests/helpers/team-rbac-fixture.ts
tests/helpers/test-db.ts
tests/integration/bootstrap-organization-transaction.test.ts
tests/integration/client-archive-integrity.test.ts
tests/integration/client-owner-reassignment.test.ts
tests/integration/deal-owner-reassignment.test.ts
tests/integration/member-assignment-integrity.test.ts
tests/integration/member-assignment-transfer-better-auth.test.ts
tests/integration/member-assignment-transfer.test.ts
tests/integration/multitenant-isolation.test.ts
tests/integration/organization-creation-owner-invariant.test.ts
tests/integration/organization-deletion-disabled.test.ts
tests/integration/organization-last-owner-concurrency.test.ts
tests/integration/reassignment-actions-better-auth.test.ts
tests/integration/sec-01b-audit-workspace.test.ts
tests/integration/sec-01b-rate-limit.test.ts
tests/integration/task-assignee-reassignment.test.ts
tests/integration/task-deal-client-integrity.test.ts
tests/integration/team-assignment-summary.test.ts
tests/integration/team-member-leave-protection.test.ts
tests/integration/team-member-removal-protection.test.ts
tests/integration/team-role-rbac.test.ts
tests/unit/actions/archive-client-rules.test.ts
tests/unit/actions/team-role-authorization.test.ts
tests/unit/actions/team-role-endpoint.test.ts
tests/unit/actions/team-role-policy.test.ts
tests/unit/actions/workspace-api-errors.test.ts
tests/unit/components/assignment-transfer-utils.test.ts
tests/unit/helpers/test-db.test.ts
tests/unit/lib/deal-linked-tasks-error.test.ts
tests/unit/lib/member-assignment-integrity-error.test.ts
tests/unit/lib/organization-owner-invariant-error.test.ts
tests/unit/schemas/client-schema.test.ts
tests/unit/schemas/deal-schema.test.ts
tests/unit/schemas/task-schema.test.ts
tests/unit/security/content-security-policy.test.ts
tests/unit/security/sec-01b-logging.test.ts
tests/unit/utils/csv.test.ts
tests/unit/utils/formatters.test.ts
tsconfig.json
vitest.config.ts
vitest.integration.config.ts
```

Relatórios SEC-01/SEC-02, `DEPLOY-01/02`, propostas antigas `docs/database-model.md` e `docs/security-model.md`, ADR inicial ainda com texto de validação pendente, relatórios em `docs/database/`, `docs/sql/`, base local `docs/knowledge/`, validações antigas, PRD, UX/design e roadmap continuam no disco, mas são recomendados fora do commit inicial. Revisar futuramente e selecionar documentos necessários individualmente; não usar `git add .`.

### Procedimento de staging e commit após autorização

Revisar a allowlist acima, então adicionar apenas os caminhos enumerados (`git add -- <caminhos>`), conferir `git diff --cached --check`, `git diff --cached --stat` e revisar integralmente `git diff --cached`. Só após aprovação explícita do responsável executar `git commit`. Este relatório não autoriza commit, remote, push ou criação de repositório.

## Segurança

- `.env.local` não foi aberto. Nenhum valor de credencial foi impresso.
- Triagem automatizada de padrões fortes nos 173 candidatos (excluindo `.env.local`) gerou cinco correspondências: `.env.example`, `drizzle.config.ts`, `scripts/render-build.sh`, `tests/integration/sec-01b-rate-limit.test.ts` e `tests/unit/helpers/test-db.test.ts`. A revisão classificou-as como placeholders, URL sintética inválida de build ou fixture de teste; nenhuma chave privada ou token de provedor foi encontrada. Uma URL literal de teste inferida pelo checker foi sanitizada no catálogo. Três logs ignorados em `artifacts/diagnostics/` também foram examinados por padrões e não apresentaram correspondência.
- Não foram detectadas chaves privadas, tokens de provedor ou credenciais reais pelos padrões utilizados. A triagem é heurística e não substitui revisão humana.
- Arquivos a revisar manualmente antes do commit: `.env.example` (somente placeholders), script de build e configurações Drizzle (sentinelas sintéticas), migrations SQL e fixtures de testes (dados artificiais). Conferir que secrets reais não foram inseridos localmente desde a inspeção.
- Artefatos ignorados observados: logs em `artifacts/diagnostics/`, `package.json.bak`, `tsconfig.tsbuildinfo`, `.next/`, `node_modules/`, `test-results/`, `.env.local`. Permanecem locais. Não houve limpeza.
- Symlink compartilhado `.agents/skills/engineering-knowledge` e symlinks gerados em `.next/` foram identificados; não foram seguidos para inventariar conteúdo externo nem incluídos na allowlist.

## Validações

| Verificação | Resultado nesta etapa |
|---|---|
| TypeScript AST/checker | 134 arquivos analisados; 1626 funções/callbacks, 3094 variáveis, 1231 parâmetros e 759 propriedades catalogados. |
| `distrobox enter laboratorio-node -- npm run typecheck` | Aprovado; exit 0. |
| `distrobox enter laboratorio-node -- npm run lint` | Aprovado; exit 0. |
| `distrobox enter laboratorio-node -- npm test` | Aprovado; 17 arquivos e 107 testes passaram; sem acesso ao banco. Vite mostrou aviso de compatibilidade futura para `configLoader: native`, sem impacto no resultado. |
| Integração / E2E | Não executar nesta revisão documental: integrações podem requerer banco descartável e E2E browser/serviço. DEPLOY-02 registra 195 integração aprovados e 35 ignorados; esse resultado é histórico. SEC-02 registra E2E anterior, sem repetição agora. |
| Build | Não repetido: nenhuma fonte executável nem configuração de build foi alterada. DEPLOY-02 registrou build aprovado com configuração sintética isolada. |
| Links Markdown | 1.817 links internos nos documentos criados/atualizados; zero caminhos quebrados. |
| Ignore/estado | Checagem não destrutiva; sem staging e zero arquivos rastreados. |
| Segredos | Heurística sanitizada; nenhum segredo real impresso. Revisão humana permanece necessária. |

## Arquivos modificados nesta etapa

`README.md`, `.gitignore`, `docs/architecture.md`; novos arquivos em `docs/README.md`, `docs/architecture/`, `docs/reference/`, `docs/guides/` e este relatório. Nenhum fonte de aplicação, teste, migration, configuração de runtime ou funcionalidade foi alterada.

## Recursos temporários

Não foram criados containers, bancos, serviços, remotes ou listeners. Arquivos temporários do inventário AST e scripts de geração foram gravados em `/tmp`; nenhum recurso externo foi criado. Nenhuma limpeza de diretórios existentes foi feita. Não foram executadas migrations.

## Próximos passos

1. Revisar manualmente o relatório e a allowlist de 173 caminhos; ajustar exclusões caso exista documento que o responsável queira versionar.
2. Após aprovação, criar repositório privado no provedor escolhido sem iniciar push automático, conferir política de acesso e branch protegida.
3. Fazer o primeiro commit local somente depois de aprovação explícita; revisar o staged diff e validar que instruções de agentes e arquivos `.env*` não aparecem.
4. Publicar o código somente após autorização distinta e configuração de repository privado.
5. Criar Neon/Render apenas com autorização própria; conferir limites Free e custo, executar migrations apenas no banco novo autorizado, gerar secrets diretamente no gerenciador e manter deploy manual.
6. Executar checklist pós-deploy em DEPLOY-01, usando usuário/dados sintéticos, e manter G-11/G-15 parcialmente validados até evidência específica.
7. Não declarar o CRM pronto para produção comercial.
