# Auditoria UX-01 — responsividade e acessibilidade

## Escopo e evidência

Foi feita revisão de código das rotas e componentes listados abaixo, dos estilos globais, dos estados de formulário e da configuração Playwright. As larguras-alvo são 1440 px, 768 px e 390 px.

Não foi possível fazer inspeção visual no navegador neste executor: `TEST_DATABASE_URL` não está configurada e o servidor local não pôde abrir a porta de desenvolvimento (`listen EPERM`). Nenhuma conexão PostgreSQL foi aberta. Portanto, os resultados anteriores de testes informados no pedido são contexto, não uma nova execução; as observações de layout abaixo são revisão de código, e os novos testes E2E ainda precisam rodar no ambiente com banco isolado autorizado.

Não foram produzidas screenshots. Não houve acesso a dados reais ou sensíveis.

## Páginas e componentes analisados

- Login e formulário de autenticação.
- Dashboard.
- Lista de clientes, criação, edição, detalhes e formulário inline de contato.
- Oportunidades, Kanban, detalhes, criação, edição e controles de etapa.
- Lista e criação de tarefas.
- Atividades e formulário de registro.
- Equipe, alteração de papéis, responsabilidades e diálogo de transferência.
- Pesquisa, configurações e ajuda.
- Shell autenticado, navegação, campos reutilizáveis, tabelas, estados vazios e tema.

## Matriz de problemas e correções

| Severidade | Página / área | Problema comprovado no código | Correção desta fase |
|---|---|---|---|
| Média | Navegação móvel | Em larguras até 820 px, Ajuda e Configurações eram ocultadas junto da sidebar inferior. | Os dois links permanecem acessíveis na navegação compacta; a barra pode quebrar em linhas menores. Rótulos visuais viram ícones em larguras estreitas, mantendo seus nomes acessíveis. |
| Média | Campos, tema claro | Placeholder `#939990` tinha contraste calculado de 2,92:1 sobre branco, abaixo de 4,5:1 para texto normal. | Placeholder passa a usar `--muted`, que mede 4,51:1 no fundo `#fffefa` e 4,55:1 no branco. |
| Média | Kanban | `aria-label` estava em um `div` genérico, sem criar uma região nomeada; o contêiner de rolagem não podia receber foco; os rótulos das etapas não tinham nível de heading; o seletor de etapa tinha 29 px de altura e texto de 8 px. | O contêiner rolável agora é uma região nomeada e focável; as seis colunas têm headings de nível 2 e mantêm suas regiões próprias; seletor tem 40 px e texto de 11 px. A rolagem continua contida. |
| Média | Clientes / paginação | Links marcados `aria-disabled` ainda tinham destino e podiam receber foco/ativação. | Páginas indisponíveis são texto não interativo; links só existem quando a navegação é possível. |
| Média | Equipe / papéis | Mensagens de sucesso e erro ficavam apenas em conteúdo oculto visualmente. | Feedback passou a ser visível; sucesso usa `status` e falha usa `alert`. |
| Baixa | Formulário de contato e atividade | Falhas de servidor usavam `role="status"`, igual ao sucesso. | Falhas usam `alert`; confirmações bem-sucedidas continuam como `status`. |
| Baixa | Sidebar em janela baixa / ampliação | Sidebar fixa não tinha rolagem própria; links inferiores poderiam sair da área visível com pouco espaço vertical. | Sidebar recebe rolagem vertical própria sem alterar o fluxo em telas compactas. Requer confirmação visual/manual com zoom. |

Não foi identificado problema de semântica nas tabelas: permanecem tabelas HTML nativas dentro de contêineres com rolagem horizontal. O Kanban continua com seis etapas e exige rolagem horizontal em telas menores; a mudança não adiciona drag-and-drop nem altera regras comerciais.

## Correções implementadas

- Navegação principal e navegação secundária têm landmarks `<nav>` com nomes próprios; o wrapper visual deixou de criar um landmark complementar redundante.
- Atalhos de Ajuda e Configurações são alcançáveis em viewports compactos.
- Kanban tem landmark nomeado e foco de teclado no contêiner que rola.
- Placeholder usa token de contraste adequado nos temas claro e escuro.
- Paginação desabilitada não é mais anunciada como link acionável.
- Feedback de equipe, contato e atividade distingue visual e semanticamente sucesso e erro.
- Não foram alterados autenticação, autorização, RBAC, ações de servidor, consultas, isolamento por organização ou constraints M-01/I-01.

## Testes adicionados ou ampliados

- Login: verificação de ausência de overflow em 1440, 768 e 390 px.
- Login: axe passa a analisar a página inteira, em vez de somente o formulário.
- Kanban e clientes: teste E2E verifica overflow horizontal da página, acesso por foco às oito rotas da navegação, landmark e seis colunas do Kanban, foco do controle de etapa e semântica da tabela nas três larguras.
- Paginação: verifica que “Anterior” na primeira página não é um link.
- Equipe: verifica que a confirmação de alteração de papel é visível.

