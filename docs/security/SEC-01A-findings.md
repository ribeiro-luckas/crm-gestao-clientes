# SEC-01A — Achados

Classificação baseada em revisão estática. “Confirmado” descreve o comportamento do código/configuração local; impactos condicionados não foram reproduzidos em deployment.

## SEC-01-F001 — Alteração de papel e trilha de auditoria não são atômicas

**Severidade:** P2
**Status:** Confirmado no código; consequência depende de falha da gravação de auditoria.
**Categoria:** Integridade / auditoria / operação privilegiada.
**Referências:** CWE-778 (Insufficient Logging).
**Localização:** `src/modules/team/actions.ts`, `updateMemberRole` (aprox. linhas 111–137).

**Descrição:** a ação valida OWNER e target dentro da organização, chama `auth.api.updateMemberRole(...)` e, somente após sucesso, executa `db.insert(auditLogs)`. São operações separadas; não existe transaction/outbox/compensação envolvendo ambas.

**Evidência:** chamada Better Auth precede `await db.insert(auditLogs)...` e a atualização já retornou quando a segunda operação começa. O E2E `tests/e2e/team-role-rbac.spec.ts` verifica o caso positivo persistido com log, mas não injeta falha no insert de auditoria após a mudança.

**Cenário de risco:** indisponibilidade, constraint ou falha transitória na gravação do log após a mudança de papel deixa a autorização alterada, embora a action retorne erro e sem registro correspondente. Isso reduz atribuição e investigação de uma mudança administrativa.

**Pré-requisitos:** OWNER autorizado solicita alteração; Better Auth persiste o papel; inserção posterior em `audit_logs` falha. Não há evidência de que um usuário sem autorização explore essa sequência.

**Impacto:** integridade da trilha de auditoria e capacidade de detectar/investigar alteração privilegiada; sem impacto direto de confidencialidade demonstrado.

**Causa:** desenho confirmado de duas escritas independentes em componentes de persistência distintos.

**Recomendação:** desenhar gravação confiável do evento (outbox/transação local sincronizada ou mecanismo de reconciliação/compensação) e definir semântica de resposta quando o log não puder ser gravado. Evitar alegar atomicidade distribuída entre Better Auth e Drizzle sem arquitetura compatível.

**Teste de regressão:** simular falha do insert depois de a atualização Better Auth concluir; demonstrar que não há estado de papel alterado sem evento auditável/reconciliável e verificar autor, organização, origem/destino e timestamp.

**Risco de alteração:** falha da auditoria pode bloquear mudanças administrativas ou gerar duplicidade ao repetir; a política de retry/idempotência deve ser definida.

**Acompanhamento SEC-01C.1 (2026-11-02):** foi implementado um serviço com transação Drizzle única para mutation + auditoria, reutilizado pela Server Action e pelo endpoint HTTP. A falha de auditoria e o fluxo positivo têm regressões preparadas. Typecheck, lint e unitários passaram; a tentativa de integração foi bloqueada pelo helper antes das fixtures, pois o destino não foi confirmado. E2E e preflights aguardam execução autorizada no Bazzite. O status do achado permanece confirmado até essa validação dinâmica.

## SEC-01-F002 — Rate limit sem storage compartilhado entre réplicas

**Severidade:** P2, caso a aplicação use múltiplos processos/réplicas; caso single-process, endurecimento P3.
**Status:** Configuração local confirmada; topologia de deployment não avaliada.
**Categoria:** Autenticação / abuso de recursos.
**Referências:** ASVS v5.0.0-6.3.1 (controles contra credential stuffing/password brute force, L1); CWE-307. A documentação oficial Better Auth consultada descreve rate limit e storage.
**Localização:** `src/lib/auth.ts`; options defaults do pacote `better-auth` instalado 1.7.14 (`node_modules/better-auth/dist/context/create-context.mjs`, linhas próximas a 170–175).

**Descrição:** a configuração não declara `rateLimit` nem `secondaryStorage`. O código local da versão 1.7.14 define `enabled` como produção por padrão, `window=10`, `max=100`, e `storage="memory"` se não houver storage secundário. Regras locais da biblioteca limitam `/sign-in*` e `/sign-up*` a 3 requisições/10s por chave, e reset/verificação a 3/60s. O armazenamento é Map no processo Node, conforme `dist/api/rate-limiter/index.mjs`.

