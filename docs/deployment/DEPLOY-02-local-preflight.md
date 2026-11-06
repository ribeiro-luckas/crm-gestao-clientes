# DEPLOY-02 — Preflight técnico local

**Período:** 2026-11-03 a 2026-11-04 (America/Recife)  
**Escopo:** validação local para uma futura implantação experimental de desenvolvimento/testes.  
**Decisão:** **APROVADA EM TESTE LOCAL** para o limite de memória de 512 MiB, com as limitações abaixo. Isso não é certificação da Render nem aprovação para produção comercial.  
**Dados:** apenas banco, usuários e registros sintéticos. `.env.local` não foi aberto.

## 1. Resumo executivo

- Typecheck, ESLint, 107 testes unitários e 195 testes de integração passaram. Outros 35 testes de integração foram explicitamente ignorados por condições dos próprios testes. O build de produção passou numa cópia descartável.
- Next.js 16.4.3 iniciou em Node 24.22.2 sob `memory.max=536870912` bytes, sem swap, OOM ou reinício pelo runtime. O roteiro representativo concluiu login, sessão, páginas, consulta/CSV e logout.
- Pico medido do cgroup: **270.782.464 bytes (258,2 MiB)**, margem observada de cerca de **253,8 MiB** até o limite. Durante o roteiro, o cgroup também continha o cliente sintético que emitiu as requisições; o RSS do processo Next foi medido separadamente. Esse pico combinado é conservador para a aplicação sozinha.
- O teste não reproduz a CPU de 0,1 vCPU, a rede externa, TLS público, suspensão/cold start nem os limites operacionais da Render. O PostgreSQL foi local, descartável e sem TLS.
- `render.yaml` declara um Web Service Node Free, sem deploy automático e sem recursos pagos. `/login` serve como liveness da aplicação; não comprova banco/autenticação.
- O runtime usa `pg` + Drizzle e aceita a URL PostgreSQL do Neon com TLS. A URL de runtime deve usar a opção pooled; migrations devem usar URL direta. A configuração local agora exige credencial separada para migrations.
- Git continua sem commits, sem arquivos rastreados e sem remote. Nenhum arquivo foi staged; não houve commit, push, publicação ou deploy.
- G-11 e G-15 permanecem parcialmente validados.

## 2. Ambiente e diagnóstico do TypeScript

| Item | Resultado |
|---|---|
| Sistema host | Bazzite 44.20261023.0, variante Silverblue/Fedora Atomic |
| Podman | rootless, cgroups v2, runtime `crun` |
| Distrobox | 1.8.2.5; container preexistente `laboratorio-node` estava parado e foi iniciado para esta tarefa; permanece preservado |
| Node / npm | Node 24.22.2; npm 11.19.1 |
| Node fixado pelo projeto | `.node-version`: 24.22.1; Render documenta suporte a `.node-version` e, na consulta, seu padrão atual também era 24.22.1 |
| Dependências | `npm ci --no-audit --no-fund` instalou 455 pacotes conforme lockfile; `next`, `tsc`, ESLint, Vitest e Drizzle Kit ficaram disponíveis localmente |

A falha anterior de `tsc` ocorreu porque `node_modules` estava incompleto: não havia `node_modules/.bin/tsc` nem `next`. O diretório do projeto e o script `typecheck` estavam corretos; não era ausência de TypeScript declarada no projeto. A instalação reproduzível pelo lockfile corrigiu o executor. O aviso de scripts de instalação ignorados do npm e avisos de depreciação foram registrados; apesar deles, build e runtime passaram. Não foi instalada ferramenta global no host.

## 3. Validações executadas

Comandos executados com ambiente de processo limpo e valores sintéticos onde aplicável:

| Comando | Resultado |
|---|---|
| `npm run typecheck` | aprovado (`tsc --noEmit`, exit 0), também depois das alterações de configuração de migrations |
| `npm run lint` | aprovado (exit 0), também depois das alterações de configuração de migrations |
| `npm test` | 17 arquivos; **107/107 testes passaram** |
| `npm run test:integration -- --no-file-parallelism --maxWorkers=1 --reporter=dot` | **18 arquivos passaram, 2 foram ignorados; 195 passaram, 35 ignorados**. Rodou apenas no PostgreSQL descartável novo, após as migrations de teste |
| `bash scripts/render-build.sh` | build de produção aprovado na cópia temporária, com instalação offline e variáveis sintéticas; páginas do App Router geradas como dinâmicas |
| `npm run test:e2e` | não executado nesta etapa: não havia browser Playwright instalado/cache disponível no ambiente Node. SEC-02 histórico registra 47/47, mas isso não é evidência de repetição neste preflight |