Os testes E2E não foram executados neste executor. A configuração existente exige `TEST_DATABASE_URL` validada para o PostgreSQL isolado antes de carregar Playwright.

## Validações desta auditoria

- `npm run typecheck`: aprovado.
- `npm run lint`: aprovado.
- `npm test`: 91 testes unitários aprovados (15 arquivos).
- `git diff --check`: aprovado.
- E2E e regressão completa: não executados, pois `TEST_DATABASE_URL` está ausente e não há destino PostgreSQL isolado disponível neste executor.

Os 91 unitários, 225 de integração, 38 E2E e preflights citados como estado anterior são contexto informado, não resultados desta inspeção visual. As validações locais acima foram executadas separadamente; integração, E2E e preflights não foram executados aqui.

## Lacunas e próxima fase UX

- Executar os testes E2E com o destino `crm_test_isolated` validado e depois a regressão E2E completa.
- Capturar screenshots sem dados reais em 1440, 768 e 390 px para login e rotas autenticadas prioritárias; comparar antes/depois quando houver baseline seguro.
- Fazer revisão manual de teclado e leitor de tela no shell, Kanban, tabelas, formulários, diálogo de transferência e estados de erro.
- Conferir ampliação/reflow até 400%, viewport de baixa altura, contraste dos dois temas e `prefers-reduced-motion` no navegador.
- Confirmar visualmente o comportamento de rolagem horizontal em tabelas e Kanban em celular e tablet.
- Axe automatizado será evidência parcial; não comprova conformidade WCAG 2.2 AA.

## Acompanhamento — marca no login

Uma execução real do axe encontrou uma regressão específica na marca do login:

- `.brand-name small` herdava `--sidebar-muted` (`#aab2aa` no tema claro), um token feito para texto sobre a sidebar escura. Na página de login, o texto é renderizado em `--surface` (`#fffefa`) e o contraste informado foi 2,15:1.
- `.auth-brand` e a marca do shell tinham `aria-label` divergentes do texto visível (`Rota CRM` / `Rota CRM, visão geral` versus `rota. CRM COMERCIAL`). Os atributos foram removidos para usar o nome derivado do texto.

A correção limita a legenda da marca de autenticação a `color: var(--ink)`; nenhum token global foi alterado. O contraste calculado é 15,42:1 no tema claro (`--ink: #202522`, superfície `#fffefa`) e 14,49:1 no escuro (`--ink: #f3f4ec`, superfície `#1c231e`). Os testes E2E agora verificam o nome acessível no login e no shell e executam axe nos dois temas, sem excluir regras ou elementos.

Esses novos testes ainda precisam rodar no Bazzite. Este registro não declara a UX-01 concluída nem substitui a validação automatizada e manual pendente acima.

## Inspeção visual final UX-01 — 2026-11-02

### Disponibilidade do executor

- `TEST_DATABASE_URL` não está configurada; `DATABASE_URL` também está ausente. `distrobox` não está disponível neste executor.
- A configuração Playwright do projeto exige validação de `TEST_DATABASE_URL` ao carregar. Portanto, nenhum E2E, axe autenticado ou regressão foi iniciado contra outro destino.
- Não há screenshots nos diretórios de resultados. Em tentativa anterior neste mesmo executor, o servidor Next não conseguiu abrir a porta (`listen EPERM`) e o Chromium headless encerrou com `Operation not permitted` ao iniciar seu sandbox.
- Nenhuma conexão PostgreSQL foi aberta e `.env.local` não foi acessado.

### Cobertura visual

| Página / grupo | 1440 px | 768 px | 390 px | 320 px | Evidência |
|---|---|---|---|---|---|
| Login | Não inspecionado visualmente | Não inspecionado visualmente | Não inspecionado visualmente | Não inspecionado visualmente | Sem screenshot; revisão de código anterior apenas. |
| Dashboard | Não inspecionado visualmente | Não inspecionado visualmente | Não inspecionado visualmente | Não inspecionado visualmente | Sem screenshot. |
| Clientes, detalhes, formulários e contatos | Não inspecionado visualmente | Não inspecionado visualmente | Não inspecionado visualmente | Não inspecionado visualmente | Sem screenshot. |
| Oportunidades, Kanban, detalhes e formulários | Não inspecionado visualmente | Não inspecionado visualmente | Não inspecionado visualmente | Não inspecionado visualmente | Sem screenshot. |
| Tarefas e atividades | Não inspecionado visualmente | Não inspecionado visualmente | Não inspecionado visualmente | Não inspecionado visualmente | Sem screenshot. |
| Pesquisa, equipe e configurações | Não inspecionado visualmente | Não inspecionado visualmente | Não inspecionado visualmente | Não inspecionado visualmente | Sem screenshot. |

