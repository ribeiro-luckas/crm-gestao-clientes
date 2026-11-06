# SEC-02B.3 — Estabilização E2E e revalidação dos gates

**Data:** 2026-11-03  
**Escopo:** diagnóstico de respostas HTTP 429, interferência E2E, regressão dirigida de CSP e logging em cópia e banco descartáveis.  
**Conclusão:** a origem dos 429 foi atribuída ao limitador interno do Better Auth. O helper E2E passou a respeitar `X-Retry-After`, mas a suíte segue inconclusiva por falhas do Chromium que fecham páginas. G-11 e G-15 continuam parciais; publicação não autorizada.

## 1. Resumo executivo

As respostas 429 observadas são produzidas pelo rate limit do Better Auth no `POST /api/auth/sign-in/email`; não há evidência de 429 vindo do proxy da aplicação, do Next.js ou de infraestrutura de proxy reverso. Uma execução serial sem a correção registrou 25 respostas 429 em 42 chamadas observadas. O limitador compartilha estado em memória por processo, rota e IP de origem; chamadas diretas no ambiente local sem IP confiável podem cair na chave comum `no-trusted-ip`. Assim, usuários sintéticos distintos não isolam os contadores.

Foi adicionado um helper E2E que só repete logins válidos após aguardar o valor do `X-Retry-After` retornado pelo servidor, com pequena margem de escalonamento. Ele não altera a política do limitador, não falsifica IP e não repete logins negativos. O cenário serial após a mudança ainda teve 13 respostas 429; com dois workers, foram 26, embora três dessas respostas tenham coincidido com duas chamadas simultâneas. O cenário isolado confirmou que o login HTTP podia responder 200, mas a navegação falhou porque o Chromium fechou a página.

O bloqueio de maior impacto na suíte atual é a falha do headless Chromium (`SkFontMgr_FontConfigInterface.cpp:163`, “Not implemented”), após a qual páginas são fechadas e testes de UI falham em cascata. Isso é independente do CRM e impede concluir os fluxos de autenticação e operações comerciais pelo navegador. A execução completa não foi aprovada.

## 2. Ambiente e versões

- Host: Bazzite 44; Node.js 24.22.2; npm 11.19.1.
- Cópia temporária limpa do projeto, sem `.env*` e sem `node_modules` copiado; dependências instaladas a partir do lockfile local em modo offline.
- Next.js 16.4.3; Better Auth 1.7.14; Zod 4.6.7; Playwright 1.64.1; PostgreSQL 18.6; Chromium headless shell revision 1248 (Chrome for Testing 156.0.8078.4).
- PostgreSQL e rede Podman novos, descartáveis, internos e sem volume persistente; banco `crm_test_isolated`, usuário sintético. Aplicação acessível somente em loopback. Migrations foram aplicadas apenas nessa instância nova.
- Não foram acessados produção, `.env.local`, banco preexistente ou credenciais reais. Containers e redes preexistentes não foram usados.

## 3. Origem dos HTTP 429

| Campo | Evidência observada |
|---|---|
| Endpoint/método | `POST /api/auth/sign-in/email` |
| Componente que respondeu | Better Auth 1.7.14, handler interno de rate limit; resposta 429 contém a assinatura de header do Better Auth e coincide com seu código local instalado. |
| Status e headers | `429`; `X-Retry-After` presente (4–10 segundos nos eventos do cenário C); `Retry-After` e headers `RateLimit*` ausentes. |
| Contexto | Todas as ocorrências 429 instrumentadas não tinham cookie de sessão autenticada; eram chamadas de login. Sem cookies, tokens, e-mails ou corpos nos artefatos agregados. |
| Concorrência | Worker único: máximo de 1 chamada simultânea na medição. Dois workers: máximo de 2; 3 das 26 respostas 429 ocorreram com duas chamadas simultâneas. |
| Requisições relacionadas | A janela de login se enche com chamadas anteriores à mesma rota no mesmo processo/IP. No cenário inicial, as três primeiras chamadas foram aceitas e a seguinte bloqueada; novos grupos eram liberados conforme a janela expirada. |
| Limite efetivo | Better Auth aplica por padrão 3 chamadas de login por 10 segundos por chave. Armazenamento padrão em memória. Em `NODE_ENV=test`, o padrão do Better Auth desabilita o rate limit; para reproduzir o comportamento de produção, a cópia isolada habilitou explicitamente o limitador padrão, sem aumentar limites. |
| Origem IP/proxy | Testes acessaram o Next local diretamente, sem proxy reverso. A configuração `src/lib/auth.ts` não define armazenamento compartilhado, trusted proxy ou valores customizados do limite. O código do Better Auth usa o IP confiável resolvido e, sem ele, pode compartilhar `no-trusted-ip` por rota; não se falsificaram forwarded headers. |

