# SEC-01C.4 — Proteção dos logs técnicos (F005)

**Data:** 2026-11-03
**Escopo:** sinks de logging controlados pelo CRM e o script local de diagnóstico de migração.
**Status de encerramento: BLOQUEADA por ambiente.** A mitigação de código permanece parcialmente validada: sinks identificados usam o logger seguro e o teste Better Auth em memória passa. A validação integrada com PostgreSQL e sessão real do CRM ainda não foi executada. A avaliação atual está registrada ao final; os resultados anteriores permanecem históricos.

## Ambiente e versões

- Projeto: `/home/ribeiroluckas/Ambiente/Projetos/crm-gestao-clientes`.
- Node.js `v24.22.2`; npm `11.19.1`.
- Next.js `16.4.3`; Better Auth `1.7.14`; Drizzle ORM `0.45.4`; Vitest `5.0.5`; Playwright `1.64.1`.
- Podman, Distrobox e Chromium não estão disponíveis no executor; o container `laboratorio-node` não pôde ser consultado.
- Não foi lido `.env.local`, iniciado servidor ou acessado banco.

## Diagnóstico

A F005 original foi reproduzida por teste unitário sintético: `workspaceApiErrorResponse()` encaminhava um objeto `Error` ao `console.error`, enquanto a resposta HTTP mantinha mensagem genérica. Isso confirma o encaminhamento do objeto ao sink da aplicação, mas não comprova que mensagem, stack, `cause` ou dados sensíveis tenham sido serializados pelo runtime ou armazenados por um collector. Não houve evidência de exposição real nem acesso a logs de produção.

O inventário de `src/` encontrou quatro sinks diretos controlados pelo CRM e a configuração do logger contextual Better Auth:

| Local | Evento | Dados recebidos antes | Tratamento agora |
|---|---|---|---|
| `src/lib/workspace.ts` — `workspaceApiErrorResponse` | Falha inesperada de handler | `unknown` encaminhado junto à mensagem estática | Evento allowlist `internal-error/workspace.request`; resumo limitado do tipo do erro |
| `src/modules/team/actions.ts` — alteração de papel | Falha na operação auditada | Mensagem estática sem detalhes da exceção | Evento allowlist `internal-error/team.role.update` |
| `src/app/api/auth/[...all]/route.ts` — validação de autorização | Exceção durante verificação | Resposta 403 genérica e mensagem estática no log | Evento allowlist `authorization-check/member.role.authorization` |
| `src/app/(app)/team/page.tsx` — carga de responsabilidades | Falha ao montar resumo | Resposta visual genérica; exceção não encaminhada antes | Evento allowlist `data-load/team.responsibilities.load` |
| `src/lib/auth.ts` — callback `onAPIError` e logger configurável do Better Auth | Erros do callback e eventos internos entregues ao logger configurado | Callback registrava nome/código; logger padrão da biblioteca escrevia mensagem/argumentos diretamente no console | Adaptador usa nível `warn` padrão, categoria/origem fixas e resumo seguro de eventual Error; texto e argumentos arbitrários são descartados; marcadores de integridade continuam tratados separadamente |

O script local `scripts/debug-migrate.mjs` imprimia `message`, `detail`, `hint` e metadados de erros de migration. A saída foi reduzida a mensagem estática. O script não foi executado. `scripts/bootstrap-owner.ts` registra apenas etapa e estado booleano controlado; não encaminha o objeto de erro. Os logs de lock-timeout encontrados em testes são diagnósticos sintéticos de teste, não sinks da aplicação.

## Política implementada

`src/lib/safe-logger.ts` aceita somente evento estruturado com nível, categoria e operação enumerados, além de campos opcionais explicitamente limitados. A saída é um único JSON string enviado ao nível correspondente do console. Cada propriedade do input e do resumo de Error é lida uma vez, evitando que getters variáveis passem por validação com um valor e sejam registrados com outro.