Não foram encontrados problemas visuais novos nesta tentativa, pois a interface não pôde ser renderizada no navegador. A revisão de código documentada acima continua sendo evidência de implementação, não de resultado visual.

### Validações executadas neste turno

- `npm run typecheck`: aprovado.
- `npm run lint`: aprovado.
- `npm test`: 91 testes unitários aprovados (15 arquivos).
- `git diff --check`: retornou sucesso. O checkout apresenta os arquivos do projeto como não rastreados, então o diff Git não incluiu esses arquivos; esta verificação não foi usada como evidência de inspeção visual.
- E2E, axe e regressão completa: não executados por ausência do PostgreSQL isolado autorizado.

### Acessibilidade e riscos antes do MVP

- O passe de axe no login nos dois temas e a regressão E2E de 38 testes são resultados anteriores informados pelo usuário; não foram reproduzidos neste executor.
- Nesta tentativa não foram verificados por navegador: ordem de foco em todas as rotas, contraste renderizado dos estados, zoom/ampliação, movimento reduzido, axe nas páginas autenticadas nem diálogos com teclado.
- Antes do MVP, ainda é necessário executar a matriz 1440/768/390/320 no Bazzite, arquivar screenshots sintéticas sem dados de sessão, executar axe nas rotas principais e fazer revisão manual de teclado/leitor de tela. WCAG 2.2 AA não está declarada como concluída.

## UX-01.1 — suíte de auditoria reproduzível no Bazzite

### Infraestrutura reutilizada e segurança

- A suíte usa `playwright.config.ts` e o servidor Next existente em `127.0.0.1:3100`; não cria servidor nem fluxo de autenticação próprios.
- Ao carregar a configuração, `validateTestDatabaseIsolation()` exige `TEST_DATABASE_URL` com host `127.0.0.1`, porta `5433`, banco `crm_test_isolated`, usuário `crm_test_admin` e senha. Se `DATABASE_URL` estiver definida, a configuração também rejeita identidade igual. O servidor de teste recebe somente a URL já validada nas duas variáveis e `NODE_ENV=test`, que impede o Next de ler `.env.local`.
- A fixture `seedTeamRbacFixture` e `createIsolatedConnectionPair` são reutilizados. Os registros de cliente, contato, oportunidade, tarefa e atividade têm nomes e endereços `example.test`; o cleanup apaga somente o organization id e os usuários gerados e verifica resíduos antes de encerrar os pools.
- Não foi acessado `crm-postgres`, o banco principal, `.env.local` ou a porta 5432. Nenhuma migração, bootstrap ou limpeza global foi executada.
- Nenhum navegador foi iniciado nesta preparação; portanto, ainda não há screenshots nem resultados axe desta suíte.

### Matriz preparada

| Página / estado | Larguras de screenshot | Verificações adicionais |
|---|---|---|
| Login | 1440, 768, 390, 320 | Main, heading e labels dos campos; overflow do documento. |
| Dashboard | 1440, 768, 390, 320 | Heading, ações e navegação. |
| Clientes, detalhe, novo e edição | 1440, 768, 390, 320 | Busca, filtros, tabela e formulário com fixture. |
| Kanban e detalhe/novo/edição de oportunidade | 1440, 768, 390, 320 | Seis regiões/colunas e seis controles de etapa; rolagem interna e captura do extremo direito em telas até 768 px. |
| Tarefas e novo formulário | 1440, 768, 390, 320 | Tabela e controles de busca/criação. |
| Atividades, equipe, pesquisa e configurações | 1440, 768, 390, 320 | Controles principais, tabela da equipe e tema. |
| Rotas autenticadas prioritárias | 1440 e 390; temas claro e escuro | Axe nas oito rotas: dashboard, clientes, Kanban, tarefas, atividades, equipe, pesquisa e configurações. |
| Dashboard em altura reduzida | 1440 × 600 | Skip link, foco, sequência das seis opções de navegação e `prefers-reduced-motion`. |

Cada screenshot espera o heading/estado principal e as fontes antes da captura, desativa animações pendentes sem ocultar conteúdo e usa somente dados sintéticos. Os arquivos vão para `test-results/ux-visual-audit/`, ignorado pelo Git: PNGs por rota/largura, capturas de rolagem do Kanban, `layout-login.json`, `layout-authenticated.json` e `axe-results.json`. O relatório axe registra regra, impacto, página, tema, largura, alvo e resumo de falha; não guarda cookies ou conteúdo de sessão. Os relatórios são gerados durante a execução e não estão presentes agora.

### Comandos no Distrobox

No Bazzite, com `TEST_DATABASE_URL` já disponível no ambiente de execução e apontando para o banco isolado validado:

```bash
distrobox enter laboratorio-node -- bash -lc 'cd ~/Ambiente/Projetos/crm-gestao-clientes && npm run test:e2e -- tests/e2e/ux-visual-audit.spec.ts --workers=1'
```

