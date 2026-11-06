# SEC-01A — Inventário da superfície de ataque

O inventário resume os entry points observados no código; não afirma teste dinâmico. Os controles de página/layout não substituem autorização em cada Server Action/API.

## Rotas de navegação

| Caminho / arquivos | Operação e dados | Auth / escopo observado | Validação / efeito | Testes e lacunas |
|---|---|---|---|---|
| `/`, `/login` — `src/app/page.tsx`, `(auth)/login/page.tsx` | Redirect e autenticação Better Auth | Login público; layout autenticado obtém contexto | Better Auth email/password | E2E auth UX existentes; rate limit da versão revisado estaticamente, sem carga |
| `/dashboard` — `(app)/dashboard/page.tsx` | Agregados comerciais | `getWorkspaceContext`; predicates org para consultas | filtros/estágios fixos | multi-tenant E2E positivo A vs ausência B; faltam agregados com usuário multiorg/session inválida |
| `/clients`, `/clients/[id]`, `/clients/new`, `/clients/[id]/edit` | Leitura de clientes/contatos/deals/atividades; edição | Layout autenticado; queries por org + id | parâmetros q/status/page; limites e schema revisar 01B; forms Server Actions | E2E core/archive; cobertura adversarial por ID parcialmente presente |
| `/deals`, `/deals/[id]`, `/deals/new`, `/deals/[id]/edit` | Pipeline e detalhes | context de workspace; queries usam org e joins incluem org | stage/filter/query; mutation Zod e enum | E2E pipeline; testar IDs de outro tenant em cada action |
| `/tasks`, `/tasks/new` | Leitura/criação/status/assignment | workspace; listas scoped; role owner para reassignment | Zod/status/datas; limite de lista 100 | core e transfer; falta matriz por ação e IDs cross-tenant completa |
| `/activities` | Leitura por organização | context e predicates org | query/filter e máximo 100 | contacts/activities; revisar limite/encoding adversarial |
| `/search` | Busca em clients/deals/tasks | context; toda query filtrada por organization; deal-client join inclui org | query `q`, limit 8 por entidade | E2E tenant A vs B; wildcard ILIKE sem SQL concat manual |
| `/team` | Lista membros e convites informativos | workspace; query member scoped; controles OWNER condicionais na UI | mutation independente protegida no servidor | RBAC e assignment tests; UI hide não é controle de autorização |
| `/settings`, `/help` | Preferências/informação (sem mutation sensível encontrada) | layout autenticado | configuração de exibição | falta teste negativo específico por rota |

## Server Actions (`'use server'`)

| Action | Dados / efeito | Papel e escopo de servidor observado | Validação / transação / auditoria | Teste |
|---|---|---|---|---|
| `clients/actions.ts:createClient` | cria cliente | todos os papéis CRM; org/actor da sessão | schema Zod; transação create+audit | schema/core/integration |
| `updateClient` | edita cliente | todos; ID+org+não arquivado | UUID/schema; update e audit transacionais | core/integration, lacuna cross-tenant direta |
| `reassignClientOwner` | altera assignment | OWNER; cliente e novo membro scoped; locks | Zod; transação update+audit | integration Better Auth |
| `archiveClient` | soft delete cliente | OWNER/ADMIN; ID+org+não arquivado | UUID; valida contactos/deals/tasks; locks; audit transaction | archive/integration |
| `contact-actions.ts:createContact` | cria contato de empresa | todos; cliente company/org/ativo | schema; transação create+audit | contacts E2E |
| `deals/actions.ts:createDeal` | cria oportunidade | todos; cliente org/ativo | schema; lock; audit transaction | core/pipeline |
| `updateDeal` | edita oportunidade | todos; deal/client scoped | schema, locks de deal/client; transaction+audit | core/pipeline; IDs adversariais faltam por ação |
| `updateDealStage` | altera etapa/perda/fechamento | todos; deal/client scoped | enum/razão; locks; transaction+audit | pipeline E2E/unit |
| `reassignDealOwner` | troca owner | OWNER; deal/membro scoped | schema; lock; transaction+audit | integration Better Auth |
| `tasks/actions.ts:createTask` | cria tarefa/relacionamentos | todos; org/owner inferidos; deal/client scoped | schema, locks, transaction+audit | core/integration |
| `setTaskStatus` | atualiza status | todos; task/deal/client scoped | enum, locks, transaction+audit | unit/integration; direct cross-tenant gap |
| `reassignTaskAssignee` | troca responsável | OWNER; task/membro scoped | schema; locks; transaction+audit | task reassignment integration |
| `activities/actions.ts:createActivity` | cria histórico | todos; actor da sessão; pais scoped | schema, locks; transaction+audit | contacts/activities |
| `team/actions.ts:getMemberAssignmentSummary` | consulta PII e contagens de assignments | OWNER; revalida membership `FOR SHARE`; todas as queries com org | read-only repeatable read | unit/integration; sessão removida concorrente |
| `updateMemberRole` | eleva/rebaixa ADMIN/MEMBER | OWNER; target por membership id + org | allowlist; Better Auth e depois audit não atômico | unit, integração handler real, E2E |
| `transferMemberAssignments` | move/unassign tasks/deals/clients | OWNER; transação, locks ordenados, membership origem/destino no org | input Zod, lotes, audit no mesmo tx, verifica pendências | integration/E2E; concorrência stress pendente |