Uma tentativa inicial de integração terminou com código 137 no runner limitado a 1 GiB, sem evidência conclusiva de OOM. O banco foi configurado numa rede interna nova, o runner foi executado com um worker e 2 GiB, e então os resultados acima passaram. Os 35 skips continuam skips, não são aprovados.

O build foi medido à parte do runtime: duração aproximada de 20,5 s e RSS máximo do processo de build **1.261.088 KiB (aprox. 1,20 GiB)**. Isso não representa o limite do Web Service; Render executa build e runtime em fases distintas. O build offline registrou zero mensagens de socket de rede.

## 4. Teste de runtime e memória — 512 MiB

### Método e isolamento

- Imagem Node 24.22.2 (`node:24-bookworm`) e build de produção Next.js, usando cópia temporária sem `.env*`, `.git`, `.agents` ou dados locais.
- Aplicação num container rootless com `--memory=512m --memory-swap=512m`; `podman inspect` confirmou 536.870.912 bytes. Dentro do container: `memory.max=536870912`, `memory.swap.max=0`.
- Rede Podman nova com `internal=true`, sem saída externa. PostgreSQL 18 também novo, sem volume persistente, com limite de memória próprio de 1 GiB e armazenamento transitório; não foi contado dentro dos 512 MiB da aplicação. Migrations de teste aplicadas somente nesse banco vazio.
- Configuração de Better Auth, URL e usuários inteiramente sintéticos. O cenário de teste criou e removeu fixtures aleatórias por organização. Não foram tentadas conexões externas.

### Medidas

| Fase | Memória do cgroup | RSS do processo Next | Observação |
|---|---:|---:|---|
| Inicialização, ~2 s após `Ready` | 54,1 MiB atuais; pico 57,2 MiB | 121,5 MiB | `next-server` PID 1 |
| Repouso após uma resposta `/login` | 62,2 MiB atuais; pico 90,6 MiB | 130,8 MiB | HTML 200; coleta poucos segundos depois |
| Login e criação de sessão | até 159,6 MiB atuais no cgroup | até 144,3 MiB amostrados após requisições | cgroup inclui o cliente sintético TSX |
| Dashboard autenticado | 195,3 MiB atuais no cgroup | 152,6 MiB | HTML 200 |
| Outras páginas e consultas | 199–203 MiB atuais no cgroup | 156–160 MiB | clientes, negócios, tarefas e atividades; HTML 200 |
| Exportação CSV | 203,3 MiB atuais no cgroup | 159,9 MiB | HTTP 200 e marcador do cliente sintético presente |
| 16 requisições consecutivas | até 211,8 MiB atuais no cgroup; RSS Next até 166,8 MiB | — | quatro rotas, todas HTTP 200; p50 14,6 ms, máximo 24,3 ms |
| Pico total do cgroup no roteiro | **270.782.464 bytes (258,2 MiB)** | — | inclui app, ferramenta TSX/cliente, caches e memória compartilhada |

O pico combinado deixa cerca de **253,8 MiB** de margem. A amostragem de memória por cenário é do cgroup inteiro; não atribui ao Next bytes do cliente que rodou no mesmo container. RSS é uma medida separada do processo Next. A medição não incluiu carga de estresse.

### Cenários funcionais e latência local aproximada

- `/login`: HTTP 200, CSP enforced, resposta HTML em ~41–49 ms nas execuções completas.
- `/dashboard` anônimo: redirecionamento 307 para `/login?reason=session`.
- Autenticação por e-mail e senha sintéticos: HTTP 200 (~87–228 ms); sessão consultada com HTTP 200.
- Dashboard e páginas autenticadas de clientes, negócios, tarefas e atividades: HTTP 200; dashboard ~21–112 ms, demais ~12–31 ms. A faixa inclui primeira renderização/caches frios.
- CSV de clientes: HTTP 200, `text/csv`, continha apenas o marcador sintético criado pelo roteiro.
- Cookie de sessão observado: `Secure`, `HttpOnly`, `SameSite=Lax`; valores de cookies nunca foram registrados.
- Logout: HTTP 200 com payload JSON e sessão subsequente vazia. Uma chamada inicial do roteiro não enviou o `Content-Type` JSON esperado e recebeu 415; corrigido o cliente do teste, o endpoint passou sem alteração no CRM.
- 16 requisições consecutivas: todas HTTP 200; p50 mediano das duas execuções ~14,6–15,4 ms; máximos ~19–24 ms.
- Cabeçalho de CSP: presente em páginas HTML, ausente em respostas de API/CSV conforme o desenho atual. `Content-Security-Policy-Report-Only` não apareceu; nenhuma segunda política foi adicionada pelo proxy local.