Para exceções, não são lidos nem serializados `message`, `stack`, `cause`, propriedades enumeráveis arbitrárias ou objetos de contexto. Erros padrão são reduzidos a `{kind, name}` quando o nome pertence à lista de tipos conhecidos; código é mantido apenas para códigos internos conhecidos ou formato de SQLSTATE. Valores desconhecidos são reduzidos à categoria do tipo primitivo/objeto. Ciclos não são percorridos. Getters hostis, falhas de serialização ou do próprio sink não devem alterar o resultado funcional da aplicação.

Campos permitidos:

- `timestamp`, nível, categoria e operação de listas fechadas.
- Código de erro conhecido pelo aplicativo ou SQLSTATE.
- ID de correlação com formato UUID; callers devem fornecer somente identificadores gerados e não sensíveis.
- Categoria e tipo/nome padronizado de erro.

Campos proibidos: mensagem, stack, `cause`, headers, cookies, tokens, credenciais, URL de conexão, payload da requisição, objetos de usuário/cliente, SQL/parâmetros e metadados livres. Não há serialização recursiva.

`audit_logs` permanece independente: eventos obrigatórios de negócio continuam dentro da transação da F001. O logger técnico não substitui nem altera RBAC ou a trilha de auditoria.

## Better Auth e limites de cobertura

A aplicação usa Better Auth 1.7.14 conforme lockfile/instalação verificados nesta tarefa. A API instalada permite configurar `logger.log(level, message, ...args)`; o CRM agora fornece um adaptador que recebe chamadas do logger Better Auth no contexto de auth e encaminha apenas nível, categoria/operação fixas e resumo allowlist de Error ao console controlado pelo CRM. O nível mínimo permanece `warn`, igual ao padrão observado no código instalado. Mensagens e argumentos arbitrários são descartados para impedir que a biblioteca escreva exceções brutas pelo sink configurado. O callback customizado `onAPIError` também usa o logger seguro e preserva tratamentos especiais de integridade.

Essa configuração cobre chamadas Better Auth que passam pelo logger contextual configurado; não comprova que todos os logs internos do Next.js, Node.js, `pg`, proxy ou bibliotecas sejam interceptados. Chamadas que ocorram fora do contexto Better Auth ou outros sinks próprios podem continuar usando seus destinos nativos.

Não foram coletados logs de produção ou de qualquer agregador. Destino, controle de acesso, retenção, redaction posterior e exportação dos registros permanecem desconhecidos. A correção cobre os pontos controlados identificados no código, não a infraestrutura de observabilidade completa.

## Testes preparados

`tests/unit/security/sec-01b-logging.test.ts` cobre marcadores sintéticos para senha, token, cookie, Authorization, URL de conexão, dado comercial, e-mail, `cause` e stack; também verifica propriedades adicionais de Error, código e ID de correlação, objetos não Error, valores nulos, ciclos, getters hostis e variáveis, falha de serialização, erro do sink e resposta HTTP genérica. As verificações inspecionam todos os argumentos capturados pelos sinks de teste. Um cenário instancia Better Auth 1.7.14 com adapter em memória, envia uma requisição sintética inválida e valida a resposta e o aviso efetivamente emitido pelo logger configurado.

Na execução runtime isolada e reproduzida pelo teste unitário, o fluxo de cadastro com senha sintética curta retornou HTTP 400 e produziu exatamente um aviso JSON com severidade `warn`, categoria `authentication-error`, operação `auth.api` e código fixo `BETTER_AUTH_LOG_EVENT`. Marcadores sintéticos de segredo de teste, senha, e-mail e nome não apareceram na saída capturada. O teste não abriu socket HTTP, não carregou configuração Next.js, não acessou PostgreSQL e não usou credenciais reais. O adapter em memória não prova comportamento de outros sinks globais fora do contexto configurado.

Os testes usam somente marcadores sintéticos e não iniciam PostgreSQL. Eles verificam também que o adaptador Better Auth não encaminha mensagens nem argumentos arbitrários, mantendo severidade, origem categorizada e códigos seguros. Os números históricos de testes E2E, integrações e axe não são resultados desta alteração.

## Resultado das verificações desta tarefa