O middleware/`src/proxy.ts` do projeto aplica headers/CSP e não implementa rate limiting. Não foi observada uma camada de proxy reverso no ambiente. O componente foi identificado pelos headers e pelo comportamento/implementação do Better Auth, não por suposição.

## 4. Interferência entre testes

- Playwright define `fullyParallel: true`, `workers: 1` e `retries: 0`; os arquivos não executam simultaneamente nessa configuração, embora testes possam estar marcados como paralelizáveis.
- Os fixtures criam usuários, organizações e sessões sintéticos; algumas suítes compartilham fixture dentro do mesmo `beforeAll`, mas não foi encontrado estado global de login nem `storageState` compartilhado entre os arquivos.
- A suíte percorre a rota de login repetidamente. Usuários/organizações isolados não isolam o bucket do rate limit porque sua chave não inclui esses identificadores.
- Os contadores são mantidos em memória no processo Better Auth. Não existe limpeza por teste; aguardar a janela real é necessário para uma nova tentativa aceita.
- Teste negativo existente preservado: quatro falhas de login verificam `401, 401, 401, 429`. Foi aprovado na execução dirigida.
- Comparação controlada: execução serial inicial 25/42 respostas observadas em 429; serial após helper 13/57; dois workers 26/70. O incremento com paralelismo confirma pressão concorrente adicional, mas os 429 também ocorrem serialmente por chamadas válidas acumuladas entre testes.
- Teste afetado executado isoladamente: o endpoint de login retornou 200 e a rota Next respondeu 200, mas `page.goto` terminou com a página fechada. Um fluxo de login/logout também falhou antes de completar o formulário por fechamento do Chromium. Os logs do processo indicaram o fatal do Skia/font manager. Não se classificou isso como instabilidade do app nem como falha de autenticação.

## 5. Modificações no harness

Adicionado `tests/helpers/e2e-auth.ts` com espera/repetição limitada para login válido baseada no `X-Retry-After`, respeitando a janela enviada pelo servidor. O helper não repete credenciais inválidas, não muda headers de origem ou limites e devolve a falha após o máximo de tentativas. O login de UI observa a resposta exata do POST e aguarda a janela para nova submissão.

As specs E2E afetadas foram adaptadas para usar o helper: CRM core, multitenant security, pipeline listing, contacts/activities/archive, team assignment/transfer, team role/RBAC, security headers e UX visual. O caso de senha inválida agora confirma a resposta 401 antes do login válido. O teste negativo de limite permaneceu sem alterações. Nenhum código de produção foi alterado.

## 6. Validação CSP

- No repositório original já constam `z.config({ jitless: true })` em `src/components/zod-csp-provider.tsx` e a remoção dos estilos inline anteriormente apontados no dashboard. Uma busca nas fontes TypeScript/TSX não encontrou atributos `style=`.
- A política efetiva da resposta testada a `/login` continua em `Content-Security-Policy-Report-Only`. Diretivas observadas incluem `default-src 'self'`, `script-src` com nonce/`strict-dynamic`, `style-src` com nonce e `style-src-attr 'none'`; não há `unsafe-inline`. A política CSP enforced não foi servida pelo projeto.
- O teste HTTP de headers observou `/login` com 200 e Report-Only presente; o header `Content-Security-Policy` enforced estava ausente. A resposta não contém prova de enforcement.
- Em Chromium, eventos Report-Only indicaram violações de `style-src-attr` em `/_next` devtools durante `next dev`. Portanto, a origem observada é dependência/ferramenta de desenvolvimento; não prova uma violação da aplicação no build de produção. Não foi observada nova violação `eval` nessa execução. O processo atual não conseguiu separar de forma conclusiva violações próprias da aplicação e da instrumentação Playwright sob enforcement porque a aplicação permaneceu Report-Only e o Chromium fechou as páginas.
- `npm run build` com Turbopack ficou sem saída por mais de 90 segundos e foi interrompido. `npm run build -- --webpack` falhou ao interpretar a saída de `tsc --showConfig` emitida pelo Next, embora a execução direta de `tsc --showConfig` retornasse JSON válido. Não foi possível obter um build de produção validado nesta rodada.
- Não houve alteração de política para enforced, inclusão de `unsafe-eval`, relaxamento de diretivas ou uso de `bypassCSP` para aprovar o teste. CSP enforced em Chromium e os fluxos completos de autenticação/operações permanecem por validar neste checkout.