**Evidência:** configuração `betterAuth` em `src/lib/auth.ts` não define storage; instância Better Auth usa DB para persistência de auth, mas não configura o armazenamento do rate limiter. O valor default do rate limiter no pacote instalado é memory.

**Cenário de risco:** em deployment com múltiplas réplicas, alternância de requests distribui tentativas por contadores independentes; restart também reinicia contadores. Se houver uma única instância estável, a limitação por processo continua funcionando.

**Pré-requisitos:** deployment multi-processo/réplica ou reinício frequente; endpoint de autenticação exposto. A topologia e os limites de proxy/IP não foram verificados.

**Impacto:** maior superfície para tentativa automatizada de credenciais, abuso de endpoint e consumo de recursos em topologia distribuída; não foi demonstrada tomada de conta.

**Causa:** storage não compartilhado no default da versão instalada, não ausência total de rate limit.

**Recomendação:** obter arquitetura real de runtime; se houver várias réplicas, configurar storage distribuído/compartilhado e limites coerentes, trusted proxy/IP header e observabilidade de 429. Não aceitar `X-Forwarded-For` de fontes não confiáveis.

**Teste de regressão:** exercitar rota de login através de duas instâncias e confirmar limite global/por IP, headers 429 e recuperação; validar IP real via proxy autorizado.

**Risco de alteração:** backend compartilhado cria dependência operacional e risco de lockout/limites incorretos se proxy ou chaves forem configurados errado.

## SEC-01-F003 — Organização ativa obsoleta cai silenciosamente na primeira membership

**Severidade:** P3
**Status:** Comportamento confirmado; vulnerabilidade de autorização não confirmada.
**Categoria:** Contexto multi-tenant / autorização.
**Referências:** ASVS v5.0.0-8.4.1 (controles entre tenants, L2); v5.0.0-8.2.2 (autorização de acesso a dados, L1).
**Localização:** `src/lib/workspace.ts`, `requireApiWorkspaceRole` e `getWorkspaceContext` (aprox. linhas 31 e 78).

**Descrição:** ambos selecionam membership cujo `organizationId` corresponde a `session.activeOrganizationId`; se não há correspondência, escolhem `memberships[0]`, ordenada por `createdAt`. A seleção está limitada às memberships do usuário atual. Endpoints específicos como `update-member-role` exigem correspondência exata e retornam 403.

**Evidência:** `memberships.find(...) ?? memberships[0]` nas duas funções. Não foi identificado uso de organization ID arbitrário enviado pelo cliente em exports; o contexto de organização é derivado da sessão e da tabela membership.

**Cenário de risco:** uma sessão cuja organização ativa foi removida, invalidada ou ficou desatualizada pode executar leitura/mutação autorizada no primeiro workspace remanescente, mesmo que a interface ainda represente outro contexto. Não foi demonstrado acesso a organização da qual o usuário não seja membro nem escalonamento de papel; há risco de contexto errado e integridade por ação no workspace inesperado.

**Pré-requisitos:** usuário com mais de uma membership e active organization ausente/inválida; request de página ou API que use fallback.

**Impacto:** potencial ação no workspace errado; confidencialidade entre organizações não confirmada, pois a organização resultante continua sendo membership do ator.

**Causa:** fallback implícito para membership mais antiga em vez de exigir contexto ativo válido.

**Recomendação:** definir UX/contrato explícito para mudança de organização. Para active ID explícito inválido, preferir invalidar contexto/solicitar seleção em vez de escolher silenciosamente; preservar fallback apenas se a sessão não tiver campo ativo por compatibilidade claramente intencional.

**Teste de regressão:** usuário A com duas organizações e papéis diferentes; sessão ativa removida/ID inexistente; verificar que páginas, Server Actions, exportações e dashboards não executem no workspace alternativo sem seleção explícita. Também verificar membership removida e session revogada.

**Risco de alteração:** pode invalidar sessões antigas ou exigir fluxo UI de seleção; revisar com Better Auth e política de workspace antes de mudar.

## SEC-01-F004 — Headers de segurança não configurados neste repositório

**Severidade:** P3
**Status:** Lacuna no código confirmado; resposta real de deployment pendente.
**Categoria:** Configuração / endurecimento de navegador.
**Referências:** ASVS v5.0.0-3.4.1 (HSTS, L1), v5.0.0-3.4.3 (CSP, L2), v5.0.0-3.4.4 (nosniff, L2), v5.0.0-3.4.5 (Referrer-Policy, L2), v5.0.0-3.4.6 (frame-ancestors, L2). São controles para validação, não violações confirmadas enquanto a camada efetiva não for observada.
**Localização:** `next.config.ts` e `src/app/layout.tsx`.

