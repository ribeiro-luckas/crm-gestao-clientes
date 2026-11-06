# DEPLOY-01 — Preparação para Render Free + Neon Free

**Data da avaliação:** 2026-11-03  
**Escopo:** preparação técnica e roteiro manual para uma implantação experimental de demonstração/testes.  
**Status:** preparado para aprovação; nenhum serviço, conta, banco, migration ou deploy foi criado/executado. Nenhuma credencial real ou `.env.local` foi lida.  
**Dados permitidos:** somente usuários e registros fictícios.

## 1. Recomendação

O projeto já contém uma configuração declarativa de Web Service Node no [render.yaml](../../render.yaml), um script de build com credenciais sintéticas temporárias e uma versão Node fixada em [.node-version](../../.node-version). A configuração foi completada com health check HTTP em `/login`. O runtime atende tecnicamente ao modelo Node.js do Render; o banco usa `pg` + Drizzle sobre PostgreSQL padrão, compatível com Neon por TLS.

Use Render Free e Neon Free somente para este ensaio. Não habilite cobrança, upgrade automático, domínio próprio, auto deploy ou recursos pagos. O teto aprovado é R$ 50/mês, mas este roteiro visa custo nominal zero e exige que o responsável confira a tela de cobrança e os limites atuais antes de criar qualquer recurso. Os tiers gratuitos são sujeitos a suspensão, scale-to-zero, limites e mudanças do fornecedor; não sustentam disponibilidade ou retenção comercial.

**Não é aprovação para produção comercial.** G-11 (logs com ACL/retenção do provedor) e G-15 permanecem parcialmente validados, conforme a decisão SEC-02C.0. A hospedagem pública aumenta exposição e precisa de aprovação explícita do responsável antes de qualquer passo de criação/publicação.

## 2. Compatibilidade avaliada

| Tema | Evidência e conclusão | Limite |
|---|---|---|
| Node.js | `.node-version` fixa `24.22.1`; Next está fixado em `16.4.3`, React em `19.3.1`; o ambiente local disponível reporta Node `24.22.2`. Render aceita Node nativo e lê `.node-version`. | Compatibilidade do código/provedor é forte; ainda não houve build no builder Render. |
| Build | `npm run build` é o script de produção. `bash scripts/render-build.sh` remove `BETTER_AUTH_SECRET`, `DATABASE_URL` e `BETTER_AUTH_URL` herdados do ambiente de build e usa somente valores sintéticos efêmeros para `npm ci` e `next build`. | Build histórico foi aprovado em ambiente isolado; esta etapa não repetiu o build Render. Confirmar ausência de segredos reais no ambiente de build ao criar serviço. |
| Inicialização e porta | `npm start` executa `next start`; Next lê `PORT` do ambiente. Render injeta `PORT` (padrão `10000`); não fixar porta no comando. | A inicialização pelo processo gerenciado ainda precisa ser confirmada no primeiro deploy autorizado. |
| Runtime PostgreSQL | `src/db/index.ts` usa `pg.Pool` e `drizzle-orm/node-postgres`. Pool máximo atual: 10 conexões por processo. `pg` aceita a connection string PostgreSQL TLS do Neon; não é necessário trocar para driver serverless/Edge. | Pool máximo é limite, não conexões sempre abertas; concorrência, retomada do banco suspenso e carga de uso ainda não foram medidas. |
| Memória | **Não medida em execução de 512 MB nesta etapa.** O plano Free do Render anuncia 512 MB, mas o projeto não foi iniciado em ambiente descartável: as instruções locais proíbem iniciar containers/bancos sem solicitação explícita e o escopo veda acessar bancos existentes. | Não declarar compatibilidade de memória como aprovada. Medir após autorização, em recurso novo descartável ou no serviço experimental, registrando RSS/peak, reinícios e logs; interromper sem reduzir funcionalidades sem evidência. |
| CSP e nonce | `src/proxy.ts` gera nonce aleatório por leitura de documento, encaminha CSP no request para o Next e envia uma única `Content-Security-Policy` enforced em produção. `next.config.ts` não declara CSP adicional. O matcher exclui API, estáticos, imagens, arquivos e prefetch conforme desenho SEC-02C.0. | O Render não deve adicionar CSP. A política CSP completa precisa ser capturada no tráfego real após deploy. |
| Renderização dinâmica | Root layout usa `connection()` (conforme SEC-02C.0) e layout autenticado declara `force-dynamic`; nonce por documento não é compatível com servir HTML previamente renderizado/cacheado entre usuários. `/login` serve health check sem exigir uma sessão. | Não habilitar cache de HTML no proxy/CDN. O health check confirma resposta do app, não conectividade nem prontidão do banco. |
| HTTPS/cookies | TLS gerenciado é suportado nos Web Services Render. Better Auth usa `advanced.useSecureCookies` quando `NODE_ENV=production`; `npm start` em serviço Render roda produção. `BETTER_AUTH_URL` aponta para a URL pública HTTPS e também é a trusted origin configurada pelo app. | Confirmar `Secure`, `HttpOnly`, `SameSite` e ausência de cookies sobre HTTP no navegador após publicação. Não configurar `trust proxy`/hosts dinamicamente nem adicionar origens curingas sem mudança de projeto revisada. |
| Erros/logs/rate limit | O logger allowlistado F005 sanitiza os sinks próprios da aplicação e os endpoints retornam mensagens controladas conforme evidências históricas. Rate limit Better Auth é por processo/em memória (SEC-02C.0). | Logs internos Node/Next/pg e controles do collector Render não estão cobertos pelo logger. Reinícios limpam rate limit; plano grátis não substitui proteção compartilhada contra abuso. |