## 7. Validação de logging

Em execução API sem navegador contra o banco descartável, uma rejeição de autenticação do PostgreSQL com credenciais inteiramente sintéticas produziu resposta HTTP 500 genérica, sem detalhe técnico no corpo. A aplicação emitiu um evento estruturado `authentication-error`. Busca dos canários sintéticos nos logs da aplicação não encontrou e-mail, senha, token, SQL, stack trace ou caminho interno.

O PostgreSQL registrou `FATAL: password authentication failed` para o usuário sintético e detalhe estrutural da regra HBA. O cenário não chegou a executar uma consulta SQL; por isso, ele não valida redaction de parâmetros em erros de SQL. Configuração efetiva observada: `log_statement=none`, `log_min_error_statement=error` e `log_parameter_max_length_on_error=0`. A triagem SEC-02B.2 já havia observado estrutura SQL sem valores de parâmetros; o sink PostgreSQL continua separado dos logs da aplicação.

Nenhum novo caminho com e-mail, senha ou token em sink da aplicação foi encontrado; F005 permanece encerrada no escopo anteriormente corrigido, sem reabertura histórica. G-11 ainda depende de confirmar no destino de implantação os sinks de App/Next/PG/edge, redaction, ACL, owner e retenção/expurgo, inclusive o acesso aos logs estruturais PostgreSQL.

## 8. Testes executados

| Verificação | Resultado |
|---|---|
| `npm run typecheck` | Aprovado na cópia temporária. |
| `npm run lint` | Aprovado na cópia temporária. |
| Vitest: logging sanitizado e CSP | 10/10 aprovados em 2 arquivos. |
| Integração: rate limit Better Auth | 1/1 aprovado; preservou sequência negativa 401/401/401/429. |
| Spec API de logging com canários sintéticos e assertion do header CSP | Aprovada duas execuções. |
| Requests sem navegador | `GET /login` respondeu 200 e Report-Only; fluxo de falha de autenticação retornou erro genérico esperado. |
| E2E focado em login/cliente | Falhou por Chromium fechar a página; login API e rota Next responderam 200. |
| Build Next de produção | Não validado: Turbopack travou sem saída e Webpack falhou na leitura de `tsc --showConfig`. |

Os comandos foram executados somente na cópia em `/tmp/sec-02b3-20261103`, com dados sintéticos e banco descartável.

## 9. Resultados da suíte E2E

Todas as execuções usaram `retries: 0`; os totais não ocultam falhas por rerun automático.

| Execução | Workers | Resultado | HTTP 429 instrumentados |
|---|---:|---:|---:|
| Inicial, antes do helper | 1 | 1 passou, 46 falharam em 47 | 25/42 respostas observadas |
| Após helper | 1 | 4 passaram, 43 falharam em 47 | 13/57 respostas observadas |
| Concorrência controlada | 2 | 4 passaram, 44 falharam em 48 (inclui uma spec API temporária) | 26/70 respostas observadas |

Na execução com dois workers, as 70 respostas instrumentadas foram: 42×200, 1×401, 1×409 e 26×429. As 26 respostas 429 foram `POST /api/auth/sign-in/email`; `X-Retry-After` variou de 4 a 10 segundos, sem `Retry-After` ou headers `RateLimit*`. Máximo medido de concorrência: 2. Requisições de outros endpoints observadas: duas remoções de membro e duas consultas de sessão. Não houve prova de aprovação integral; 44 testes falharam nessa execução. Skips e timeouts: zero reportados; os casos restantes falharam, principalmente, depois do fechamento do browser. Não houve rerun Playwright automático.

## 10. Cobertura de regressão

