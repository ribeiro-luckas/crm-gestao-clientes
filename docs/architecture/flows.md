# Fluxos implementados

Esta descrição resume os caminhos confirmados no código-fonte atual. A lista de funções, assinaturas e localizações está na [referência de funções](../reference/index.md). Os testes relacionados são indicados por seus arquivos em `tests/`.

## Login, sessão e logout

1. `src/app/(auth)/login/page.tsx` renderiza `LoginForm`.
2. `src/components/auth/login-form.tsx` chama o cliente de Better Auth (`src/lib/auth-client.ts`) com as credenciais fornecidas.
3. Better Auth atende `/api/auth/[...all]`, valida credenciais e mantém sessão persistida no PostgreSQL por Drizzle. Em produção, `src/lib/auth.ts` define cookie seguro e a origem permitida por `BETTER_AUTH_URL`.
4. O layout autenticado e `requireWorkspace*` em `src/lib/workspace.ts` consultam sessão e associação organizacional; páginas sem sessão redirecionam para login e APIs/actions retornam falha controlada.
5. `LogoutButton` encerra sessão via cliente Better Auth.

Falhas de autenticação passam pelo adaptador sanitizado em `auth-http-error-context.ts` e pelo logger seguro. Cobertura: `tests/e2e/crm-core-flows.spec.ts`, `tests/integration/sec-01b-audit-workspace.test.ts`, `tests/integration/sec-01b-rate-limit.test.ts` e testes unitários de logging/API conforme referências.

## Seleção de workspace e isolamento

`src/modules/workspaces/actions.ts` recebe o identificador solicitado, mas consulta membership do usuário autenticado antes de chamar `setActiveOrganization`. `src/lib/workspace.ts` deriva organização ativa e papel da sessão/associação; se necessário exige escolha. Operações CRM aplicam essa organização em todas as consultas/mutations; constraints compostas de PostgreSQL impedem combinações entre organizações mesmo se houver bug na camada de aplicação. Testes: `multitenant-isolation`, `workspace-api-errors` e `multitenant-security`.

## Primeiro OWNER (bootstrap)

`scripts/bootstrap-owner.ts` lê variáveis de bootstrap, valida formato e exige que tabelas de usuário, organização e membership estejam vazias. Adquire advisory lock, cria o usuário via Better Auth em modo bootstrap, cria organização/OWNER por `scripts/lib/bootstrap-organization.ts`, verifica membership e libera o lock. Em falha, não remove registros parciais automaticamente e não expõe erro/segredo; por isso a operação requer intervenção autorizada. Não foi executada nesta revisão. Testes de integração incluem bootstrap transacional, criação com owner e invariantes.

## Clientes e contatos

As ações de `src/modules/clients/actions.ts` validam payload com schemas, exigem papel do workspace e limitam seleção por organização. Criação/edição/reatribuição/arquivamento usam transação e gravam auditoria. Arquivamento verifica vínculos ativos usando `archive-rules.ts`. `contact-actions.ts` exige cliente ativo do mesmo workspace e grava contato/auditoria na mesma transação. Testes: `client-archive-integrity`, reassignment, unitários de schema e E2E de contatos/arquivamento.

## Oportunidades, tarefas e atividades

`src/modules/deals/actions.ts` valida valor/estágio/cliente, usa organização da sessão, preserva relação cliente-oportunidade e audita mutations em transação. Mudança para perdido exige motivo; mudanças para estados finais registram fechamento conforme a ação. `src/modules/tasks/actions.ts` valida status, responsável e associações permitidas a cliente/negócio; migrations reforçam consistência deal-client. `src/modules/activities/actions.ts` grava atividades relacionadas e auditoria. Testes incluem suites de integridade, reassignment e fluxos E2E.

## Equipe, permissões e transferência

`src/modules/team/permissions.ts` centraliza política de papéis. `member-role-service.ts` bloqueia alteração do próprio papel e do OWNER alvo, confirma ator OWNER dentro da transação e registra auditoria. `team/actions.ts` agrega resumo e transfere atribuições em ordem determinística e transação, com verificações de integridade antes de concluir. Better Auth hooks protegem mudanças/saída da organização. Testes cobrem RBAC, saída/remoção, concorrência e transferência.

## Exportação CSV

Route handlers `src/app/api/export/{clients,deals}.csv/route.ts` exigem workspace autenticado, consultam somente registros da organização ativa e retornam CSV via `src/lib/csv.ts`. Os testes E2E de pipeline/core e `tests/unit/utils/csv.test.ts` cobrem comportamento e formatação. A exportação segue a autorização do endpoint; não deve ser tratada como dado público.

## CSP e logging

Para GET/HEAD de documento, `src/proxy.ts` gera nonce, cria cabeçalho CSP por `buildContentSecurityPolicy` e encaminha nonce ao Next.js. Em produção retorna CSP enforced; desenvolvimento usa report-only. Cabeçalhos básicos estão em `next.config.ts`. `safe-logger.ts` emite JSON com campos allowlisted, UUID de correlação validado e resumo limitado de erro; mensagens arbitrárias e conteúdo de exceção não são registradas.

## Cobertura e limites

Os cenários acima se relacionam aos testes nomeados; a existência do teste não implica que foi repetido nesta revisão. Resultados históricos e skips atuais devem ser consultados nos relatórios de validação datados. Convites de equipe não enviam email sem provedor configurado; cadastro público permanece desabilitado. G-11/G-15 não são declarados concluídos.