Não houve evento `oom`, `oom_kill`, `oom_group_kill`, nem reinício espontâneo. O container de aplicação foi recriado manualmente durante o diagnóstico para corrigir o rótulo SELinux da cópia temporária; o servidor iniciou normalmente depois disso. Esses tempos são loopback local e não estimam latência entre Render e Neon.

### Classificação

**APROVADA EM TESTE LOCAL.** Next iniciou e concluiu cenários representativos sob limite efetivo de 512 MiB, com margem observada e sem OOM. O resultado não garante o comportamento na Render: CPU local não foi limitada a 0,1 vCPU, não houve HTTPS público, tráfego real, cold start da Render, suspensão, concorrência externa ou banco remoto Neon. Manter observação de RAM e erros no ensaio autorizado; não reduzir funcionalidades com base nestes números.

## 5. Avaliação Render

### Contrato e configuração declarativa

`render.yaml` foi parseado localmente com PyYAML e `js-yaml`, e seus nomes/valores foram confrontados com o [contrato oficial do Blueprint](https://render.com/docs/blueprint-spec). A CLI Render não está instalada; nenhuma ferramenta foi instalada para essa validação.

| Campo | Valor local | Avaliação |
|---|---|---|
| Tipo/runtime/plano | `web` / `node` / `free` | valores documentados para Web Service nativo |
| Build | `bash scripts/render-build.sh` | script existente, executável via bash; build sintético aprovado localmente |
| Start | `npm start` | chama `next start`; o comando não fixa porta |
| Porta | variável `PORT` | Next respeita `PORT`; usar a porta injetada pela Render (padrão documentado 10000) |
| Health check | `/login` | propriedade aceita; resposta 2xx/3xx em até 5 s é considerada saudável pela Render |
| Deploy automático | `autoDeployTrigger: off` | campo válido; exige deploy manual |
| Secrets | `BETTER_AUTH_SECRET`, `DATABASE_URL` com `sync: false` | configuração declarativa não contém valores sensíveis |
| URL pública | `BETTER_AUTH_URL` via `fromService` usando `RENDER_EXTERNAL_URL` | self-reference documentada; produz URL pública HTTPS da Render |
| Recursos pagos | nenhum | não há banco Render, worker, disco, domínio, cron ou plano pago declarado |

### Health check e HTTPS

`/login` comprova que Next está aceitando e renderizando a interface. A página não consulta o banco; portanto, 200 no health check **não** comprova que Better Auth ou PostgreSQL funcionam. Manter este endpoint como liveness, simples e barato. Readiness de banco/autenticação deve ser validada por roteiro manual pós-deploy, usando login sintético, sem retornar exceções, URL ou estado interno num endpoint público e sem consultar o banco a cada health probe.

Render encerra TLS na borda e disponibiliza `RENDER_EXTERNAL_URL` com esquema HTTPS. O app deve receber essa URL em `BETTER_AUTH_URL`, que também é a única origem confiável configurada pelo Better Auth. O smoke local confirmou os atributos do cookie sob `NODE_ENV=production`, mas HTTP local não prova o fluxo real de TLS/proxy. Depois da publicação manual, conferir que a URL é HTTPS, que há apenas um header CSP enforced e que a resposta não tem `Report-Only`.

## 6. Avaliação Neon e migrations

### Driver, TLS e pool

- Runtime atual: `pg` 8.23.1 (`node-postgres`) com Drizzle `node-postgres`; não usa driver Edge/serverless. Neon oferece protocolo PostgreSQL padrão e documenta `pg` como cliente suportado.
- O pool da aplicação tem máximo 10 conexões por processo. Para esse Web Service único, usar no runtime a connection string **pooled** do Neon (`-pooler` no hostname) com TLS (`sslmode=require`; manter os parâmetros TLS que o Neon entregar, inclusive channel binding se presente). O Neon usa PgBouncer em modo transaction: adequado ao uso web curto do CRM, mas não usar recursos dependentes de estado de sessão. Pooling é suportado no Free.
- Para Drizzle Kit/migrations, usar connection string **direta**, sem `-pooler`, também com TLS. A documentação Neon recomenda direct para schema migrations e pooled para web apps. O código não inclui URL nem senha embutida.
- `src/db/index.ts` lê apenas `DATABASE_URL` no runtime. `drizzle.config.ts` usa `DATABASE_URL_MIGRATIONS` e não cai mais para `DATABASE_URL`. `npm run db:migrate` aponta para `drizzle.migrate.config.ts`, que falha fechado se `DATABASE_URL_MIGRATIONS` não estiver presente. `scripts/debug-migrate.mjs` também exige essa variável e já não carrega automaticamente arquivos de ambiente. `DATABASE_URL` é só para runtime; não conceder a esse role ownership nem privilégios de administração.
- Criar um role runtime separado com privilégios DML mínimos para as tabelas/sequências necessárias e um role de migration separado com os privilégios de DDL estritamente necessários. Configurar grants/default privileges para novas tabelas e sequências que as migrations criarem. Não executar migration no startup, em `preDeployCommand` ou automaticamente pelo Blueprint.

Não foi criado projeto Neon nem testada conexão TLS, criação de role, grants, PgBouncer, timeouts após scale-to-zero, ou limite real de conexões. O Free atual permite pooling e indica, por projeto, 100 CU-hours/mês, 1 GB de banco, máximo 2 CU, 10 branches, 5 GB de transferência pública e scale-to-zero após 5 minutos; exceder limites pode suspender o compute. Confirme a página atual antes de criar. A página atual lista apenas uma snapshot e janela limitada de restauração; isso não foi testado nem substitui backup/restore. [Neon pricing](https://neon.com/pricing), [conexão de aplicações](https://neon.com/docs/connect/connect-from-any-app), [pooling e modo transaction](https://neon.com/docs/connect/connection-pooling), [TLS em `pg`](https://node-postgres.com/features/ssl).

A página pública do plano não indica limitação que impeça roles PostgreSQL separados. Isso não comprova que o role administrativo inicial do projeto poderá delegar os grants necessários no projeto/conta que vier a ser criado. Confirmar criação de roles e `ALTER DEFAULT PRIVILEGES` no banco experimental autorizado; se não for possível, parar e revisar o desenho. Não usar role proprietário como credencial runtime para contornar a limitação.

### Procedimento futuro de migrations

1. Somente após autorização, criar um projeto Neon Free novo e confirmar que está vazio, na região a decidir junto da Render. Guardar credenciais na ferramenta de segredos aprovada; não as pôr em Git, comando literal, logs, screenshot ou `.env.local`.
2. Criar/confirmar roles distintos: migration direto com TLS e menor privilégio suficiente para DDL; runtime com TLS e pooled URL, apenas DML requerido. Definir grants/default privileges para objetos criados pelo migrator.
3. Revisar o alvo pelo nome da branch, banco e role no painel. Não apontar para banco existente. O deploy Render não executa migration.
4. Injetar `DATABASE_URL_MIGRATIONS` em processo pontual autorizado a partir do gerenciador de segredos; executar `npm run db:migrate` uma única vez no banco novo e vazio. Se a variável faltar, o script deve falhar. Não copiar URL para histórico de shell.
5. Remover a variável pontual do processo/ambiente. Configurar no runtime Render apenas `DATABASE_URL` com URL pooled e credencial de app. Verificar no Neon que autenticação funciona com role de runtime sem DDL/ownership.
6. Em migrations posteriores, obter autorização específica, backup/export e plano de rollback antes de aplicá-las; este preflight não autoriza alteração de banco.

## 7. Segurança da publicação experimental

- `BETTER_AUTH_SECRET`: obrigatório pelo código e precisa ter no mínimo 32 caracteres; gerar valor aleatório próprio para o ambiente e inserir diretamente no gerenciador de segredos Render. Não reutilizar o valor sintético do teste.
- `DATABASE_URL`: credencial runtime da Neon, somente no secret store Render; TLS obrigatório e URL pooled. `DATABASE_URL_MIGRATIONS`: não declarar no Web Service; manter fora do runtime normal e injetar apenas durante migration autorizada.
- `BETTER_AUTH_URL`: URL HTTPS pública única; a configuração usa também essa URL como `trustedOrigins`. Não usar URL `http` nem curingas em produção.
- `Secure`/`HttpOnly`/`SameSite=Lax`: cookie sintético foi observado com esses atributos em `NODE_ENV=production`. Reconfirmar no domínio `onrender.com` após TLS.
- Cadastro normal está desabilitado (`disableSignUp` fora do modo bootstrap), criação de organizações pelo público está desabilitada; a senha mínima é 12 caracteres. `scripts/bootstrap-owner.ts` é operação pontual controlada com `CRM_OWNER_*`; não executar no deploy e não habilitar signup para contorná-lo. Após autorização e aplicação das migrations, executar bootstrap uma vez com e-mail e senha sintéticos, longos e exclusivos, via ambiente temporário seguro; remover as variáveis imediatamente e confirmar login/logout.
- Better Auth 1.7.14 habilita limitador por padrão em produção (janela geral 10 s/100 requests; rotas de sign-in/sign-up têm regra 3/10 s) e o armazenamento padrão é memória. A versão instalada confirma esses valores; a [referência Better Auth](https://better-auth.com/docs/reference/options) também documenta o default. O contador não é compartilhado e reinicia com a instância; Free usa uma instância, mas abuso persistente e limites após restart requerem observação. O teste de memória não executou carga de rate limit.
- CSP enforced com nonce foi observada nas páginas HTML do runtime local; não adicionar header CSP no Render, CDN ou proxy. Investigar somente se houver duplicidade real no deploy.
- Rotas administrativas/alterações de membro e exportação dependem de autenticação, papel e organização; o roteiro local confirmou acesso anônimo bloqueado e exportação autenticada sintética. A integração histórica e os testes atuais não substituem teste multi-tenant após deploy. Usar uma segunda organização/usuário somente sintéticos.
- O logger da aplicação limita campos e remove detalhes do erro; autenticação e bootstrap têm saídas sanitizadas no código. Ainda revisar logs reais do provedor após ensaio; G-11 continua parcial porque ACL/retenção do collector não foram verificadas.
- Não cadastrar usuário público. OWNER inicial via bootstrap pontual e autorizado. Criar usuários e clientes inteiramente fictícios. Remover fixture e encerrar a publicação ao finalizar a demonstração.

## 8. Auditoria do repositório e inventário do commit inicial

### Estado e arquivos locais

- Raiz confirmada: `/var/home/ribeiroluckas/Ambiente/Projetos/crm-gestao-clientes`; branch `master`; zero commits, zero arquivos rastreados e nenhum remote.
- A lista de candidatos versionáveis tinha 224 arquivos após excluir build/teste, backup, cache de TypeScript e symlink externo. `.gitignore` agora cobre `.agents/`, `.knowledge-base-path`, `artifacts/`, `screenshots/`, `traces/`, `*.trace.zip`, `*.bak`, `*.tsbuildinfo`, `.env*` (com exceção de `.env.example`), `node_modules/`, `.next/`, logs e saídas de teste.
- `.agents/skills/engineering-knowledge` é symlink para fora do repositório; não o seguir nem incluir. `.knowledge-base-path` é referência local externa e também fica excluída.
- Foram identificados sem leitura: `.env.local` (ignorado por `.env*`), `node_modules/`, `.next/`, `artifacts/` e `test-results/`. `.env.local` não foi aberto em nenhum momento.
- Varredura de candidatos excluindo segredos ignorados procurou PEM private keys, URLs PostgreSQL com usuário/senha, token JWT, padrões de access key, atribuições de secret/password e e-mails que não fossem domínios de exemplo. As ocorrências encontradas estavam em `.env.example`, fallback `invalid`, build sintético, documentação com URLs placeholder e fixtures/examples de teste/formulário. Nenhum valor foi reproduzido neste relatório. Isso é triagem por padrões, não detector de segredos completo; revisar manualmente o staging antes do commit. A ausência de commits impede análise histórica; não foi possível inspecionar histórico remoto.
- `package.json` e `package-lock.json` existem; lockfile npm v3. `package.json.bak` é backup local e fica ignorado. `tsconfig.tsbuildinfo` foi criado pelo typecheck e fica ignorado. Logs de migração/build em `artifacts/`, `.next`, dependências, screenshots/traces em relatórios de teste e bancos locais não devem entrar no commit.
- Nenhum `.gitignore` global foi alterado; o `.gitignore` do projeto dá regra explícita a artefatos locais.

### Inventário exato recomendado

Depois de revisar cada nome staged, o conjunto do commit inicial deve ser formado somente por:

```text
.env.example  .gitignore  .node-version
AGENTS.md  CLAUDE.md  GEMINI.md  README.md
docs/  drizzle.config.ts  drizzle.migrate.config.ts  drizzle.test.config.ts
eslint.config.mjs  next-env.d.ts  next.config.ts
package.json  package-lock.json  playwright.config.ts  postcss.config.mjs
render.yaml  scripts/  src/  tests/  tsconfig.json
vitest.config.ts  vitest.integration.config.ts
```

`docs/` inclui documentação necessária, relatórios SEC históricos preservados e este relatório; `src/db/migrations/` inclui as migrations SQL versionadas. Excluir `.env.local`, `.agents/`, `.knowledge-base-path`, `node_modules/`, `.next/`, `artifacts/`, `test-results/`, `playwright-report/`, screenshots/traces avulsos, bancos/backups, `package.json.bak` e `tsconfig.tsbuildinfo`.

Comando sugerido **para depois da autorização explícita** (não executado neste preflight):

```bash
git add .env.example .gitignore .node-version AGENTS.md CLAUDE.md GEMINI.md README.md docs drizzle.config.ts drizzle.migrate.config.ts drizzle.test.config.ts eslint.config.mjs next-env.d.ts next.config.ts package.json package-lock.json playwright.config.ts postcss.config.mjs render.yaml scripts src tests tsconfig.json vitest.config.ts vitest.integration.config.ts
git diff --cached --check
git status --short
```

Revisar a lista staged e repetir a triagem de segredos antes de `git commit`. Não configurar remote nem fazer push sem autorização separada.

## 9. Procedimento manual de publicação após aprovação

1. Obter aprovação explícita para criar o repositório Git **privado**, ligar a integração Git e criar um Web Service Render e um projeto Neon Free. Nenhum desses recursos existe por causa deste trabalho.
2. Revisar o staging candidato e então criar o commit inicial. Configurar o remote privado somente após autorização, publicar a branch escolhida e confirmar que não houve arquivo `.env*` com valor sensível.
3. Conferir preços/limites do Render e Neon, gasto máximo, região, forma de cobrança e regras de upgrade. Manter Free, auto deploy off e sem serviços pagos. Não prosseguir se a tela solicitar plano pago ou exceder o teto aprovado de R$ 50/mês.
4. Criar projeto Neon Free novo; conferir cotas e custos variáveis. Criar roles separados runtime/migration. Não importar dados existentes.
5. Aplicar migrations apenas pelo procedimento da seção 6. A aplicação não deve iniciar antes de schema e role runtime estarem prontos.
6. Criar serviço Render a partir do Blueprint, revisar cada recurso proposto antes de confirmar. Inserir `BETTER_AUTH_SECRET` e `DATABASE_URL` diretamente no gerenciador Render; conferir `BETTER_AUTH_URL` como HTTPS público. Não adicionar credenciais ao build ou repositório.
7. Fazer build e publicação manual. Como `autoDeployTrigger` é `off`, commits seguintes não devem publicar automaticamente. Revisar log do build por segredos antes de prosseguir.
8. Executar a checklist pós-deploy com usuário, organização e clientes sintéticos. Se houver falha, suspender/retirar o serviço e corrigir sem habilitar signup ou migrar automaticamente para plano pago.

## 10. Checklist pós-deploy

- [ ] URL pública responde por HTTPS e certificado é válido.
- [ ] `/login` retorna página; registrar que isso é liveness, não prova de banco.
- [ ] OWNER sintético consegue autenticar; cadastro público continua desabilitado.
- [ ] `/api/auth/get-session` retorna sessão só quando autenticado.
- [ ] Dashboard, clientes, negócios, tarefas e atividades protegem rotas anônimas.
- [ ] Cookie da sessão possui `Secure`, `HttpOnly`, `SameSite=Lax`; sessão não é emitida em origem não confiável.
- [ ] CSP enforced está presente nas páginas HTML com nonce; não existem duas políticas nem `Report-Only` inesperado.
- [ ] Comunicação com Neon usa TLS e role runtime, sem usar `DATABASE_URL_MIGRATIONS` no processo Render.
- [ ] Aplicação grava e consulta clientes fictícios na organização sintética.
- [ ] CSV exportado contém somente dados sintéticos da organização autenticada; testar escape de fórmula conforme a matriz SEC existente.
- [ ] Logout invalida a sessão e uma rota privada volta a redirecionar.
- [ ] Conferir logs Render/Neon por erros sanitizados e ausência de senha, token, cookie, URL, corpo privado ou PII real.
- [ ] Deixar serviço sem tráfego até observar suspensão; depois medir cold start/retomada, revalidar login, DB, CSP, cookies e logs.
- [ ] Repetir os cenários após restart do serviço e do compute Neon; observar conexões recusadas e limite de RAM. Free pode suspender por cota e perder arquivos locais.
- [ ] Registrar versões, RSS/pico, eventos de restart/OOM, latências e consumo de cota. G-11/G-15 só mudam com evidência própria.

## 11. Riscos, pendências e critério de migração

1. O ensaio local não valida HTTPS da borda, cabeçalhos forwarded, cold start/cota Render, CPU limitada ou TLS contra Neon real.
2. Configuração de role runtime, grants/default privileges, pooling, comportamento de retomar compute e migrations na Neon permanecem pendentes de serviço novo autorizado.
3. Health check HTTP do login não testa DB. Não adicionar um ping DB custoso em cada probe.
4. Limitador em memória reseta em reinício; não é defesa distribuída. O serviço gratuito só tem uma instância neste desenho.
5. Render Free pode dormir e reiniciar, possui filesystem efêmero e limites de uso; Neon Free tem cotas por projeto e pode suspender compute ao excedê-las. Sem SLA, backup programado comprovado ou aprovação de produção.
6. Logs externos, ACL/retenção, abuse monitoring e rate limit após restart precisam de validação. G-11 e G-15 continuam parciais.
7. E2E de navegador não foi repetido por falta de browser; a aprovação SEC histórica não substitui confirmação pós-deploy.

Migrar para plano pago/destino diferente somente mediante decisão explícita, orçamento mensal total até R$ 50 aprovado e custo variável documentado. Reavaliar se houver dados não fictícios, necessidade de disponibilidade/backup/retention, cotas, memória/CPU, conexões, cold starts ou observabilidade insuficientes. Nunca atualizar automaticamente. O presente resultado não aprova produção comercial.

## 12. Arquivos, recursos temporários e limpeza

Arquivos versionáveis alterados nesta execução:

- `.gitignore` — exclusões explícitas de cache, backups, dados de agente e artefatos.
- `package.json` — `db:migrate` usa config separada.
- `drizzle.config.ts` — não usa mais `DATABASE_URL` como fallback de migrations.
- `drizzle.migrate.config.ts` — config nova, bloqueia sem `DATABASE_URL_MIGRATIONS`.
- `scripts/debug-migrate.mjs` — exige credencial de migration e não carrega automaticamente `.env.local`.
- `docs/knowledge/INDEX.md` — referência ao resultado local de deploy.
- `docs/deployment/DEPLOY-02-local-preflight.md` — este relatório.

Recursos criados exclusivamente para este preflight: diretório descartável em `/tmp`, container PostgreSQL com tmpfs/sem volume, proxy TCP temporário, container Next 512 MiB e rede interna Podman. Os clients/runner de migrations e testes foram `--rm`. O proxy não encerrou em 10 s com SIGTERM e recebeu SIGKILL ao parar; foi removido e a porta foi conferida sem listener após a limpeza. O container preexistente `laboratorio-node` foi iniciado, mas não removido. Nenhum container/volume/banco preexistente foi removido ou acessado.

Antes do encerramento, parar/remover apenas os containers com prefixo `crm-deploy02-`, remover somente a rede `crm-deploy02-net-20261103` e apagar somente `/tmp/crm-deploy02-preflight-8_wv4rej`, após este relatório estar salvo. Conferir que as portas temporárias 5433 e 3100 não têm listeners e que os recursos preexistentes continuam intactos.

## 13. Próxima execução

1. Revisar este relatório e o inventário do primeiro commit.
2. Autorizar separadamente o commit inicial; inspecionar staging e criar o commit sem remote.
3. Autorizar repositório privado e publicação da branch, se essa interação ainda for desejada.
4. Antes de criar serviços, obter aprovação explícita para Render/Neon e conferir limites/cobrança vigentes.
5. Executar migrations e bootstrap OWNER apenas conforme a autorização específica e roteiro acima.
6. Fazer publicação manual e concluir checklist; somente então decidir sobre continuar o experimento.
