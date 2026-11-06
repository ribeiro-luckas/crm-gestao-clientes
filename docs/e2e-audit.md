# Auditoria E2E funcional — CRM

## Escopo desta revisão

Esta matriz registra funcionalidades existentes, limites de interface e cobertura para contatos, atividades, arquivamento, Kanban, estágios, filtros, paginação, pesquisa e ordenação. O baseline anterior informado para E2E-02 foi 31 testes E2E aprovados, 225 de integração e 91 unitários. Os cenários acrescentados em E2E-03 foram preparados antes da validação atual descrita abaixo.

## Execução atual — 2026-11-05

- `npm run test:e2e`: **49/49 aprovados** após corrigir um locator de teste que tentava buscar numa única string o número dentro de `<strong>` e o rótulo em outro nó. O valor do contador e a frase foram verificados separadamente. Não houve alteração na aplicação.
- E2E autenticado temporário em build de produção: **1/1 aprovado** sob CSP enforced, cobrindo login/logout, cliente criar/editar, contato criar, oportunidade criar/editar e tarefa criar/concluir, com Light/Dark, reload e redirects. O harness foi removido após a execução; resultados detalhados estão em [THEME-001](knowledge/incidents/theme-001.md).
- Typecheck e build de produção aprovados. Unitários, ESLint e integração PostgreSQL não foram executados nesta rodada.
- A execução E2E integral não teve casos ignorados ou não executados. A primeira execução teve 48/49; o único caso reprovado foi reproduzido isoladamente e passou após o ajuste do locator, antes da suíte final 49/49.

### Ambiente Playwright

- `playwright.config.ts` valida `TEST_DATABASE_URL` ao carregar a configuração e só aceita `127.0.0.1:5433/crm_test_isolated`, usuário `crm_test_admin` e senha não vazia. A configuração aborta se essa validação falhar; não usa `DATABASE_URL` como origem do destino de teste.
- O servidor Next é iniciado em `127.0.0.1:3100`, `NODE_ENV=test`, `CRM_TEST_MODE=1`, e recebe a URL já validada para as variáveis de conexão.
- As fixtures E2E criam organizações e identidades exclusivas via `seedTeamRbacFixture`; o cleanup apaga primeiro dependências comerciais/auditoria por `organizationId`, depois chama o cleanup da fixture e verifica resíduos.
- Login ocorre pelo endpoint Better Auth ou interface, apenas com credenciais geradas para a fixture. Não há dependência de SMTP.
- Nesta revisão `TEST_DATABASE_URL` não estava presente no executor; não foi aberta conexão, nem executado PostgreSQL/E2E. O baseline acima é o estado informado antes dos novos cenários, não uma validação desta revisão.

## Matriz de cobertura