Typecheck, ESLint, testes unitários de logging/CSP, integração do rate limit e uma spec API de logging foram executados. Foram inspecionados fluxo anônimo de login, sessão, teste de rate limit negativo e resposta HTTP genérica. A navegação e operações comerciais autenticadas não puderam ser confirmadas porque o processo Chromium encerrou as páginas. M-01/I-01 não foram reexecutados nesta etapa; suas evidências históricas não foram promovidas como validação atual. A construção de produção não concluiu.

## 11. Evidências dos gates

| Gate | Critério original | Estado SEC-02B.3 |
|---|---|---|
| G-11 — Logging redigido com ACL/retention verificáveis | Sinks de App/Next/PG/edge com destinos, acesso, redaction e expurgo definidos; canários ausentes nos sinks proibidos; auditoria de negócio preservada. | **Parcial.** Reconfirmada resposta genérica e ausência de canários nos logs da aplicação para o caminho reproduzido. PostgreSQL recebeu somente erro de autenticação neste cenário, não erro SQL. Collector real, ACL, redaction por fonte e retention continuam sem evidência operacional. Não aprovar. |
| G-15 — Testes de release e limites de CSP/tenant documentados | Suite relevante aprovada; M-01/I-01 executados quando aplicável; CSP Report-Only sem violações inexplicadas antes do enforcement. | **Parcial.** Origem dos 429 documentada e harness ajustado; suite integral reprovada por falhas reproduzíveis do Chromium e ainda teve rate limit ativo. CSP do checkout segue Report-Only; evento de estilo de Next devtools observado e a aplicação sob enforced não foi validada. Build de produção não concluiu. Não aprovar. |

Os identificadores e critérios acima são os definidos na SEC-02A. Nem G-11 nem G-15 avançam para aprovação nesta rodada.

## 12. Riscos residuais

- Chromium headless shell não é estável neste host para a suíte: o fatal do Skia/font manager fecha o browser e invalida o resultado de UI. É necessário validar em runner compatível e reproduzível antes de confiar em resultados E2E.
- A repetição de login legítimo espera a janela de bloqueio real; isso reduz bloqueios em cascata, mas não isola o estado do processo por usuário. O paralelismo controlado ainda aumenta colisões.
- O limitador em memória por processo e origem requer decisão de topologia. Com múltiplas instâncias, o estado pode não ser compartilhado; validar G-12 no destino definido, sem alterar limites para a suíte.
- CSP enforced e build de produção continuam sem evidência atual no repositório principal; eventos de `next dev` não substituem a análise de produção.
- Logging PostgreSQL de uma falha SQL e controles reais do collector/ACL/retention permanecem pendentes.
- Não declarar CRM pronto para produção.

## 13. Arquivos modificados

Arquivos de produção não foram modificados.

- Novo `tests/helpers/e2e-auth.ts`.
- Specs E2E adaptadas: `tests/e2e/crm-core-flows.spec.ts`, `multitenant-security.spec.ts`, `pipeline-listing-filters.spec.ts`, `contacts-activities-archive.spec.ts`, `team-assignment-transfer.spec.ts`, `team-role-rbac.spec.ts`, `sec-01b-security-headers.spec.ts` e `ux-visual-audit.spec.ts`.
- Novo relatório `docs/security/SEC-02B-03-e2e-stabilization.md`.
- Conhecimento atualizado em `docs/knowledge/testing.md`.

O repositório não tem commits e os arquivos existentes aparecem como não rastreados no Git; por isso, a lista acima representa os arquivos deste trabalho identificados, não uma comparação com histórico versionado.

## 14. Recursos temporários removidos

A cópia temporária do projeto, `node_modules`, artefatos E2E, banco descartável, container PostgreSQL e rede isolada foram removidos depois da verificação de propriedade e identidade. Nenhum container, volume ou rede preexistente foi removido. Não houve listeners deixados pela execução.

## 15. Próxima etapa recomendada

Reexecutar a suíte integral em runner Chromium validado, conservando um worker até confirmar estabilidade do browser; então comparar serial e concorrência controlada usando banco novo, sintético e descartável. Em paralelo, concluir o build de produção e testar CSP enforced em Chromium por observação direta, sem relaxar a política. G-11 requer o collector e as políticas reais de acesso, redaction e retenção da homologação escolhida. Manter publicação bloqueada até as evidências aplicáveis serem concluídas.