### Medição de memória pendente

Não foi coletado RSS, heap, pico, OOM ou falha de inicialização em 512 MB. A etapa não acessou `node_modules/.bin/next` para executar o servidor nem iniciou banco/container. Depois da autorização de deploy, observar pelo menos: boot a frio; `/login`; login sintético; dashboard; listagens; criação/CSV; retomada após sleep; memória máxima/uso da instância e eventos de restart/OOM nos logs. Repetir fluxos durante a mesma execução, pois o máximo de heap do Node não representa toda a RAM do processo e dependências nativas/runtime também consomem memória. Não baixar heap ou remover funcionalidades sem reproduzir pressão de memória.

## 3. Configuração Render recomendada

O [render.yaml](../../render.yaml) declara:

- tipo `web`, runtime `node`, plano `free`;
- build `bash scripts/render-build.sh`;
- start `npm start`;
- `autoDeployTrigger: off`;
- health check HTTP `GET /login`;
- `.node-version` como versão Node (24.22.1);
- `BETTER_AUTH_SECRET` e `DATABASE_URL` como valores `sync: false`, preenchidos manualmente no painel;
- `BETTER_AUTH_URL` referenciando a URL pública da própria aplicação (`RENDER_EXTERNAL_URL`), sem valor de segredo.

Render envia tráfego ao `PORT` que injeta no serviço. A configuração não deve fixar `3000` nem adicionar regras de CSP no Render. TLS é terminado pelo edge gerenciado; preservar os headers do Next e não cachear respostas HTML autenticadas ou CSP/nonce entre requests. A política HSTS tem owner único no edge/provedor se for habilitada; verificar se já é enviada antes de configurar. Não acrescentar HSTS com subdomínios/preload por padrão.

O health check `/login` retorna sucesso se o processo Next serve a página; ele não deve depender de acesso a Neon. Isso detecta falha HTTP do web process, mas não indisponibilidade do banco. Uma conexão de banco pode falhar somente quando houver requisição que a utilize.

### Variáveis Render