| Recurso | Rota / Server Action | Operações realmente existentes | Permissões | Unitário | Integração PostgreSQL | E2E existente / execução atual | Lacuna, risco, prioridade e classificação |
|---|---|---|---|---|---|---|---|
| Contatos | `/clients/[id]`; `createContact` em `src/modules/clients/contact-actions.ts` | Criar contato para empresa ativa; listar contatos não arquivados no perfil da empresa. Sem editar, excluir ou arquivar contato. Pessoas físicas não exibem formulário/contatos. | OWNER, ADMIN e MEMBER; action deriva a organização da sessão e aceita somente cliente do mesmo workspace, `kind=company` e ativo. | Nenhum teste unitário específico encontrado. | `multitenant-isolation.test.ts` rejeita associação cross-tenant pela action e FK; `client-archive-integrity.test.ts` bloqueia arquivamento com contatos ativos e cobre concorrência de criação. | `contacts-activities-archive.spec.ts`: criação e vínculo/auditoria, validação de nome obrigatório e leitura cross-tenant (executado na suíte 49/49). | **IMPLEMENTADO E COBERTO POR E2E** para criação/leitura. Editar/excluir/recuperar contato não implementado. FK composta garante mesmo tenant, mas tipo empresa/estado ativo é regra da action. Prioridade P1. |
| Atividades comerciais | Perfil `/clients/[id]`, `/deals/[id]`, `/activities`; `createActivity` em `src/modules/activities/actions.ts` | Criar ligação, reunião, e-mail, nota ou acompanhamento associado a cliente ou oportunidade; mostrar histórico no perfil e página global; pesquisa por assunto, texto, cliente ou oportunidade; ordenação por `occurredAt` descendente. Sem editar/excluir. | OWNER, ADMIN e MEMBER; organização e autor são derivados da sessão; pai deve ser válido/ativo no workspace; vínculo oportunidade/cliente precisa corresponder. | Nenhum teste unitário específico da action encontrado. | `multitenant-isolation.test.ts` cobre tentativa de associação cross-tenant; `client-archive-integrity.test.ts` cobre histórico preservado e rejeição de novas atividades em clientes arquivados; testes de membership verificam histórico após saída. | `contacts-activities-archive.spec.ts`: validação sem persistência, criação, timeline, autor/tenant/parent, auditoria separada, pesquisa e leitura sem vazamento cross-tenant (executado na suíte 49/49). | **IMPLEMENTADO E COBERTO POR E2E** para criação/leitura. `actorUserId` é persistido e auditável, mas não é mostrado na interface. O schema tem `taskId` opcional, porém a action/form atual só aceita cliente/oportunidade. Sem edição/remoção. Prioridade P1. |
| Arquivamento de clientes | `archiveClient` em `src/modules/clients/actions.ts`; listagem `/clients`, busca `/search`, detalhe `/clients/[id]` | A action define `deletedAt` e `updatedAt`, grava `audit_logs` atomicamente e revalida telas. Bloqueia clientes com contatos ativos, oportunidades abertas ou tarefas pendentes; histórico de atividades não bloqueia. Listagem, busca e detalhe filtram arquivados. | Somente OWNER e ADMIN; consulta e escrita escopadas à organização da sessão e bloqueio transacional do cliente. | `archive-client-rules.test.ts` cobre regra pura. | `client-archive-integrity.test.ts` cobre dependências, histórico, rejeições e concorrência entre archive/criação. | `contacts-activities-archive.spec.ts` prepara leitura de fixture arquivada: oculta listagem/busca/detalhe e preserva contato/histórico no banco. Não chama `archiveClient` via UI porque não existe controle de interface. | **IMPLEMENTADO PARCIALMENTE**: action existe e é coberta por testes unitários/integração, mas não há botão/fluxo de arquivamento no CRM. Não há lista de arquivados nem `restoreClient`/recuperação. A recuperação e exposição da action na UI requerem decisão de produto; não adicionar controles nesta fase. Prioridade P1. |
| Auditoria de operações | Inserts em `audit_logs` dentro de actions; não confundir com `activities` | Registro técnico de create/update/archive e outras mudanças relevantes. Não é a timeline comercial. | Mesmo contexto de organização/autor da operação; transação junto da alteração. | Cobertura indireta de regras/formatos; nenhum E2E específico geral. | Verificada em testes de actions comerciais, archive e proteção de membros. | Novos cenários conferem auditoria de criação de contato/atividade e ausência de auditoria em validação recusada (executados na suíte 49/49). | **IMPLEMENTADO E TESTADO** em integrações e E2E de escopo funcional; preservar distinção entre histórico comercial e auditoria. Prioridade P1. |

## Matriz de listagens e pipeline (E2E-03)