Para a regressão completa após revisar os artefatos:

```bash
distrobox enter laboratorio-node -- bash -lc 'cd ~/Ambiente/Projetos/crm-gestao-clientes && npm run test:e2e -- --workers=3'
```

Não coloque a URL/senha no histórico do shell. A configuração bloqueia a execução quando a variável estiver ausente ou quando host, porta, banco ou usuário não coincidirem; não existe fallback para o banco principal.

### Critérios objetivos para encerrar UX-01

1. A suíte completa gera os screenshots previstos e os relatórios JSON no diretório ignorado, sem falha de fixture/cleanup.
2. As rotas e controles principais ficam visíveis e habilitados; a navegação mantém a sequência por teclado e o foco tem indicador visível.
3. Não há overflow horizontal no documento. Rolagem interna de tabela/Kanban é registrada separadamente e permanece utilizável, incluindo o extremo direito do Kanban.
4. Axe não encontra violações nas 32 combinações de oito rotas, duas larguras e dois temas; qualquer achado deve ser corrigido e reavaliado. Isso não equivale a certificação WCAG.
5. Typecheck, lint, testes unitários e regressão E2E são executados após as correções finais.
6. Uma pessoa revisa visualmente os PNGs e valida manualmente zoom real a 200% e 400%, navegação por teclado e leitor de tela, contraste de estados, viewport baixo e comportamento reduzido de movimento. Reduzir a viewport não substitui o zoom do navegador.

### Limitações restantes

- A spec está preparada, mas nenhum E2E, axe ou screenshot foi executado pelo executor atual: `TEST_DATABASE_URL` e `distrobox` não estão disponíveis aqui. O Bazzite deve executar a matriz antes de declarar a auditoria visual concluída.
- A automação cobre reflow por larguras de viewport e registra overflow; zoom real de 200%/400%, leitura por tecnologia assistiva e julgamento de legibilidade permanecem revisão manual.
- Os resultados históricos de 91 testes unitários, 225 de integração, 38 E2E e preflights M-01/I-01 não foram reproduzidos nesta preparação.

## UX-01.2 — correções orientadas pelas evidências do Bazzite

### Diagnóstico das evidências

Os artefatos lidos foram `test-results/ux-visual-audit/axe-results.json`, os dois `error-context.md` do Playwright e os PNGs sintéticos das rotas. O relatório contém 32 varreduras, 66 grupos de violação por regra/execução e 266 ocorrências de nós. Portanto, “66” não representa defeitos independentes.

| Causa / regra | Repetição nos scans | Gravidade | Diagnóstico |
|---|---:|---|---|
| Cor `color-contrast` | 18 grupos, 138 nós | serious | O token claro `--muted: #707871` falhava em canvas e superfícies claras: 4,17:1 em `#f6f5f1`, 4,06:1 em `#f3f2ed`, 4,32:1 em `#fef8f4` e 3,95:1 em `#f0efe9`. Repetia em breadcrumb, subtítulos, contadores, rodapé, etapas, badges e textos de tarefa/equipe. A paginação aplicava `opacity: .45`, baixando para 2,73:1 no tema claro e 4,04:1 no escuro. |
| Landmarks `region` | 32 grupos, 112 nós | moderate | O shell deixava logo, seletor de workspace, rótulo da seção e nota lateral como filhos de `.sidebar` (`div`), fora de qualquer landmark. Os mesmos seis elementos eram reportados repetidamente em cada rota/tema/largura. |
| Nome `button-name` | 16 grupos, 16 nós | critical | `.logout-button` mantinha o texto “Sair” no DOM, mas `display:none` o removia da árvore acessível nos breakpoints até 1100 px. Todas as páginas autenticadas testadas a 390 px repetiam o mesmo botão sem nome. |
| Overflow do documento | 2 larguras | falha funcional do teste | Os screenshots registraram 441 px (primeira execução) e 443 px (execução mais recente) para viewports de 390 e 320 px. Isso confirma overflow, mas não identifica o nó que o origina. O relatório da execução não continha `layout-authenticated.json`, pois a asserção da tabela de equipe interrompeu o teste antes de salvar as medidas. A hipótese de `min-width:auto` em `.main-content` foi testada e não resolveu o overflow; não é considerada causa confirmada. |
| Seletor de papel da equipe | 1 rota | falha de seletor e rótulo pouco distinto | Três membros editáveis tinham o mesmo nome acessível “Papel do membro”. A operação era correta, mas o nome não identificava a pessoa e o locator não podia escolher a linha de forma estrita. |

As 66 violações agrupadas são 18 de contraste, 32 de landmark e 16 de nome de botão. Os 266 nós mostram o efeito de repetição por página, tema e resolução; não são 266 causas distintas. Contraste foi agrupado por cor/fundo e componente, e a exceção para componentes inativos não se aplica aos textos informativos de estados ou badges. O texto da paginação também foi mantido legível, em vez de depender da exceção de contraste para controles desabilitados: são `<span>` não interativos.