| Chave | Onde | Regra |
|---|---|---|
| `BETTER_AUTH_SECRET` | Runtime | Segredo aleatório criptograficamente forte, mínimo 32 caracteres; gerar e inserir diretamente no gerenciador de segredos do Render. Valor separado do build/local. |
| `BETTER_AUTH_URL` | Runtime | URL HTTPS canônica exata do serviço. Blueprint usa `RENDER_EXTERNAL_URL`; após a criação, conferir URL e trusted origin em runtime. Sem barra/caminho extra. |
| `DATABASE_URL` | Runtime | Neon pooled URL com TLS (`sslmode=require`; adicionar `channel_binding=require` se a combinação de cliente suportar, testar no primeiro deploy). Usar role runtime de privilégio mínimo. Nunca URL direta/migration role aqui. |
| `NODE_ENV` / `PORT` | Plataforma | Render define `NODE_ENV=production`; Render define `PORT`. Não cadastrar valores substitutos. |
| `DATABASE_URL_MIGRATIONS` | Somente processo manual separado | Não cadastrar no Web Service. URL direta do Neon e role de migration, disponível temporariamente só ao processo de migration, depois remover/unset. |
| `CRM_OWNER_EMAIL`, `CRM_OWNER_PASSWORD`, `CRM_OWNER_NAME`, `CRM_ORGANIZATION_NAME`, `CRM_ORGANIZATION_SLUG` | Somente bootstrap manual único | Não cadastrar como variáveis permanentes. Inserir temporariamente no ambiente do job/admin aprovado e remover após bootstrap. Somente usuário sintético. |

O script de build não precisa de credenciais reais: cria um segredo sintético aleatório de 32 bytes e uma URL PostgreSQL loopback fictícia para satisfazer imports/configuração do build; ele não inicia banco. Não inserir segredos do runtime no builder ou em `render.yaml`. Se o build falhar, investigar o log sanitizado e conservar a separação; não “corrigir” passando segredos reais ao build.

## 4. Configuração Neon recomendada

Após autorização explícita para criar o recurso, criar um projeto/branch novo e vazio para demonstração. Selecionar uma região próxima ao serviço Render quando ambas as opções gratuitas disponíveis permitirem; confirmar região/latência e limites no painel. Não reutilizar um banco existente.

### URLs e roles separados

1. **Runtime:** URL pooled (`-pooler` no hostname) com TLS. A aplicação mantém um `pg.Pool` de no máximo 10 conexões por processo. Neon recomenda pooler para muitas conexões concorrentes e o endpoint pooled funciona com PostgreSQL padrão/`pg`; monitorar limites, espera, conexão após scale-to-zero e queries.
2. **Migrations:** URL direta (hostname sem `-pooler`) com TLS. O `drizzle-kit migrate` precisa de execução controlada, sem transação via PgBouncer/session features. Use credencial de migration separada e temporária.
3. **Privilégios:** não usar role owner/admin do Neon no `DATABASE_URL` do Web Service. Criar role `crm_runtime` com somente permissões DML necessárias ao schema/tabelas/sequências da aplicação; reservar owner/role de migration para migrations, com DDL. Como a versão inicial de uma base vazia precisa criar schema, a primeira migration deve usar a identidade de migration autorizada, em sessão manual isolada. Revise e teste grants efetivos antes de ligar o runtime.
4. Exigir TLS (`sslmode=require`) na URL. Não remover parâmetros TLS, não desativar validação do cliente por configuração ad hoc e nunca imprimir/copiar URLs em artefatos ou logs.

`drizzle.config.ts` agora prioriza `DATABASE_URL_MIGRATIONS` e mantém `DATABASE_URL` como fallback para compatibilidade local. No ambiente Render, configure somente `DATABASE_URL` pooled. Para operações de schema, forneça temporariamente `DATABASE_URL_MIGRATIONS` ao comando `npm run db:migrate` no ambiente local/CI controlado; não faça migration de um banco existente ou de produção nesta preparação.

O pooler Neon usa transaction pooling; não depender de estado de sessão entre transações. O código atual usa `pg.Pool` Node e Drizzle `node-postgres`, sem adapter serverless. Ainda é necessário validar comportamento efetivo de TLS, conexão pooled, cold start e consultas após suspensão em uma branch Neon recém-criada.