**Descrição:** `next.config.ts` define apenas `poweredByHeader: false`; não há política CSP, HSTS, frame-ancestors/X-Frame-Options, Referrer-Policy ou Permissions-Policy no código. A raiz não estabelece headers. CDN, proxy ou plataforma podem configurar isso externamente; nenhum header de produção foi observado.

**Evidência:** leitura de `next.config.ts` e busca de handlers/configuração de headers no projeto. Ausência no repositório não comprova ausência na borda.

**Cenário de risco:** caso a camada implantada também não defina políticas, aumenta impacto de XSS, framing/clickjacking, downgrade de transporte e envio de referrer.

**Pré-requisitos:** deploy sem configuração equivalente na camada de borda.

**Impacto:** defesa em profundidade; impacto depende de vulnerabilidades e origens/transportes reais. Nenhuma exploração foi confirmada.

**Causa:** segurança de headers não é declarada nesta configuração Next local.

**Recomendação:** inventariar edge/proxy/ingress; capturar headers de respostas públicas e privadas em ambiente autorizado; atribuir a uma única camada e estabelecer CSP compatível com assets/Better Auth e HSTS somente sob HTTPS.

**Teste de regressão:** checks automatizados de headers em login, página privada, API auth, respostas 401/403 e CSV; validar CSP sem `unsafe-*` por padrão e testar framing/origens.

**Risco de alteração:** CSP mal calibrada pode bloquear assets, fluxo auth ou scripts Next; HSTS pode persistir no navegador após configuração errada.

**Acompanhamento SEC-01C.3 (2026-11-02):** `next.config.ts` agora declara `nosniff`, `strict-origin-when-cross-origin`, `X-Frame-Options: DENY` e uma Permissions-Policy restrita; `X-Powered-By` continua desabilitado. `proxy.ts` injeta nonce por documento e publica uma CSP candidata somente em `Content-Security-Policy-Report-Only`. HSTS ficou intencionalmente pendente, pois domínio e fronteira HTTPS não foram identificados. Typecheck, lint e 96 unitários passaram localmente. E2E HTTP real, regressão e preflights aguardam ambiente Bazzite autorizado; portanto os valores de resposta ainda não foram validados dinamicamente e F004 permanece **parcialmente corrigida, validação pendente**. Detalhes e critérios em `SEC-01C-F004-remediation.md`.

**Diagnóstico SEC-01C.3.1:** a primeira tentativa Bazzite não encontrou CSP em `GET /login`. A causa confirmada na estrutura é `proxy.ts` colocado na raiz apesar de o App Router estar em `src/app`; foi movido para `src/proxy.ts`, mesmo nível do diretório `app`, conforme a convenção do Next. O runtime pós-mudança ainda requer validação autorizada.

## SEC-01-F005 — Exceções de API são encaminhadas integralmente ao log do servidor

**Severidade:** P3
**Status:** Sink confirmado; presença de dados sensíveis no objeto e exposição de logs pendentes.
**Categoria:** Logging / exposição de informação.
**Referências:** CWE-532 (Insertion of Sensitive Information into Log File) somente se o conteúdo sensível for comprovado.
**Localização:** `src/lib/workspace.ts`, `workspaceApiErrorResponse`.

**Descrição:** erros inesperados recebidos por handlers que usam `workspaceApiErrorResponse` são enviados como objeto completo a `console.error`, enquanto a resposta HTTP ao usuário é genérica. A busca por sinks encontrou ainda `scripts/debug-migrate.mjs` imprimindo `message`, `detail`, `hint` e metadados da exceção de migration; esse é um script local de alto impacto, não handler de produção.

**Evidência:** `console.error("Erro interno ao processar a solicitação do workspace.", error)` em `workspace.ts`. O catch da exportação usa esse mapper. A exceção e o conteúdo efetivo do logger não foram reproduzidos; não há evidência de senha/token incluído.

**Cenário de risco:** erro de driver/SQL/infra pode registrar query/valores, identificadores ou detalhes internos no agregador de logs; pessoas ou integrações com acesso amplo a logs poderiam ver dados além do necessário. O conteúdo real do objeto depende da falha e do driver.