| Recurso | Rota / ação | Comportamento confirmado no código | Parâmetros e regras | Unitário / integração / E2E antes desta fase | Cobertura implementada nesta fase | Lacuna, risco, prioridade e classificação |
|---|---|---|---|---|---|---|
| Pipeline de oportunidades | `/deals`; `updateDealStage` em `src/modules/deals/actions.ts`; `StageControl` | Kanban visual com seis colunas. Cada card também tem controle de seleção de etapa; não há drag-and-drop. Ganho/perda define `closedAt`; perda exige motivo; action grava `stage_change` no mesmo fluxo transacional. Os labels de etapa e motivo agora estão associados a IDs únicos por oportunidade. | Lista aceita `q` (título/cliente) e `stage`; combinação é suportada. Etapa inválida é ignorada, resultando em todas as etapas. Cards ordenados por `expectedCloseAt ASC`. OWNER, ADMIN e MEMBER são autorizados pela action; sessão ausente ou sem workspace é rejeitada pelo contexto. | Unitário: schemas cobrem enum/regra de estágio, sem teste específico da action. Integração: não foi encontrado teste dedicado a `updateDealStage`/listagem. E2E: core cobre criar/editar oportunidade; a transição de estágio, filtros e ordenação passaram em `pipeline-listing-filters.spec.ts` (suíte 49/49). | `pipeline-listing-filters.spec.ts`: perda sem motivo não altera deal/auditoria; mudança válida por teclado, persistência após reload, perda válida com motivo e auditoria; filtro `q+stage`, ordem por previsão distinta, valor inválido e estado vazio. Inclui rota privada e leitura cross-tenant. | **IMPLEMENTADO E COBERTO POR E2E** para as jornadas enumeradas. Ordenação não desempata previsões iguais. Não há drag-and-drop; decisão de produto se esperado para o MVP. Prioridade P0 para mudança de estágio e P1 para filtro/ordenação. |
| Listagem de clientes | `/clients` | Pesquisa por nome/e-mail/telefone, filtro de status, total filtrado, páginas de 20, links anterior/próxima. Ordena `updatedAt DESC`. | `q`, `status` (`active`, `prospect`, `inactive`) e `page` são combináveis. Status inválido é ignorado. Página não numérica ou menor que 1 volta à página 1. Página acima do total não é limitada pelo servidor. | Unitário: schema de cliente, sem teste da consulta/paginação. Integração: há isolamento/CRUD de cliente, mas não foi encontrado teste de paginação/filtros da página. E2E: criação/edição em `crm-core-flows.spec.ts`; sem paginação ou filtros dedicados. | A spec E2E-03 filtra `q+status`, cobre `page` inválida, ordenação por datas distintas, navegação anterior/próxima por teclado, ausência de duplicação e cobertura completa dos 22 IDs. | **IMPLEMENTADO E COBERTO POR E2E** para a listagem. Sem desempate de `updatedAt`; paginação acima do máximo pode exibir uma página vazia e faixa incoerente. Prioridade P1. |
| Listagem de tarefas | `/tasks` | Busca por título/cliente/oportunidade; filtros de vencimento e status; ordenação `dueAt ASC`; máximo de 100 resultados, sem paginação. | `q`, `filter` (`all`, `overdue`, `upcoming`) e `status` (`all`, `todo`, `in_progress`, `done`, `canceled`) podem ser combinados. `overdue` exclui done/canceled; `upcoming` exclui done/canceled. | Unitário: schema de tarefa e status; integração cobre actions e isolamento, não a consulta da listagem. E2E: criação/conclusão e pesquisa global já existentes; sem filtro/sort da listagem. | A spec E2E-03 cobre combinação de `q+filter+status`, ordenação com vencimentos distintos, estado vazio e exclusão de tarefa de tenant B. | **IMPLEMENTADO E COBERTO POR E2E** para a listagem. O contador visual `total` é calculado apenas por workspace/arquivamento e não aplica os filtros, enquanto as linhas aplicam; isso produz diferença visível quando a consulta é filtrada. Sem desempate de datas iguais. Confirmar a semântica desejada para o contador. Prioridade P1. |
| Pesquisa global | `/search` | Pesquisa clientes, oportunidades e tarefas isoladamente no workspace; até oito por categoria. Clientes ordenam por nome ASC; oportunidades por `updatedAt` (ASC implícito do Drizzle/PostgreSQL); tarefas por `dueAt ASC`. | `q` é trimado, cortado em 120 caracteres e só consulta quando contém pelo menos dois caracteres. Não há controle de ordenação, filtro ou paginação na interface. | Integração cobre isolamento de pesquisa; E2E existente em `multitenant-security.spec.ts` verifica resultados A/B para query conhecida. Não achei teste para limite de 120 ou mínimo de 2. | A spec E2E-03 verifica query cross-tenant sem resultado e busca menor que dois caracteres; os filtros de oportunidades também exercitam busca por título. | **IMPLEMENTADO E TESTADO** parcialmente; novas verificações executadas na suíte 49/49. Sem paginação/controle de ordenação; limites são parte do contrato atual. Prioridade P1. |
| Ordenação de resultados | `/clients`, `/deals`, `/tasks`, `/activities`, `/search` | Ordenação fixa na consulta, sem controles para o usuário: clientes por atualização descendente; Kanban por fechamento previsto ascendente; tarefas por vencimento ascendente; atividades por ocorrência descendente; pesquisa segue nome/atualização/vencimento por categoria. | Parâmetros de URL não permitem escolher ordenação. Não há tie-breaker por ID nas consultas observadas de clientes, oportunidades, tarefas ou atividades. | Sem unitários/E2E dedicados à ordenação; testes existentes de página não verificam ordem. | Cenários executados usaram timestamps distintos e verificam apenas as ordenações claramente apresentadas no código (previsão de oportunidade, atualização de cliente e vencimento de tarefa). | **IMPLEMENTADO SEM TESTE E2E** dedicado. Empates podem mudar de posição entre consultas; adicionar desempate estável é melhoria técnica, sem alterar critério primário. Prioridade P2. |

## Cenários cobertos pelas specs desta fase