## 5. Sequência manual após aprovação

Cada ação abaixo que cria ou publica recursos depende de aprovação explícita do responsável. Esta documentação não dispara nenhuma dessas ações.

1. **Aprovar o ensaio e os limites.** Confirmar uso exclusivamente sintético; verificar preços/limites e políticas de suspensão vigentes nos painéis; não cadastrar pagamento nem habilitar upgrade automático. Confirmar que não há cobrança incidental aprovada.
2. **Preparar código para publicação.** Revisar o diff local, criar commits somente após decisão do responsável, publicar o repositório em GitHub/GitLab por ação humana autorizada e manter o repositório privado. Nesta tarefa o repositório não tem commits e nenhum arquivo foi enviado.
3. **Criar banco Neon experimental.** Em conta autorizada, criar branch/projeto novo. Criar role de runtime com privilégio mínimo e role de migration separada. Guardar URLs somente no secret manager/prompt protegido, sem `.env.local`, chat, shell history ou Git.
4. **Criar Web Service Render via Blueprint** conectando o repositório publicado; selecionar `render.yaml`, escolher `Free`, verificar que auto deploy está desligado e revisar cada mudança proposta antes de aplicar. Essa ação cria o serviço e pode disparar build/deploy; não prosseguir sem autorização explícita para ambos.
5. **Definir variáveis diretamente no painel do Render.** `BETTER_AUTH_SECRET`, `DATABASE_URL` pooled do role runtime e `BETTER_AUTH_URL` HTTPS canônica. Conferir `BETTER_AUTH_URL` depois da criação do serviço. Não preencher valores no repositório. Se o Blueprint não resolver a referência self-referential, preencher a URL exata manualmente no painel.
6. **Executar migration inicial em banco novo e vazio**, fora do start web: fornecer `DATABASE_URL_MIGRATIONS` direta temporária e executar `npm run db:migrate` em ambiente Node 24.22.1 contendo código/lockfile da mesma revisão aprovada. Conferir `public.drizzle.__drizzle_migrations` e tabelas esperadas sem imprimir URL. Não usar `db:push`, não executar contra banco existente e não colocar migration no startup.
7. **Criar o OWNER sintético inicial uma única vez.** Após a migration e com aprovação, executar `npm run bootstrap:owner` em processo administrativo temporário com `DATABASE_URL`/conexão direta de bootstrap e somente valores fictícios para as cinco variáveis `CRM_OWNER_*`/`CRM_ORGANIZATION_*`. O script exige `public.user`, `public.organization` e `public.member` vazias e não remove estado parcial automaticamente. Se interromper, parar e revisar manualmente antes de tentar de novo. Remover as variáveis de bootstrap imediatamente.
8. **Acompanhar build/start/logs**, confirmar health check e limitar custos. Caso serviço esteja suspenso ou desabilitado por limites, não migrar para plano pago automaticamente.
9. **Executar a checklist pós-deploy** abaixo e parar se qualquer controle falhar. Guardar evidência sanitizada sem cookies, segredos, PII ou URLs de conexão.
10. **Ao concluir o experimento**, exportar apenas se aprovado, validar o uso dos dados sintéticos e remover serviço/branch conforme a política de retenção deliberada pelo responsável. Não apagar/recriar recursos sem confirmar identidade e autorização.

## 6. Checklist pós-deploy

Usar usuário, senha, nomes de clientes e demais valores inteiramente fictícios. Capturar resultado e horário sem salvar valores secretos.