- `npm run typecheck`: aprovado.
- `npm run lint`: aprovado sem erros ou warnings.
- `npm test`: 103 testes em 17 arquivos aprovados; inclui o cenário Better Auth runtime em memória.
- `npm ls @better-auth/memory-adapter --depth=0`: `1.7.14`; a versão já estava instalada como dependência de Better Auth e foi declarada diretamente para tornar o teste reproduzível.
- `npm install --save-dev --package-lock-only --ignore-scripts --offline ...`: não concluído (`ENOTCACHED`) porque o cache não continha um pacote WASM do Tailwind já presente na árvore. Não houve download/atualização de pacotes; a dependência direta foi registrada no manifest/lockfile usando a entrada já existente.
- Execução inicial com o CLI `tsx`: bloqueada pelo sandbox ao criar pipe temporário (`EPERM`); a prova runtime foi concluída com `node --import tsx` e depois incorporada ao Vitest.
- `git diff --check`: executado; como os arquivos do checkout estão não rastreados, complementado por verificação manual de trailing whitespace, CR e newline final.
- Verificador da base compartilhada: aprovado sem erros (`check-consistency.py --project ...`).
- E2E/integrações/preflights: não executados; Distrobox, Podman e Chromium não estão disponíveis neste executor. Não houve conexão a PostgreSQL. A execução runtime do adaptador Better Auth foi feita pelo handler em memória, mas a regressão de integração do CRM permanece pendente no Bazzite.
- Destinos externos de logs: não avaliados.

## Risco residual e operação

As exceções passam a perder mensagem e stack no logger próprio; para investigação, operação, categoria, severidade e códigos seguros são preservados, mas pode ser necessário um fluxo restrito separado para diagnóstico profundo. Não adicionar payloads ou exceptions brutas a esse fluxo sem controles de acesso, retenção e sanitização definidos. Logs técnicos permanecem distintos de auditoria de negócio. A ausência de Podman/Distrobox/Chromium impediu a regressão completa do CRM; a integração Better Auth foi validada isoladamente em memória, não por meio de uma sessão real do app.

## Regressão integrada e verificação de encerramento — 2026-11-03

Esta seção registra uma nova execução. O código de produção, o logger, os testes e as versões de dependências não foram alterados nesta rodada.

### Ambiente efetivo

`pwd`, `uname -srm` e `/etc/os-release` identificaram o projeto esperado em um executor com userspace Debian 12 e kernel `7.2.9-ogc3.1.fc44.x86_64`. Isso não comprova acesso ao host Bazzite. `command -v` não localizou Podman, Distrobox, PostgreSQL (`psql`, `postgres`, `initdb`) ou Chromium no PATH. Logo, rootless Podman e o container `laboratorio-node` não puderam ser verificados.

O executável Chromium gerenciado pelo Playwright existe em disco. Uma chamada independente `chromium.launch({headless: true, timeout: 15000})` falhou com permissão negada (`Operation not permitted`) e encerramento durante a inicialização; não foi detectado erro de biblioteca compartilhada ausente. Não foram usadas opções para contornar o sandbox. A menção anterior a Chromium indisponível deve ser entendida como indisponibilidade de execução; não ausência do binário.

A existência de `~/.config/crm-test/connection.env` foi verificada sem leitura de seu conteúdo. Isso não comprova que uma instância existente seja descartável. Nenhuma conexão foi tentada: esta tarefa exige recursos novos e descartáveis, e não foi possível provisioná-los no executor. Não houve migration, bootstrap, criação de container ou acesso a volumes/bancos preexistentes.

### Dependências e instalação reproduzível

Node `24.22.2`, npm `11.19.1`, Better Auth e memory adapter `1.7.14`, Next.js `16.4.3`, Drizzle `0.45.4`, Vitest `5.0.5` e Playwright `1.64.1` foram conferidos novamente. Para essas dependências, o manifest concorda com a entrada raiz do lockfile e as versões instaladas correspondem às versões travadas.