### Correções aplicadas

- `--muted` no tema claro passou a `#5e675f`. Nos fundos claros efetivamente reportados, o contraste calculado fica entre 5,09:1 e 5,81:1. O token escuro `#b0b9af` foi preservado; nos fundos observados, sua relação calculada é 6,56:1 ou maior.
- A opacidade de `.is-disabled` foi removida e o texto usa `var(--muted)`. Isso evita degradar a leitura da paginação e mantém o estado visual e a ausência de interação. Regras de botões nativamente desabilitados não foram alteradas.
- `min-width: 0` foi testado em `.main-content`, mas os screenshots posteriores ainda mediram 443 px. A alteração foi removida por não resolver a falha; não foi aplicada outra correção CSS especulativa. Não foi adicionado `overflow-x: hidden` global.
- O botão de sair recebeu `aria-label="Sair"`; ícone, texto visível quando disponível e lógica Better Auth permanecem iguais.
- A área lateral virou `<aside aria-label="Workspace e navegação">`, criando um landmark complementar nomeado em torno do logo, workspace, navegação e nota. Os landmarks `<nav>` existentes foram preservados.
- O seletor de papel agora inclui nome e e-mail da pessoa no nome acessível (`Papel de … (email)`). A spec procura especificamente a linha da fixture `RBAC admin`; não usa `.first()`.
- A medição de layout registra candidatos fora do viewport com bounds, largura, `scrollWidth`, `clientWidth`, cadeia de ancestrais e ancestrais roláveis. A gravação incremental em `layout-authenticated.json` foi acrescentada para preservar as medições mesmo que uma asserção posterior falhe.

### Resultado estático e evidências disponíveis

As capturas anteriores permanecem em `test-results/ux-visual-audit/` e são sintéticas. Foram analisadas especialmente `clients-390.png`, `clients-320.png`, `tasks-390.png`, `kanban-390.png` e `kanban-390-right.png`. Não foram produzidas capturas após as correções nesta etapa.

Na execução Bazzite informada, 32 varreduras axe tiveram zero violações. A suíte terminou com 3/4 testes aprovados e um teste de matriz reprovado por overflow em clientes e pelo seletor ambíguo de tabelas de equipe. Os screenshots mais recentes de clientes medem 443 px nos arquivos de 390 e 320 px; essa largura confirma a falha, mas não prova qual elemento causa o overflow. O erro ocorreu antes da gravação do relatório de bounds.

Neste executor, `TEST_DATABASE_URL` e `distrobox` não estão disponíveis. E2E não foi repetido. A origem do overflow permanece pendente; o próximo relatório incremental deverá registrar largura do documento, candidatos, bounds, ancestrais e áreas roláveis antes de continuar a matriz.

Os arquivos alterados nesta etapa são `src/app/globals.css`, `src/components/shell/logout-button.tsx`, `src/components/shell/app-shell.tsx`, `src/components/team/member-role-control.tsx`, `src/app/(app)/team/page.tsx`, `tests/e2e/ux-visual-audit.spec.ts` e este documento. Autenticação, RBAC, regras comerciais, banco, constraints e isolamento multi-tenant não foram modificados.

### Validações e pendências

- `npm run typecheck`: aprovado.
- `npm run lint`: aprovado.
- `npm test`: 91 testes unitários aprovados em 15 arquivos.
- `git diff --check`: sem erros. Como os arquivos aparecem não rastreados neste checkout, os arquivos alterados também foram verificados diretamente para whitespace.
- No Bazzite, executar primeiro `npm run test:e2e -- tests/e2e/ux-visual-audit.spec.ts --workers=1`, revisar `axe-results.json` e `layout-authenticated.json`, corrigir o elemento identificado e repetir a matriz; depois executar a regressão E2E completa.
- Reexaminar visualmente os screenshots de clientes em 390/320 px e a tabela/rolagem Kanban depois da correção. Confirmar que a tabela continua semântica e que só ela rola horizontalmente.
- A auditoria visual e a revisão manual de zoom, teclado/leitor de tela continuam abertas. Nenhuma conformidade WCAG completa é declarada.

### Continuação — seletor de tabelas e diagnóstico incremental

O último `error-context.md` mostrou duas tabelas na equipe: a tabela de membros e a tabela com nome acessível “Responsabilidades comerciais”. A spec agora espera explicitamente duas tabelas, verifica ambas e consulta a tabela de membros pela região `Membros do workspace` e a tabela de responsabilidades pelo nome derivado da legenda. Não utiliza `.first()`.

A instrumentação agora salva `layout-authenticated.json` a cada viewport e inclui dimensões/scroll e os seis ancestrais próximos dos candidatos que cruzam a largura da viewport, além dos ancestrais com overflow rolável. Assim, a futura falha de clientes não será perdida quando outro controle ou tabela falhar depois.