- [ ] Serviço responde por `https://<host>.onrender.com`; certificado TLS válido; HTTP redireciona para HTTPS.
- [ ] `/login` retorna página de login após cold start; registrar tempo até resposta e confirmar que health check não exige sessão.
- [ ] Criar/usar o único usuário sintético OWNER no banco vazio; login aceito. Não habilitar cadastro público.
- [ ] Sessão autenticada sobre HTTPS; confirmar cookie de sessão `Secure`, `HttpOnly`, `SameSite` esperado e `Path`; não exportar valor do cookie.
- [ ] Requisição sem sessão às rotas privadas é redirecionada/bloqueada; sessão autenticada só lê/escreve a organização de teste.
- [ ] Resposta HTML contém **uma** política CSP enforced; nenhum `Content-Security-Policy-Report-Only` em produção nem CSP extra do edge; scripts do documento têm nonce compatível com a CSP da mesma resposta, sem registrar nonce. Dois documentos independentes têm nonces diferentes.
- [ ] Nenhuma violação CSP inesperada no login e nos fluxos sintéticos; não enfraquecer política durante o teste.
- [ ] Conexão TLS ao Neon funciona em operação real (login/sessão e query); `DATABASE_URL` usa hostname pooled e role runtime; revisar falhas/limites de pool e suspensão.
- [ ] Criar cliente fictício, editar e listar na organização do OWNER; tentar isolamento multi-organização somente com fixtures sintéticas autorizadas.
- [ ] Exportar CSV com os registros fictícios; conferir conteúdo, escape de fórmulas e ausência de dados além do tenant.
- [ ] Logout invalida a sessão; acesso privado após logout volta a exigir autenticação.
- [ ] Revisar logs de aplicação, Render e Neon: erros genéricos esperados, sem senha, cookie, header, connection string ou corpo privado. Configurar ACL e retenção disponíveis; registrar que a configuração do collector não altera status G-11 sem evidência.
- [ ] Deixar Web Service inativo até suspender, então fazer uma solicitação e observar retomada (~1 minuto segundo a documentação Render). Revalidar login, banco, health check, CSP/cookies e eventos de restart. Simular reinício não prova backup/restore.
- [ ] Registrar RSS/pico de RAM e qualquer restart/OOM durante boot a frio e repetição dos fluxos; sem evidência positiva, 512 MB permanece inconclusivo.

## 7. Limites gratuitos e riscos

Os limites abaixo foram conferidos em documentação oficial em **2026-11-03** e devem ser confirmados novamente antes da criação, pois podem mudar.