`npm ls --depth=0` terminou com código 0. Identificou quatro pacotes extraneous na instalação existente: `ajv`, `fast-uri`, `json-schema-traverse` e `require-from-string`. Sua origem não foi determinada, pois o checkout inteiro aparece não rastreado e não fornece um baseline Git confiável; nenhum pacote foi removido ou atualizado.

Para avaliar o bloqueio anterior de cache, foram copiados **somente** `package.json` e `package-lock.json` para um diretório criado por `tempfile.TemporaryDirectory(prefix='crm-f005-install-')`. Ali foi executado `npm ci --ignore-scripts --offline --no-audit --no-fund`, com `DATABASE_URL` removida do ambiente. O comando terminou com **código 0**; o diretório criado e sua instalação foram removidos pelo próprio contexto temporário. Nenhum arquivo `.env*`, código da aplicação ou volume preexistente participou dessa instalação.

Portanto, o erro anterior `ENOTCACHED` não se reproduziu. A instalação offline da árvore travada foi comprovada **sem scripts de lifecycle**. Isso não valida lifecycle/native builds, Chromium, execução do CRM nem seu banco; a instalação funcional original foi preservada.

### Comandos e resultados atuais

| Verificação | Comando/mecanismo | Resultado observado |
|---|---|---|
| TypeScript | `env -u DATABASE_URL npm run typecheck` | Código 0 |
| ESLint | `env -u DATABASE_URL npm run lint` | Código 0, sem apontamentos |
| Unitários e F005 | `env -u DATABASE_URL npm test` | 103 testes, 17 arquivos aprovados |
| Better Auth em memória | Cenário existente em `sec-01b-logging.test.ts`, incluído em `npm test` | Requisição inválida HTTP 400; warning sanitizado; ausência dos marcadores sintéticos nos argumentos capturados |
| Instalação descartável | `npm ci --ignore-scripts --offline --no-audit --no-fund` em diretório temporário | Código 0 |
| Chromium independente | `chromium.launch({headless: true, timeout: 15000})` | Bloqueado por permissão; não é execução E2E |
| PostgreSQL novo e descartável | Preflight de ferramentas | Bloqueado antes de provisionamento |
| Sessão real do CRM, integrações e E2E | Não executados | Dependem do PostgreSQL descartável; E2E também depende do navegador executável |
| Auditoria F001 e preflights M-01/I-01 | Não executados | Sem nova evidência sobre `audit_logs` ou integridade integrada |

O Vitest manteve o aviso não bloqueante de carregamento CommonJS da configuração Vite. Os 103 testes atuais não substituem integração PostgreSQL ou a regressão E2E histórica.

### Logs, cobertura e riscos residuais

Foi repetido o inventário em `src`, `scripts`, `package.json` e configuração Next.js. Os pontos do CRM continuam usando `safeLogger`, e Better Auth recebe `createBetterAuthLogAdapter()`. Os consoles restantes nos scripts operacionais imprimem mensagens estáticas/etapas controladas. Não foram encontrados hooks próprios de `uncaughtException`/`unhandledRejection`, instrumentation/global-error ou integração declarada com os collectors pesquisados. Isso não prova ausência de coleta na infraestrutura.

O teste em memória captura o sink configurado e confirma categoria, severidade e código seguros, além de testar canários em todos os argumentos. Nesta rodada, **não foram capturados stdout/stderr de Next.js, PostgreSQL ou de uma sessão real do CRM**, pois esses processos descartáveis não puderam ser iniciados. Nenhum vazamento integrado foi observado ou descartado por essa ausência de execução.

| Escopo | Estado |
|---|---|
| Implementação da aplicação | Allowlist e sanitização aprovadas nos testes existentes; sem falha nova demonstrada |
| Frameworks/dependências | Better Auth validado em memória; Next.js e driver PostgreSQL integrados não exercitados |
| Infraestrutura/collectors | Destino, retenção, ACL e redaction posterior desconhecidos; verificação operacional independente |