`tests/e2e/contacts-activities-archive.spec.ts` cobre:

1. OWNER cria contato pela interface; valida vínculo, organização e auditoria com autor correto.
2. Nome de contato obrigatório é validado sem inserir contato nem auditoria.
3. Atividade inválida não é persistida; atividade válida aparece na timeline e em `/activities`, com organização, autor e cliente verificados no banco e auditoria distinta.
4. Cliente/contato arquivados não aparecem em listagem, busca ou detalhe; a atividade histórica e os registros arquivados permanecem persistidos.
5. Contato e atividade de outra organização não aparecem para OWNER do tenant A, e detalhe do cliente B retorna 404.

Os cenários não criam interface de recuperação nem invocam uma Server Action diretamente fora do fluxo público. A proteção de tentativa cross-tenant na escrita continua provada pela suíte de integração existente; a nova E2E cobre a leitura e exibição.

`tests/e2e/pipeline-listing-filters.spec.ts` cobre cinco cenários:

1. Bloqueio de estágio perdido sem motivo, transição válida acionada por teclado, auditoria e persistência após reload.
2. Kanban com filtro combinado, ordenação por datas distintas, etapa inválida ignorada, colunas vazias e busca global cross-tenant.
3. Filtro combinado de clientes, página inválida, ordem de atualização e paginação por teclado sem repetição ou perda entre 22 resultados.
4. Filtros de tarefas por texto, vencimento e status, ordem por datas e estado vazio.
5. Rota de oportunidade inacessível sem sessão e detalhe cross-tenant retorna 404 sem alterar oportunidade/auditoria.

Não há papel de membro autenticado proibido para atualizar etapa: `updateDealStage` permite OWNER, ADMIN e MEMBER. O cenário de segurança cobre ausência de sessão e isolamento por workspace, não inventa uma restrição de papel inexistente.

## Gaps e decisões

### Defeitos a corrigir

- Corrigida nesta fase a associação dos labels dos controles `StageControl`: a seleção de etapa e o motivo de perda não recebiam `id`, embora o componente de campo conecte `label[for]` ao `id`. Agora os IDs são únicos por oportunidade; não houve mudança na regra de estágios.
- O contador visual em `/tasks` não aplica os mesmos filtros usados nas linhas. O código demonstra divergência potencial; não alterei a aplicação porque não há contrato de produto explícito dizendo se o contador representa resultados filtrados ou o total da carteira.
- `page` acima do número de páginas não é limitado em `/clients`; pode produzir página vazia com faixa incompatível. O caso está documentado e não foi corrigido nesta etapa de cobertura.
- Consultas de listagem usam apenas a ordenação primária sem desempate estável. Datas/horários empatados podem alternar a ordem relativa; os E2E executados usam valores distintos para não afirmar um desempate inexistente.

### Cobertura executada

- E2E de contatos/atividades/arquivamento descritas acima e E2E-03 de estágio, filtros, pesquisa, paginação e ordenação: executados na suíte completa 49/49 em 2026-11-05.

### Funcionalidades ausentes ou parciais que precisam de decisão

- Não há edição/exclusão/recuperação de contatos.
- Arquivamento de cliente tem action protegida, mas não tem controle de interface nem tela de recuperação. Decidir se o MVP deve expor arquivamento e como operadores recuperam registros antes de implementar UI.
- Atividades não expõem visualmente seu autor e não têm edição/exclusão. Isso não foi ampliado nesta fase.
- O modelo suporta `taskId` em `activities`, mas o fluxo atual de criação de atividade não o oferece. Definir se esse vínculo faz parte do produto antes de criar interface.

### Melhorias opcionais posteriores

- Cobrir contatos/atividades por teclado e axe em formulários comerciais, além do E2E de login existente.
- Adicionar tie-breakers estáveis às listagens sem alterar a ordenação primária.
- Definir como contar tarefas com filtros ativos e limitar paginação de clientes ao intervalo existente.
- Adicionar controles de ordenação apenas se houver requisito de produto para ordenação escolhida pelo usuário.
- Planejar recuperação de arquivados com permissões, auditoria e retenção antes de expor a capacidade.

## Segurança e estado de validação

Nenhuma migração, bootstrap, SQL manual ou alteração de dados foi executada nesta revisão. O banco principal e `.env.local` não foram acessados. A spec nova utiliza `createIsolatedConnectionPair()`, que exige e valida `TEST_DATABASE_URL`; sem a variável autorizada, a execução E2E deve ser interrompida. Os testes novos não foram executados neste executor e não devem ser classificados como aprovados.