- **Render Free Web Service:** 512 MB RAM; dorme após 15 minutos sem tráfego e pode levar cerca de um minuto para retomar; filesystem efêmero; 750 horas grátis/mês por workspace; limites de bandwidth e minutos de build dependem da cota do workspace. Sem horas/build/bandwidth, serviços podem ser suspensos. Reinício/redeploy/suspensão perdem arquivos locais. Uma instância pode reiniciar a qualquer momento. O provedor diz para não usar free services em produção. [Limites Render Free](https://render.com/docs/free)
- **TLS e runtime Render:** Node é suportado nativamente; `.node-version` fixa a versão. Web Services recebem `PORT` (padrão 10000). TLS gerenciado e health check HTTP estão disponíveis. [Versão Node](https://render.com/docs/node-version), [variáveis padrão](https://render.com/docs/environment-variables), [health checks](https://render.com/docs/health-checks).
- **Neon Free:** a página oficial atual lista 100 CU-hours por projeto/mês, 1 GB de armazenamento por projeto, até 2 CU, scale-to-zero após 5 minutos inativo, 5 GB de egress por projeto/mês, 10 branches por projeto, uma snapshot e janela limitada de restore (até 6h ou 1 GB de mudanças); métricas/logs na UI por 1 dia. O tier não lista backups programados. Conferir painel/preço no dia da criação; manter Free e nunca autorizar upgrade automático. [Preços Neon](https://neon.com/pricing).
- **Risco de dados:** o ensaio não terá dados reais, mas não deve ser usado como armazenamento durável; backup programado/export/restore não foram validados aqui. Neon Free tem recursos limitados de instant restore, mas a presença dessa função não substitui uma rotina comprovada de backup/restore. Os tiers gratuitos não criam obrigação de retenção ou SLA.
- **Risco de conexões:** Render Free é compartilhado/limitado; pool de 10 por processo mais testes/boot concorrente precisa caber nas cotas Neon. Pooling reduz pressão de sessões backend, mas não corrige credenciais privilegiadas.
- **Risco de segurança/observabilidade:** acesso público atrai tráfego hostil; rate limit é local à instância e reinicia em restart. Não há evidência da ACL/retenção real do collector nem de proteção contra abuso distribuída. Não exponha cadastro ou dados reais.
- **Risco de build:** qualquer credencial que Render disponibilize no build deve permanecer sintética; revisar configuração de env no painel. Não inserir segredos em variável `NEXT_PUBLIC_*`, output do build, YAML, Git ou logs.
- **G-11/G-15:** continuam parciais até comprovações operacionais fora do código; este documento não altera seus status.

## 8. Critérios para migração futura

Reavaliar uma infraestrutura paga ou outro destino somente por decisão explícita do responsável e se algum destes requisitos surgir:

1. Dados não fictícios, uso por clientes, necessidade de disponibilidade, recuperação, retenção ou suporte.
2. Dormência/cold starts, cotas, RAM de 512 MB, CPU, conexões, latência ou egress impedirem o uso pretendido.
3. Requisitos aprovados de backup/restore, logs com ACL/retenção, monitoramento, domínio próprio, controles de rede ou SLA que os tiers gratuitos não satisfaçam.
4. Projeção/cotação exceder ou precisar consumir orçamento; apresentar custo mensal total e custos variáveis, obter aprovação e nunca migrar automaticamente.
5. Antes de escalar horizontalmente, provar coordenação de sessão, rate limit compartilhado, conexão total e release/migrations compatíveis.

Antes de qualquer migração, gerar plano de export/import, janela e rollback, teste de restore em destino separado, inventário de secrets/roles, rotação quando necessária e aceite explícito do responsável. O presente preparo não aprova esses passos.

## 9. Evidências e pendências desta etapa

- Inspeção estática atual: `package.json`, `.node-version`, `render.yaml`, `scripts/render-build.sh`, `next.config.ts`, `src/proxy.ts`, `src/lib/content-security-policy.ts`, `src/lib/auth.ts`, `src/db/index.ts`, `drizzle.config.ts`, `src/app/(auth)/login/page.tsx`, `src/app/(app)/layout.tsx`, `scripts/bootstrap-owner.ts`, `.gitignore`, `package-lock.json`.
- Ambiente disponível: Node `24.22.2`, npm `11.19.1`; lockfile v3 registra Next `16.4.3`, Drizzle `0.45.4` e `pg` `8.23.1`.
- `git ls-files` retornou zero arquivos e `git log` não tem commits; não há histórico local de mudanças a inspecionar e não foi possível provar ausência de segredos em serviços remotos/histórico anterior. `.env.local` foi identificado como ignorado por regra `.env*`; seu conteúdo não foi aberto.
- Nenhum teste/build foi repetido nesta etapa; os resultados SEC-01/SEC-02 citados são evidência histórica. Não houve acesso a banco, container, conta externa, serviço Render/Neon ou deploy. Compatibilidade da versão/configuração em execução hospedada e consumo RAM continuam pendentes.
- Documentação oficial consultada: [Render Free](https://render.com/docs/free), [Render Node version](https://render.com/docs/node-version), [Render env vars](https://render.com/docs/environment-variables), [Render health checks](https://render.com/docs/health-checks), [Render Blueprint spec](https://render.com/docs/blueprint-spec), [Neon connections](https://neon.com/docs/connect/connect-from-any-app), [Neon connection pooling](https://neon.com/docs/connect/connection-pooling), [Neon pricing](https://neon.com/pricing), [Better Auth installation](https://better-auth.com/docs/installation), [Better Auth security](https://better-auth.com/docs/reference/security), [Next.js CSP](https://nextjs.org/docs/app/guides/content-security-policy).
