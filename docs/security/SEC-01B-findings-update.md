# SEC-01B — Atualização dinâmica dos achados

Os IDs originais SEC-01-F001–F005 foram mantidos. Os resultados Bazzite abaixo foram informados pelo usuário na execução mais recente; a captura de headers foi conferida localmente em `test-results/security-sec01b/headers.json`. F002 aguarda uma nova execução após a correção de harness.

| ID | Severidade | Evidência dinâmica consolidada | Status atualizado |
|---|---|---|---|
| SEC-01-F001 | P2 | O cenário Bazzite F001 passou com estado inicial `member`, OWNER solicitando mudança para `admin`, falha injetada exclusivamente no insert de `audit_logs`, papel final `admin` e nenhum evento de auditoria. OWNER, peer e membros do tenant B não mudaram. O `runtime.db` real foi restaurado em `finally` e cleanup permanece escopado às fixtures. | Confirmado e reproduzido. A alteração de papel persiste sem auditoria. |
| SEC-01-F002 | P2 se multi-réplica | Tentativa anterior não alcançou requests: import do handler real iniciou `getDb()` sem `CRM_TEST_MODE=1` e tentou `DATABASE_URL`. O teste passou a ativar o modo isolado após validação da conexão e antes do import, guardando/restaurando o env anterior. | Inicialização corrigida no teste; limite ainda não revalidado. Topologia de produção desconhecida. |
| SEC-01-F003 | P3 | O cenário Bazzite passou: organization A é escolhida para active ID desconhecido ou sem membership; B é escolhida quando membership válida; depois de remover membership B, fallback volta para A. A ação criou o cliente sintético em A. C não foi acessada; sessão após sign-out foi rejeitada. | Fallback silencioso confirmado; não foi demonstrado bypass entre tenants. Risco de contexto/integridade permanece. |
| SEC-01-F004 | P3 | Spec Bazzite 1/1 aprovada. JSON local mostra CSP, HSTS, X-Content-Type-Options, Referrer-Policy, X-Frame-Options, Permissions-Policy e ACAO ausentes no servidor local HTTP. Cookie de sessão: HttpOnly, SameSite=Lax, Path=/, Max-Age presente, Secure=false em HTTP local. CSV: `private, no-store`; dashboard sem sessão: 307 para `/login`; CSV sem sessão: 401 e `private, no-store`. | Configuração local observada. Camada HTTPS/proxy/produção continua desconhecida. |
| SEC-01-F005 | P3 | Evidência histórica: Error sintético entregue ao `console.error`, resposta 500 sem marcador. Acompanhamento SEC-01C.4: sinks identificados migrados para logger allowlist; typecheck/lint e 99 unitários passaram localmente. | Mitigação implementada para sinks controlados; destino/retensão e logs internos de framework não avaliados. |

## Acompanhamento SEC-01C.2 de F003 (2026-11-02)

A alteração implementada substitui o fallback `memberships[0]` por seleção explícita quando um `activeOrganizationId` presente não corresponde a uma membership atual. A ausência de contexto só é resolvida automaticamente se houver exatamente uma membership; múltiplas memberships levam à escolha explícita. Nenhuma membership leva a uma página de orientação e negação de recursos. A implementação e cobertura estão detalhadas em `SEC-01C-F003-remediation.md`.

Typecheck, lint e 94 testes unitários passaram neste executor. A tentativa de `tests/integration/sec-01b-audit-workspace.test.ts` carregou a configuração autorizada, removeu `DATABASE_URL` e ativou `CRM_TEST_MODE=1`, mas `createIsolatedConnectionPair()` bloqueou antes das fixtures porque não confirmou conexão/identidade do PostgreSQL temporário; 4 casos foram skipped. Distrobox e Podman não estão disponíveis. E2E, RBAC e preflights M-01/I-01 não foram executados nesta alteração. Portanto, F003 está **implementada, aguardando validação dinâmica**, e não corrigida/encerrada. A regressão continua necessária no Bazzite.

## Interpretação de F001

O achado tem impacto de integridade/rastreabilidade: a mudança de autorização fica aplicada sem o registro que deveria explicar ator e alteração. Os dados usados são fixtures sintéticas. O teste futuro para SEC-01C deve tornar a operação atômica na fronteira possível e afirmar explicitamente que, quando a auditoria falha, o papel volta ao estado inicial. Esta recomendação não é uma correção aplicada.

## Interpretação de F002

A configuração instalada Better Auth 1.7.14 usa limite especial para caminhos `/sign-in*`: 3 eventos em 10 segundos; o rate limiter padrão é habilitado por `NODE_ENV=production` e usa memória quando não há storage secundário/customizado. A execução F002 anterior não testou essa regra, pois parou no módulo. Não alegar que a regra funcionou dinamicamente até a nova execução dos quatro requests. Mesmo com aprovação local, storage em memória só demonstraria comportamento de um processo; topologia implantada ainda precisa ser identificada.