**Decisão: F005 permanece aberta, com encerramento integrado BLOQUEADO pelo ambiente.** O código não foi reimplementado nem houve indício novo que justificasse alterá-lo. A pendência de regressão do CRM é distinta da avaliação operacional dos collectors externos.

### Próxima execução necessária

No Bazzite autorizado, confirmar Podman rootless e Chromium executável, criar somente recursos novos com credenciais sintéticas e registrar sua identidade. Não reutilizar `crm-postgres-test`, volumes ou portas ocupadas sem comprovar que o recurso pertence a esta execução. O harness atual exige `127.0.0.1:5433`, banco `crm_test_isolated` e usuário `crm_test_admin`; se houver conflito com recurso preexistente, interromper o provisionamento. Só aplicar schema depois de comprovar o caráter descartável do novo destino e remover `DATABASE_URL` de todos os processos de teste.

Executar autenticação com usuário sintético e sessão real: login válido/inválido, leitura de sessão, acesso sem sessão e logout; observar handlers de erro e capturar apenas stdout/stderr dos processos criados para a rodada. Procurar canários sintéticos em todos os sinks e preservar somente contagens/eventos sanitizados como evidência. Executar as integrações F001/F002/F003/RBAC, regressão E2E e preflights M-01/I-01 usando o helper de isolamento existente. Confirmar auditoria positiva e rollback sem tratar console como trilha de negócio. A limpeza deve alcançar exclusivamente IDs e recursos criados pela própria rodada.

## Validação integrada F005 — 2026-11-03

Esta atualização registra a execução atual no Bazzite e substitui a decisão de bloqueio por ambiente acima. A seção anterior permanece como histórico. O resultado desta rodada é atual e foi produzido com artefatos descartáveis; não houve acesso a produção ou aos bancos/volumes preexistentes.

### Ambiente e isolamento efetivos

- Host identificado por `/etc/os-release`: Bazzite 44, Linux x86_64, kernel `7.2.9-ogc3.1.fc44.x86_64`.
- `podman info --format '{{.Host.Security.Rootless}}'`: `true`. Distrobox e `laboratorio-node` estavam disponíveis; dentro do container: Node `v24.22.2`, npm `11.19.1`.
- No sandbox, Podman falhou ao ajustar `/run/user/1000/libpod` porque o filesystem é somente leitura. As operações Podman/Distrobox que precisaram sair do sandbox foram autorizadas individualmente; nenhuma permissão global foi alterada.
- O container preexistente `crm-postgres-test` ocupava `127.0.0.1:5433`. Ele não foi consultado por SQL, parado nem modificado. O harness de teste fixa essa porta, então somente a cópia temporária recebeu o ajuste `5433` → `15433` em `src/db/test-url.ts`, `tests/helpers/test-db.ts`, `drizzle.test.config.ts` e no fixture unitário de URL.
- Criada a rede `crm-f005-sec01c-20261103` (`internal=true`, driver `bridge`) e o container `crm-f005-sec01c-pg-20261103`, ID `325d553af3d419d8212072cf0e329952719d48eec462e7250639eef058f4c0cb`, imagem local `docker.io/library/postgres:18` (PostgreSQL 18.6). O container publicou somente `127.0.0.1:15433`, usou `tmpfs` de 512 MiB em `/var/lib/postgresql` e tinha `.Mounts=[]`; nenhum volume foi montado ou criado para persistência.
- Antes de migration e bootstrap, `psql` via TCP confirmou `current_database=crm_test_isolated`, `current_user=crm_test_admin`, porta interna `5432`; o mapeamento externo era `127.0.0.1:15433`. O arquivo de runtime continha `TEST_DATABASE_URL` para esse alvo, `BETTER_AUTH_SECRET` sintético, `BETTER_AUTH_URL`, `NODE_ENV=test` e `CRM_TEST_MODE=1`; `DATABASE_URL` não estava definido.
- A cópia de trabalho ficou em `/tmp/crm-f005-20261103-9mn7_c_i`, sem arquivos `.env*`, `.git`, `node_modules`, `.next`, relatórios ou arquivos nomeados como credenciais/chaves. O Next foi executado em `NODE_ENV=test`; `drizzle.config.ts` (que chama `loadEnvConfig`) não foi usado. A migration usou apenas `drizzle.test.config.ts`, que valida `TEST_DATABASE_URL` diretamente.
- `npm ci --offline --ignore-scripts --no-audit --no-fund` na cópia instalou 455 pacotes com código 0. Nenhum script de lifecycle, download ou alteração de dependência do checkout original ocorreu.