Ainda não há elemento responsável comprovado nem correção CSS final para o overflow. A tentativa anterior com `min-width: 0` não resolveu e foi revertida. A mudança de teste cobre as duas tabelas, mas precisa ser executada no Bazzite junto da matriz para confirmar que ambas passam e gerar os bounds necessários.

### Diagnóstico de overflow com bounds do Playwright

O `layout-authenticated.json` gerado na execução posterior contém estas medidas:

| Rota / viewport | `documentElement.clientWidth` | `documentElement.scrollWidth` | `body.scrollWidth` | Área de tabela |
|---|---:|---:|---:|---|
| Clientes / 390 px | 390 | 443 | 390 | `.table-wrap`: x=16–374, largura/clientWidth=358, `scrollWidth`=465, `overflow-x:auto`; a tabela mede 465 px e termina em x=481. |
| Clientes / 320 px | 320 | 443 | 320 | `.table-wrap`: x=16–304, largura/clientWidth=288, `scrollWidth`=465, `overflow-x:auto`; a tabela mede 465 px e termina em x=481. |
| Tarefas / 390 px | 390 | 390 | 390 | Tabela rolável mede 432 px dentro de `.table-wrap`. |
| Tarefas / 320 px | 320 | 320 | 320 | Tabela rolável mede 432 px dentro de `.table-wrap`. |
| Equipe / 390 e 320 px | igual à viewport | igual à viewport | igual à viewport | As áreas de tabela têm `scrollWidth` 497 px e 825 px, sem overflow do documento. |

Os PNGs `clients-390.png` e `clients-320.png` têm 443 px de largura e foram abertos nesta inspeção. Eles confirmam a largura excedente; a tabela mantém seu próprio recorte/rolagem visual. A comparação com tarefas e equipe demonstra que uma tabela maior que a viewport, por si só, não explica o overflow do documento.

Na instrumentação anterior, a lista de candidatos era truncada aos 12 elementos com maior coordenada direita. Todos os 12 eram a tabela e seus descendentes dentro do `.table-wrap`; por isso, ela podia ocultar o elemento não relacionado à tabela que define `scrollWidth=443`. Esses dados não provam a tabela como causa. Nenhum componente CSS foi alterado nesta investigação.

A spec foi ajustada para registrar somente candidatos de overflow não contidos por ancestral rolável, sem truncar a lista; medir `width`, `min-width`, `max-width`, `display`, `position`, bounds e ancestrais; e gravar dimensões dos filhos das áreas roláveis separadamente. Também captura bounds dos filhos diretos do body e estilos computados de pseudo-elementos `html`/`body`. O layout continua sendo salvo por viewport.

O executor atual continua sem `TEST_DATABASE_URL` e `distrobox`, então essa instrumentação ampliada não foi executada. A causa real continua pendente de um novo `layout-authenticated.json`. Com as evidências disponíveis não se aplica uma correção CSS; qualquer hipótese sobre botão, filtro, paginação, tabela, pseudo-elemento ou portal seria especulativa.

### Isolamento do overflow em `/clients` — UX-01.2

Foi acrescentado um diagnóstico temporário à matriz da spec, executado somente para `/clients` e `/tasks` em 390 e 320 px. O relatório `layout-authenticated.json` recebe, por rota e largura:

- `beforeScroll`, `afterScrollAttempt` e `afterScrollRestore`: dimensões de `html`/`body`, limite horizontal calculado e `window.scrollX` antes/depois de tentar rolar o documento até o fim;
- `tableIsolation`: largura do documento antes, durante e depois de ocultar `.table-wrap` por estilo inline temporário, além da confirmação de que o mesmo nó e seu atributo `style` foram restaurados;
- `progressiveMainIsolation` e `shellIsolation`: largura após ocultar cumulativamente os filhos diretos de `main#main-content`, `.main-column` e `.app-frame`, com classes e dimensões por etapa e confirmação de restauração;
- `elementCandidates`: elementos que ultrapassam a viewport ou têm overflow próprio, com estilos computados, cadeia de ancestrais e identificação de ancestrais roláveis;
- `pseudoElements`: pseudo-elementos com conteúdo declarado e estilos/posições calculados.

As alterações de DOM existem apenas durante a avaliação Playwright e são restauradas antes da captura e das asserções. Não foi aplicada regra de CSS de produção. O relatório disponível ainda mostra `html.scrollWidth=443`, sem candidatos externos à viewport; isso não identifica a origem. A spec diagnóstica não foi executada neste executor porque Chromium, Distrobox e `TEST_DATABASE_URL` validada não estão disponíveis. Logo, deslocamento efetivo, resultado do isolamento e causa continuam sem confirmação. No Bazzite, comparar os estágios do novo relatório antes de propor correção.

### Experimentos direcionados na tabela de clientes — UX-01.2