## Interpretação de F003

O fallback continua restrito às memberships do usuário, de modo que a evidência observada não é um IDOR/BOLA para C. O risco confirmado é a troca silenciosa de contexto: uma ação após active ID inválido pode ser executada em outra organização da qual a pessoa é membro. A correção futura deve fazer a seleção do contexto ser explícita e testável, sem relaxar membership/RBAC.

## Interpretação de F004

O servidor local observado é HTTP e não representa necessariamente proxy, edge ou produção. `Secure=false` é esperado nesse contexto; não é prova de cookie inseguro sob HTTPS. Ausência de HSTS também não tem valor conclusivo fora de HTTPS. ACAO ausente não indica CORS permissivo. Os headers ausentes localmente são fatos observados para o servidor usado na spec, não uma alegação de falha em produção.

## Interpretação de F005

O teste confirma a chamada do sink de console, não que o collector serialize ou retenha a mensagem/stack/causa. Não houve canário nos logs de produção nem coleta externa. Severidade permanece P3.

## Acompanhamento SEC-01C.4 — F005 (2026-11-03)

**Nova verificação integrada:** typecheck/lint e 103 unitários passaram novamente. Instalação offline limpa, sem lifecycle scripts, passou em diretório temporário; o problema de cache anterior não se reproduziu. PostgreSQL descartável não pôde ser provisionado pela ausência de ferramentas, e Chromium, embora presente, falhou por permissão ao iniciar. Sessão real do CRM, logs Next.js/PostgreSQL e regressão integrada não foram executados. Encerramento F005 **BLOQUEADO por ambiente**; nenhuma nova falha de sanitização foi demonstrada. Detalhes na seção final de `SEC-01C-F005-remediation.md`.

O logger allowlist de `src/lib/safe-logger.ts` foi introduzido para os sinks controlados identificados em workspace, alteração de papel, autorização de membro e carga de responsabilidades. O adaptador Better Auth foi validado em requisição real com memory adapter: senha sintética inválida gerou HTTP 400 e um aviso sem marcadores sensíveis. A sessão real do app e sinks de outros frameworks/agregadores externos não foram avaliados. O script de diagnóstico de migração também deixou de emitir campos brutos da exceção. Resultados atuais estão em `SEC-01C-F005-remediation.md`; não reaproveitar resultados históricos como validação desta mudança.

## Acompanhamento SEC-01C.3 — implementação local de headers

O repositório agora declara headers básicos centralmente em `next.config.ts` e CSP nonce em `Content-Security-Policy-Report-Only` por `proxy.ts`. HSTS não foi adicionado por falta de evidência sobre HTTPS/domínio/proxy. O teste de headers foi convertido de inventário em asserções e conserva relatório sanitizado; testes unitários verificam a política candidata. Typecheck e lint passaram; 96 unitários passaram. Não houve execução Playwright, HTTP ou PostgreSQL nesta etapa, então nenhuma nova resposta foi observada. O baseline Bazzite de 47 E2E/12 integrações/32 scans axe permanece histórico. O status da F004 é implementação local com validação dinâmica pendente, não correção plenamente validada.

## Acompanhamento SEC-01C.3.1 — descoberta do Proxy

O Playwright Bazzite reportou CSP Report-Only ausente em `GET /login`. A estrutura do projeto revelou `src/app` e `proxy.ts` na raiz; pela convenção do Next o Proxy precisa estar ao lado do diretório `app`, portanto foi movido para `src/proxy.ts`. A resposta reportada passou pelas asserções básicas antes de falhar, mas o relatório não capturou status, tipo ou redirecionamento; a spec agora grava esses metadados sanitizados no diagnóstico de falha. CSP é exigida somente para documentos HTML (login, dashboard e seleção de workspace); API/JSON, CSV, CSS/JS e redirects mantêm verificações dos headers aplicáveis sem exigir CSP documental. A spec, incluindo a nova localização, ainda não foi executada após a correção.

## Acompanhamento SEC-01C.1 de F001

Foi implementada uma fronteira transacional comum para a alteração de papel e o evento de auditoria em `src/modules/team/member-role-service.ts`, usada pela Server Action e pelo endpoint HTTP Better Auth. Os testes de rollback, fluxo positivo e auditoria HTTP foram atualizados/preparados. Typecheck, lint e 92 unitários passaram neste executor. A tentativa de três suítes de integração foi bloqueada pelo helper de segurança antes das fixtures porque o destino não foi confirmado; 11 testes foram skipped. Regressão E2E e M-01/I-01 não foram executados. Portanto, F001 continua **confirmado, com correção implementada aguardando validação dinâmica**; não considerar encerrado.
