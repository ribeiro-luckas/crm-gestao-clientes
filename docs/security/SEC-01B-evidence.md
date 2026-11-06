# SEC-01B — Evidências e comandos

## Execuções Bazzite informadas nesta tarefa

O usuário reportou a execução real mais recente; logs/stdout completos e timestamps do Bazzite não foram anexados.

| Execução | Resultado reportado | Interpretação |
|---|---|---|
| Integração F001/F003 | 2/2 aprovados | F001 reproduziu papel alterado sem evento de auditoria; F003 reproduziu fallback para A sem acesso a C. |
| Integração F002 anterior | Falhou durante inicialização; cenário não executado e teste marcado skipped | Não é resultado de rate limiting. Causa identificada no módulo `src/db/index.ts`, ver relatório. |
| Spec F004 | 1/1 aprovado | O arquivo local `test-results/security-sec01b/headers.json` é a captura sanitizada de headers/cookies. |
| Regressão E2E | 44/44 aprovados | Baseline informado, não repetido neste turno. |
| axe | 32 varreduras, 0 violações | Resultado informado, não repetido neste turno. |

## Leitura do artefato F004

Fonte: `test-results/security-sec01b/headers.json`.

- Headers ausentes nas respostas capturadas: `content-security-policy`, `strict-transport-security`, `x-content-type-options`, `referrer-policy`, `x-frame-options`, `permissions-policy` e `access-control-allow-origin`.
- `Cache-Control`: login, dashboard autenticado e endpoint de sessão retornaram `no-store`; exportação CSV autenticada e não autenticada retornou `private, no-store`; sign-in não trouxe `cache-control`.
- Cookie de sessão `better-auth.session_token`: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age` presente, `Secure=false` no HTTP local. Esse valor não prova comportamento HTTPS.
- Dashboard não autenticado: `307` com destino `/login`. Export CSV não autenticado: `401`, `private, no-store`.
- Nenhum valor de cookie, corpo, senha, token ou dados de sessão foi gravado no JSON.

A ausência local caracteriza o Next.js/dev server usado pela spec; não prova ausência em reverse proxy, edge ou ambiente publicado. HSTS e o atributo Secure exigem avaliação em HTTPS configurado.

## Causa F002 e correção do teste

Ordem anterior: `createIsolatedConnectionPair()` validava URL/identidade, mas o teste não definia `CRM_TEST_MODE`; o import dinâmico da rota executava `getAuth()` e `getDb()` no topo do módulo, e `src/db/index.ts` escolhia `DATABASE_URL`. F001/F003 têm `vi.mock("@/db")` e, por isso, não exercitam esse seletor. Os demais testes de handler pesquisados também mockam `@/db`.

Agora o teste F002 salva `CRM_TEST_MODE`, define `1` após a conexão isolada estar validada e antes do import do handler, e restaura o valor em `afterAll`. `DATABASE_URL` segue proibida pelo guard do teste. O teste não foi reexecutado após a mudança neste ambiente; não há status de requests para documentar ainda.

## Acompanhamento SEC-01C.1 — F001

A implementação transacional e os testes de regressão foram adicionados depois dos resultados históricos acima. Nesta etapa, `npm run typecheck`, `npm run lint` e `npm test` foram executados localmente; o último aprovou 92 testes em 16 arquivos. A tentativa de integração carregou a configuração autorizada, removeu `DATABASE_URL` e parou no helper antes de criar fixtures porque a conexão/identidade do destino não foi confirmada: 3 suítes falharam no setup e 11 casos foram skipped. Não há evidência dinâmica nova de rollback. E2E e preflights não foram executados; Distrobox/Podman também estão ausentes neste executor. Consulte `SEC-01C-F001-remediation.md` para estratégia e condições pendentes.

## Preflight deste executor

- `distrobox` e `podman` não estão disponíveis no executor atual.
- O artefato F004 existe e foi lido; os resultados Bazzite acima vêm do pedido atual, não de uma reexecução local.
- A validação de `TEST_DATABASE_URL` e identidade do servidor deve ocorrer no Bazzite por meio de `createIsolatedConnectionPair()`; a etapa SEC-01B anterior documentou que o executor restrito recebeu `EPERM` ao conectar a `127.0.0.1:5433`.
- Não imprimir `TEST_DATABASE_URL`; não carregar `.env.local`; não permitir fallback a `DATABASE_URL`.

## Validações locais após o ajuste

- `npm run typecheck`: aprovado.
- `npm run lint`: aprovado.
- `npm test`: 92 testes em 16 arquivos aprovados; há somente um aviso não bloqueante do Vite sobre `configLoader: native`.
- `git diff --check`: não mostra problemas nos arquivos rastreados; os arquivos desta tarefa estão não rastreados no checkout, então whitespace e newline final foram verificados diretamente.
- Integração F002: não repetida neste executor, pois Distrobox/Podman não estão disponíveis e o banco isolado não pode ser conectado a partir deste ambiente.

## Comandos para reexecução no Bazzite

F002 isolado (exatamente quatro requisições sintéticas):

```bash
distrobox enter laboratorio-node -- bash -lc '
  cd ~/Ambiente/Projetos/crm-gestao-clientes
  set -a
  source ~/.config/crm-test/connection.env
  set +a
  env -u DATABASE_URL npm run test:integration -- tests/integration/sec-01b-rate-limit.test.ts
'
```

F001/F003 e F002 juntos, sem qualquer configuração global adicional de `CRM_TEST_MODE`:

```bash
distrobox enter laboratorio-node -- bash -lc '
  cd ~/Ambiente/Projetos/crm-gestao-clientes
  set -a
  source ~/.config/crm-test/connection.env
  set +a
  env -u DATABASE_URL npm run test:integration -- tests/integration/sec-01b-audit-workspace.test.ts tests/integration/sec-01b-rate-limit.test.ts
'
```

Depois do teste focal, executar suites relevantes e a regressão E2E completa. Reexecutar os preflights M-01/I-01 apenas após validar o destino isolado; eles são de leitura e não substituem os testes de invariantes.

## Evidências que faltam

- Saída sanitizada do teste F002 após o ajuste, mostrando os quatro status individuais.
- Identificação da topologia implantada para contextualizar storage em memória (nenhuma topologia foi pesquisada em produção).
- Medição dos headers sob proxy/HTTPS autorizado, se aplicável.
- Evidência do sink/collector de logs para F005; não acessar logs de produção nesta fase.

## Acompanhamento SEC-01C.3 — implementação ainda não observada no wire

Headers básicos e uma política CSP nonce em Report-Only foram adicionados ao repositório. A spec agora contém asserções e grava CSP sanitizada/violações classificadas em `test-results/security-sec01b/headers.json`. Nesta execução não foi iniciada aplicação, Chromium ou conexão PostgreSQL. Portanto esse JSON ainda não contém evidência pós-implementação. F004 permanece pendente de captura Bazzite, incluindo verificação de HTML, endpoints JSON, CSS/JS, CSV, redirects, cookies e cache. HSTS/`Secure` em produção continuam pendentes de um ambiente HTTPS autorizado.