O relatório posterior do Bazzite confirma rolagem real: `window.scrollX` foi de 0 para 53 px em viewport 390 e de 0 para 123 px em viewport 320. Em ambas, `html.scrollWidth=443`; ocultar `.table-wrap` reduziu a largura para a viewport e restaurá-lo trouxe 443 px de volta. O isolamento cumulativo também eliminou o excesso ao ocultar `section.panel`, enquanto esconder os filhos anteriores de `main` não mudou a largura. Isso confirma dependência da região da tabela, mas ainda não aponta uma propriedade CSS ou descendente específico.

O mesmo relatório mostrou `originalStyleRestored=false` e `allOriginalStylesRestored=false`. Ele não registrava se o atributo `style` estava ausente ou vazio, nem os valores anteriores e posteriores; a causa dessa discrepância não pode ser determinada retrospectivamente. A instrumentação foi atualizada para registrar presença e valor bruto do atributo, restaurar estilo e `scrollLeft` em `finally` por experimento e verificar a restauração. Também usa `finally` para cada isolamento cumulativo e para a rolagem de janela.

Na próxima execução, `tableExperiments` testa separadamente ocultar `table.data-table`, `thead` e `tbody`; aplica temporariamente `contain: paint`, `clip-path: inset(0)` e `overflow-x: clip` somente em `.table-wrap`; registra `scrollLeft` até o fim, dimensões, estilos e estrutura da tabela; e restaura tudo antes do teste seguir. `tableDescendants` registra bounds, largura, min-width, posicionamento e transformações dos nós que cruzam o contêiner ou têm overflow próprio, e `tablePseudoElements` lista pseudo-elementos da região. Asserções verificam que estilo, posição de rolagem e tabela acessível permanecem restaurados. As varreduras axe anteriores permanecem com zero violações; não foram repetidas nesta etapa.

Ainda não foi identificada a propriedade causadora nem aplicada correção de produção. A suíte com os novos experimentos precisa rodar no Bazzite; containment/clipping temporário não é tratado como solução até confirmar rolagem interna e revisar a apresentação e interação da tabela.

### Correção localizada e restauração exata — UX-01.2

O diagnóstico executado no Bazzite confirmou que `contain: paint` aplicado a `.table-wrap` elimina o overflow global em 390 e 320 px e mantém a rolagem interna, a estrutura e os elementos da tabela. `overflow-x: clip` foi descartado porque não manteve a rolagem. Com essa evidência, a listagem de clientes recebeu a classe exclusiva `.client-list-table-wrap`, e somente esse seletor aplica `contain: paint`; as tabelas de tarefas e equipe mantêm suas regras atuais.

A causa da falha de restauração estava na instrumentação que alterava a declaração `style` dos próprios elementos: em elementos originalmente sem esse atributo, a mutação podia deixar `style=""`. Os novos experimentos aplicam regras por uma folha `<style>` temporária e a removem em `finally`, evitando tocar nos atributos inline dos alvos. O isolamento cumulativo também usa essa folha temporária. Cada etapa verifica os atributos `style` (presença e valor), os mesmos nós e sua ordem, o markup e a posição de rolagem; após toda a sequência, uma verificação agregada confirma a restauração antes de seguir com as asserções.

A matriz inclui navegação por teclado nos controles de filtro e links da tabela nas quatro larguras, foco visível e contido no viewport do contêiner, e avanço horizontal até o último link/coluna em viewports móveis. A spec também mantém as verificações de scroll interno, contagem/visibilidade semântica da tabela, ausência de overflow global e axe.

Validações locais após a alteração: `npm run typecheck`, `npm run lint`, `npm test` (91 testes) e verificações de whitespace passaram. Este executor não tem Chromium, Distrobox ou `TEST_DATABASE_URL`; portanto, não executou Playwright, as 32 varreduras axe, a regressão E2E, nem os preflights M-01/I-01 após a correção. No Bazzite, executar `distrobox enter laboratorio-node -- bash -lc 'cd ~/Ambiente/Projetos/crm-gestao-clientes && npm run test:e2e -- tests/e2e/ux-visual-audit.spec.ts --workers=1'`, revisar `test-results/ux-visual-audit/layout-authenticated.json` e `axe-results.json`, depois executar a regressão E2E e os preflights M-01/I-01. A configuração exige `TEST_DATABASE_URL` validada para o PostgreSQL isolado.

### Diagnóstico da posição do foco por teclado — UX-01.2

O `error-context.md` da nova execução registra, em 390 px, o link esperado com `left=-78` diante de `wrapperLeft=16`; o contorno estimado com largura/offset de 3 px também extrapola à esquerda. O `toBeFocused()` anterior a essa medição não falhou, então o locator esperado estava focado, mas o relatório daquele ponto não gravou nome do link nem `scrollLeft`. Em 320 px, o relatório anterior mostra foco Tab em links com retângulos dentro do wrapper e rolagem interna de `scrollLeft=0` e `175`. Isso indica que o caminho de retorno dos links é funcional a 320 px; a causa específica da divergência em 390 px ainda não está demonstrada.