**Pré-requisitos:** exceção inesperada em handler e logging object serializado com detalhes; acesso de terceiro aos logs ou retenção inadequada.

**Impacto:** potencial exposição de informação operacional/PII em logs, não resposta da aplicação. Nenhum segredo ou dado real foi observado.

**Causa:** logging do objeto bruto na fronteira de API, sem allowlist de campos.

**Recomendação:** em SEC-01C, substituir por evento estruturado allowlist (request ID, categoria interna, erro normalizado), remover parâmetros/PII, proteger acesso/retention e manter causa técnica apenas em canal restrito. Não suprimir observabilidade.

**Teste de regressão:** injetar exceção sintética contendo marcador-canário e garantir que response e sink público não preservem o valor; verificar que categoria/correlation ID continue disponível.

**Risco de alteração:** redaction agressiva pode dificultar resposta a incidentes; manter logs internos úteis e acesso controlado.

**Acompanhamento SEC-01C.4 (2026-11-03):** foi adicionado `src/lib/safe-logger.ts` com campos estruturados allowlist; o sink de `workspaceApiErrorResponse` e outros pontos de logging controlados foram migrados. Better Auth recebe adaptador validado por requisição real em memória: senha sintética curta recebeu HTTP 400 e aviso sanitizado sem marcadores na saída. O script local `scripts/debug-migrate.mjs` deixou de imprimir detalhes da exceção. Typecheck/lint e 103 testes unitários passaram. A evidência original confirma somente que um `Error` sintético chegava ao console; não comprova exposição sensível no armazenamento. Sessão real do app, outros frameworks e destinos externos ainda não foram validados; ver `SEC-01C-F005-remediation.md`.

## Observações sem achado de vulnerabilidade confirmada

**F005 — verificação de encerramento integrado (2026-11-03):** nova execução aprovou typecheck, lint e 103 unitários. Manifest/lock/instalação concordam nas dependências relevantes; uma instalação offline limpa em diretório temporário passou sem lifecycle scripts, eliminando o bloqueio anterior de cache neste escopo. O executor usa Debian 12, não oferece Podman/Distrobox/PostgreSQL e o Chromium presente falha por permissão na inicialização. Não houve sessão real do CRM, integração PostgreSQL, captura de logs Next.js ou nova validação de `audit_logs`. Encerramento F005 **BLOQUEADO pelo ambiente**, mantendo mitigação parcialmente validada e pendências operacionais externas separadas. Ver a seção final de `SEC-01C-F005-remediation.md`.

- As rotas CSV usam escopo de tenant, papel owner/admin, limite de 5000 linhas, seleção de campos explícita, `private, no-store`, BOM, aspas em todas as células, escape de aspas e prefixo `'` para fórmulas iniciadas por espaço/tab/CR/LF e `= + - @`. Testes unitários cobrem prefixos ASCII. Teste manual em planilhas e prefixos Unicode não foi feito; ampliar casos é recomendação, não vulnerabilidade confirmada. ASVS v5.0.0-1.2.10 é requisito L3.
- Nenhum `sql.raw`, `dangerouslySetInnerHTML`, `eval` ou `NEXT_PUBLIC_*` foi localizado nas buscas de código do escopo; isso não prova ausência em artefatos/build nem substitui análise completa de dependências/client bundle.
- Não foi identificada política RLS na definição de schema/migrations. A aplicação depende de autorização e filtros tenant-scoped, reforçados por FKs compostas. Privilégios e proprietário efetivo das tabelas não foram consultados. PostgreSQL documenta que RLS é opt-in e o proprietário normalmente o contorna; portanto, RLS pode ser defesa em profundidade, não presumida presente.
- `src/app/api/export/*` executa GET que também grava evento de auditoria. É efeito colateral de observabilidade e custo limitado a usuário autorizado, não foi confirmado como vulnerabilidade CSRF; deve ser tratado conscientemente na validação HTTP.
- Registros anteriores “The destination stream errored while writing data” não foram encontrados como evidência reproduzível nesta auditoria; sem stack/contexto não é classificável como falha de segurança.
- `src/lib/auth-http-error-context.ts` usa `AsyncLocalStorage` por request para mapear somente violações de constraints OWNER/M-01 em leave/remove, responde 409 genérico e `private, no-store`; não é estado global compartilhado. `src/lib/auth.ts` registra nome/código em erros inesperados da biblioteca, sem SQL/parâmetros no caminho explícito.