### Inicialização e fluxos de autenticação

`npx drizzle-kit migrate --config=drizzle.test.config.ts` aplicou as migrations no banco novo. O bootstrap OWNER suportado em `scripts/bootstrap-owner.ts` criou um usuário e workspace sintéticos via Better Auth/PostgreSQL; a primeira tentativa parou antes da conexão por nomes com espaços no arquivo shell temporário, sem escrita. Após corrigir apenas esses valores temporários, o bootstrap concluiu. O endpoint normal de cadastro permaneceu desabilitado pela configuração do CRM e respondeu HTTP 400.

Uma spec E2E temporária, adicionada somente à cópia isolada, exercitou Next.js, Better Auth e PostgreSQL. Ela verificou corpo genérico e ausência dos canários, sem imprimir usuário, senha, token ou cookie:

| Fluxo | HTTP | Resultado |
|---|---:|---|
| Consulta de sessão sem autenticação | 200 | Corpo sem usuário/sessão |
| Signup web normal | 400 | Rejeitado conforme configuração `disableSignUp` |
| Login inválido | 401 | Rejeitado; canário não refletido na resposta |
| Login válido do OWNER sintético | 200 | Usuário sintético autenticado |
| Consulta de sessão autenticada | 200 | Sessão presente |
| Logout | 200 | Sessão revogada |
| Consulta após logout | 200 | Corpo sem usuário/sessão |

Na primeira iteração do harness temporário, o logout foi enviado sem `Content-Type: application/json` e recebeu HTTP 415. A requisição de teste foi ajustada ao formato JSON usado pelo cliente Better Auth; a spec completa passou depois, sem alteração da aplicação.

O E2E existente `crm-core-flows.spec.ts` também passou no fluxo de login inválido, login válido, logout e redirecionamento de páginas privadas. O E2E multi-tenant exercitou sessões e isolamento de organização. O teste de F001 em `sec-01b-audit-workspace.test.ts` passou nos caminhos positivo e de falha: evento `audit_logs` persistido junto da mudança no sucesso; na falha injetada, papel revertido, nenhum evento falso e membros da segunda organização inalterados.

### Logs e sinks observados

Os stdout/stderr do runner e do Next.js para a spec F005 foram capturados separadamente em arquivos temporários com permissão restrita e analisados antes da remoção. Houve um evento Better Auth no formato JSON:

```json
{"level":"warn","category":"authentication-error","operation":"auth.api","code":"BETTER_AUTH_LOG_EVENT"}
```

O registro observado continha somente `timestamp`, `level`, `category`, `operation` e `code`; não havia campos adicionais. Os canários de email/senha e as credenciais sintéticas do OWNER não apareceram nos dois streams. Respostas negativas também não refletiram esses marcadores. Node emitiu sete avisos `NO_COLOR`/`FORCE_COLOR`, sem conteúdo de autenticação.

Os logs do container PostgreSQL foram capturados somente para o container desta execução. Houve 35 linhas `ERROR`, todas correspondentes a cenários negativos/assertados das suítes: restrições de membership/tenant, invariantes de OWNER, fixtures duplicadas e injeção da falha `audit_logs.action` do teste F001. As 10 linhas `WARNING` (`there is no transaction in progress`) sucederam falhas esperadas dos triggers de OWNER durante testes de rollback. Nenhum canário ou credencial apareceu. As instruções SQL registradas usavam placeholders; detalhes de erro ainda podem conter IDs/dados das fixtures sintéticas, mostrando que logs do PostgreSQL são um sink distinto e não sanitizado pelo `safeLogger` da aplicação. O initdb também emitiu o aviso padrão de autenticação `trust` para conexões locais, restrito ao container efêmero e à rede interna.