A spec agora registra `scrollLeft` inicial e reinicia cada passagem em posição zero conhecida, registrando esse valor anterior para revelar estado residual. Percorre filtros e links com Tab, volta por Shift+Tab, mede imediatamente e após um frame o elemento ativo, nome/href, retângulos, scroll, interseção visível, documento e contorno de foco. Quando foco/interseção/contorno saem do contêiner, salva screenshot do viewport com o estado realmente focado. Executa a mesma sequência com o containment de produção e com uma regra temporária removendo-o; cada modo restaura foco, rolagens e folha temporária em `finally`. A comparação é gravada em `layout-authenticated.json` como `keyboardFocusComparison`.

Não removi `contain: paint` nem afrouxei as verificações. O relatório disponível demonstra que os experimentos anteriores restauraram os nós, atributos e rolagem da tabela; a nova instrumentação ainda precisa ser executada para revelar se os 105 px de máximo scroll em 390 px já estavam ativos antes do primeiro Tab, se o navegador os aplicou ao focar o link, ou se a causa é a contenção. Não há screenshot de foco do estado que falhou, pois a versão anterior só registrava dados após concluir o ciclo; a nova spec produzirá `clients-keyboard-focus-<largura>-<modo>-link-<n>.png` para estados problemáticos.

## UX-01.3 — navegação por teclado na tabela de clientes

### Causa observada nos relatórios existentes

O relatório de `/clients` em 390 px mostra que o Chrome foca os links na ordem do DOM. Ao avançar da ação da primeira linha para o link principal da segunda linha, a tabela continua em `scrollLeft=107`: o link da primeira coluna fica em `x=-80..20`, enquanto o scrollport começa em `x=16`. Assim, somente 4 px de um link de 100 px (4%) permanecem visíveis. A volta por `Shift+Tab` reproduz o mesmo estado. O relatório também mostra a mesma transição e as mesmas coordenadas com e sem `contain: paint`; portanto, a containment não explica a falha. Os screenshots sintéticos já existentes `clients-keyboard-focus-390-with-contain-link-3.png` e `clients-keyboard-focus-390-without-contain-link-3.png` mostram o foco parcialmente cortado.

Isso confirma um problema funcional de visibilidade: a rolagem nativa não avança quando ainda resta uma interseção estreita do link com o scrollport. A tabela e sua área de rolagem continuam corretas; o navegador move a tabela para revelar a ação na última coluna e deixa o próximo link principal quase todo fora da área visível.

### Correção localizada e cenário reproduzível

`/clients` agora usa `FocusVisibleScrollRegion` em torno da mesma tabela. Ao receber foco que corresponde a `:focus-visible`, o componente aguarda um frame para a rolagem nativa do navegador e só então ajusta o `scrollLeft` interno se o link ou o contorno estiver fora do scrollport. O cálculo considera a largura e o offset do outline. Não altera links, células, colunas, paginação, filtros ou destinos, e não muda o comportamento de foco por mouse. A classe exclusiva `.client-list-table-wrap` e `contain: paint` permanecem aplicadas.

A spec `tests/e2e/ux-visual-audit.spec.ts` foi separada da matriz que reutiliza uma página: para cada largura (390 e 320 px) e modo (contain de produção / override temporário sem contain), cria uma página Playwright nova no contexto já configurado pela suíte, reutiliza a autenticação sintética e inicia a tabela em `scrollLeft=0`. A navegação parte do documento por Tab, registra a ordem até busca, status e botão de filtro, percorre os quatro links por Tab, retorna por Shift+Tab e mede cada foco imediatamente e após um frame. O relatório `test-results/ux-visual-audit/keyboard-focus-isolation.json` inclui nomes, hrefs, linhas/colunas, retângulos, interseção, outline e scroll antes/imediatamente/depois do frame. A spec salva screenshots com o foco ativo quando encontra corte e também no link principal da segunda linha para comparação. Cada modo usa documento novo; o override é removido em `finally`, a posição da janela/tabela é restaurada e a spec compara atributo `style`, hrefs, linhas e células antes de fechar a página.

### Status de validação

- Evidência base: relatórios e screenshots anteriores do Bazzite confirmam o corte de 4% em 390 px nos dois modos; não há diferença atribuível a `contain: paint`.
- A correção e a nova comparação isolada ainda precisam ser executadas no Bazzite para confirmar o foco integral, o contorno sem corte, a rolagem até a última coluna e a volta com Shift+Tab em ambos os modos e larguras.
- Este executor não possui `TEST_DATABASE_URL`, Chromium ou Distrobox. Não foram executados E2E, axe ou regressão após a alteração. Não declarar a UX-01 concluída antes dessa execução.