## Route Handlers / APIs

| Método/caminho | Auth, papel, tenant | Dados/validação/efeito | Teste / lacuna |
|---|---|---|---|
| `GET, POST /api/auth/[...all]` | Better Auth; wrapper especial em remove/leave e update-member-role | Auth routes; `POST` de alteração de papel valida JSON, sessão, active org, ator OWNER, target no org, self/OWNER; leave/remove mapeia constraints | integration/unit RBAC e invariantes; endpoints restantes da biblioteca exigem matriz por operação |
| `GET /api/export/clients.csv` | sessão + owner/admin; workspace da sessão | q max 120; filtros; ativos; 5000; campos selecionados; CSV sanitizado; audit insert; private no-store | E2E owner/admin, MEMBER e anônimo; falta request adversarial de query, taxa/CSV spreadsheet |
| `GET /api/export/deals.csv` | idem | scoped; join inclui org; estágio enum; client/deal ativos; 5000; CSV; audit | idem |

## Configuração, persistência e trust boundaries

- `src/lib/auth.ts`: Better Auth 1.7.14, Drizzle adapter, password bounds 12–128, signup disabled fora de bootstrap, session cookie secure condicionado a `NODE_ENV=production`, trusted origin derivada de `BETTER_AUTH_URL` ou localhost, hooks Organization/OWNER. Não configura expiração/cache de sessão explicitamente; os defaults do pacote instalado são 7 dias (`expiresIn=604800`), refresh age 1 dia (`updateAge=86400`) e cookie cache desabilitado para essa configuração stateful. Password reset revoga sessões (`revokeSessionsOnPasswordReset: true`). Valores observados em `node_modules/better-auth/dist` para a versão instalada; resposta Set-Cookie não observada.
- `src/lib/workspace.ts`: sessão Better Auth consultada no servidor e memberships lidas do banco em cada request; role vem de membership atual; fallback de workspace descrito em F003.
- `src/db/index.ts`, `src/db/test-url.ts`: runtime normal lê `DATABASE_URL`; modo teste exige `TEST_DATABASE_URL` e valida protocolo/loopback/porta/db/usuário/senha. Playwright valida URL antes de subir servidor e injeta URL validada nas duas variáveis. Nenhuma conexão foi aberta nesta auditoria.
- `src/db/schema/auth.ts`, `crm.ts`, migrations `0000`–`0006`: tabelas auth e dados CRM; owner invariant, M-01 e consistência deal-task usam constraints/triggers; não há política RLS identificada na revisão.
- `next.config.ts`: `poweredByHeader:false`, sem config de security headers no app. Ingress/edge não fornecido.
- `.env.example`: contém placeholders de DATABASE_URL, Better Auth secret e URL; `.env.local` não foi lido. Nenhum `NEXT_PUBLIC_*` apareceu na busca de código/configuração examinada.
- Não foi identificado `middleware.ts` ou `proxy.ts` na árvore `src` examinada.

**Acompanhamento SEC-01C.3.1:** `src/proxy.ts` agora contém a política CSP Report-Only para documentos; o Proxy foi colocado no mesmo nível de `src/app` conforme a convenção do Next.js. A captura HTTP após essa mudança permanece pendente.
- `scripts/bootstrap-owner.ts`: comando operacional não-HTTP que exige variáveis CRM_OWNER_*, advisory lock e tabelas user/org/member vazias; `createBootstrapOrganizationWithOwner` usa transação. Não foi executado. `scripts/debug-migrate.mjs` carrega configuração local e roda migrations usando `DATABASE_URL`; é ferramenta de escrita de alto impacto e não foi executada. Deve ficar restrita a workflow de manutenção autorizado.

## Queries, entradas e saídas

- Toda mutation CRM examinada deriva organização e ator de contexto do servidor, usa Zod em payloads (`unknown` na fronteira) e escopa leitura/update/delete por organização; relacionamentos são validados antes de escrita. O ORM gera queries parametrizadas; `sql.raw` e SQL manual runtime não foram localizados no escopo pesquisado. SQL manual existe em migrations/testes, não em actions de produção.
- Entradas externas incluem formulário/action payloads, IDs, query strings (`q`, filtros, paginação), JSON Better Auth e headers/cookies. Validar limites de tamanho, Unicode, page offset e frequência na SEC-01B; os exemplos `page` em clients são parseados para inteiro sem limite superior antes de compor offset.
- Saídas sensíveis incluem dados de clientes, contatos, atividades, relacionamentos, agregados, membros (nome/email/role), detalhes de assignment, sessões/auth e CSV. RSC não significa conteúdo público; verificar resposta e cache privado em runtime.
- Auditoria usa tabela `audit_logs` org-scoped por consultas; mudanças comerciais geralmente inserem evento na mesma transação, exceção F001; alteração role e exports não são transacionais com leitura/resposta.