Inventário de sinks no código foi repetido em `src`, `scripts`, `next.config.ts` e `package.json`: handlers do CRM usam `safeLogger`; Better Auth usa `createBetterAuthLogAdapter`; os consoles dos scripts operacionais emitem mensagens/etapas estáticas. Não foi encontrada integração declarada com collector, nem evidência de destino, ACL, retenção ou redaction externos. Esses controles permanecem não verificados.

### Regressão e falhas

| Verificação | Resultado desta execução |
|---|---|
| `npm run typecheck` | Código 0 |
| `npm run lint` | Código 0, sem apontamentos |
| `npm test` | 103 testes em 17 arquivos aprovados |
| `npm run test:integration` | 195 aprovados; 35 skipped em 2 suítes gated |
| `npm run test:e2e` | Chromium operacional; 47 testes: 46 passaram e 1 excedeu o limite global de 30 s |
| Reprodução isolada do teste visual | `ux-visual-audit.spec.ts`, com `--timeout=180000`: passou em 39,6 s; não houve alteração do teste ou da aplicação |
| Spec integrada F005 com Next/Better Auth/PostgreSQL | Passou; códigos HTTP acima; canários ausentes dos sinks capturados |

Os 35 skipped pertencem às suítes gated `RUN_MEMBER_ASSIGNMENT_INTEGRITY_TESTS` e `RUN_TASK_DEAL_CLIENT_INTEGRITY_TESTS` (M-01/I-01), que ficaram fora do escopo F005. Não foram ativadas nem tratadas como falha F005. O único teste E2E reprovado na execução completa era a matriz visual UX: o timeout global de 30 s expirou enquanto aguardava a navegação principal. A reprodução isolada completou em 39,6 s com timeout de teste maior; isso classifica a falha original como limite de duração do teste, sem evidência de defeito de autenticação ou logger. Outros avisos não impeditivos foram a configuração CommonJS/Vite e `NO_COLOR`/`FORCE_COLOR`.

### Decisão atual e encerramento

| Dimensão | Classificação |
|---|---|
| Remediação de código F005 | **Validada e encerrada no escopo da aplicação.** Unitários e caminho Better Auth integrado cobrem allowlist, erros, resposta e ausência dos canários nos sinks capturados. Nenhum arquivo de aplicação foi alterado nesta rodada. |
| PostgreSQL + Better Auth + Next.js | **Integrado e aprovado** no banco descartável; cadastro suportado via bootstrap, sessão criada/consultada/revogada e erro de login tratado. |
| Persistência transacional `audit_logs` | **Aprovada** pelos testes F001 positivos e de rollback executados na suíte de integração. |
| Regressão E2E | Fluxos F005 aprovados. A execução completa registrou um timeout de 30 s em matriz visual; teste isolado passou em 39,6 s com limite adequado. |
| Sinks da aplicação e PostgreSQL | Canários ausentes nos streams observados. Erros PostgreSQL de testes expõem detalhes de fixtures sintéticas; `safeLogger` não controla esse sink. |
| Collectors e controles operacionais externos | **Não validados**: destino, ACL, retenção e redaction continuam desconhecidos. |

A decisão é encerrar a correção F005 no código e na integração do CRM. Isso não encerra a avaliação dos collectors e controles externos, para os quais não há evidência nesta execução. Não houve alteração preventiva nem avanço para outras vulnerabilidades.

### Recursos e arquivos

O único arquivo do repositório modificado nesta rodada é este relatório. A aplicação e seus testes originais permaneceram intactos. A cópia de trabalho continha ajustes temporários do port guard, a spec F005 e dependências offline; os arquivos de runtime continham somente valores sintéticos e tinham modo `0600`. Os container, rede, cópia e arquivos temporários foram identificados como criados por esta execução e foram removidos no encerramento. O container `crm-postgres-test`, a porta `5433`, demais containers, imagens e volumes preexistentes foram preservados.
