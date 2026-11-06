# SEC-02B.5 — Consolidação e validação da CSP

**Data:** 2026-11-03  
**Escopo:** consolidar as correções de CSP investigadas nas etapas SEC-02B anteriores e validar a política enforced em build de produção descartável. Não houve acesso a produção, banco preexistente, `.env.local` ou credenciais reais.

## 1. Resumo executivo

A CSP nonce foi ativada como `Content-Security-Policy` nas respostas de documentos do build de produção e validada em Chromium sobre HTTPS local. Login válido e inválido, sessão, dashboard autenticado, exportação CSV, logout, navegação e probes negativos passaram. O probe negativo foi entregue como HTML sintético local e observado por eventos CDP `Audits.issueAdded`, sem `bypassCSP` ou execução do payload de teste pelo contexto privilegiado de `page.evaluate`.

A suíte de regressão final passou **47/47**, sem retries, skips ou timeouts; build, typecheck, ESLint e 107 testes unitários passaram. Uma execução anterior com CSP enforced em `NODE_ENV=development` passou 45/47 e expôs estilos temporários do Next/React dev e um `page.addStyleTag` usado pela auditoria UX. A implementação mantém CSP Report-Only em development/test e aplica enforcement em production; os fluxos reais com enforcement foram validados contra o build de produção.

O root layout agora força renderização dinâmica para que todos os documentos recebam nonce por requisição, conforme o modelo de CSP do Next.js. Isso remove páginas HTML do caminho estático e reduz oportunidades de cache estático; deve ser considerado na decisão de runtime/cache da arquitetura definitiva. Os resultados não aprovam produção.

## 2. Configuração CSP inicial

Antes desta etapa, `src/proxy.ts` gerava nonce por documento e encaminhava a política no request para o Next.js, mas publicava a resposta somente como `Content-Security-Policy-Report-Only`, inclusive no perfil que seria usado para produção. `next.config.ts` não declarava outra CSP e não foi alterado. O Proxy aplica a política às requisições GET/HEAD de documentos; APIs e caminhos excluídos do matcher não recebem CSP por este mecanismo. Assets herdam os headers básicos definidos em `next.config.ts`, não uma política CSP separada.

O matcher exclui `/api`, `/_next/static`, `/_next/image`, favicon, caminhos com ponto e prefetch do router. Não foram observados headers CSP duplicados no app nem no proxy HTTPS local da homologação; este proxy apenas encaminhou os headers da aplicação.

## 3. Causas das violações anteriores

- A violação de `eval` atribuída na SEC-02B.2 ao Zod 4.6.7 vinha do probe de capacidade baseado em `Function("")`. `src/components/zod-csp-provider.tsx` já configura `z.config({ jitless: true })`; a validação de Zod permanece ativa sem esse probe dinâmico.
- Dois estilos inline no dashboard já haviam sido substituídos por elementos SVG estilizados por classes. A revisão desta etapa confirmou as alterações no repositório.
- `style-src-elem` explícito foi necessário para separar autorização dos elementos `<style>` e `<link>` da política de atributos de estilo. A experiência inicial com CSP enforced no servidor de desenvolvimento registrou estilos transitórios de Next/React dev; uma spec UX existente também injeta CSS de teste por `page.addStyleTag`. Esses eventos pertencem à configuração de desenvolvimento/instrumentação e não foram observados no build de produção.
- Na primeira versão do teste negativo, a injeção por `page.evaluate` executou no contexto privilegiado de DevTools e não representou um script da página sujeito à CSP. O teste foi substituído por uma página sintética servida localmente, e as violações são observadas pelo domínio CDP Audits.

## 4. Correções implementadas

- `src/lib/content-security-policy.ts` mantém política centralizada, adiciona `style-src-elem 'self' 'nonce-…'` e remove `manifest-src` e `media-src`, sem uso identificado pela aplicação.
- `src/proxy.ts` continua encaminhando nonce e CSP no request para o Next.js. Em `NODE_ENV=production`, publica somente `Content-Security-Policy` e remove `Content-Security-Policy-Report-Only`. Em development/test, mantém a política em Report-Only e remove a resposta enforced. `unsafe-eval` permanece restrito ao script-src de desenvolvimento/test, conforme requisito da ferramenta de desenvolvimento; nunca é incluído em produção. Não há `unsafe-inline`.
- `src/app/layout.tsx` chama `connection()` no layout raiz para forçar renderização por requisição. Sem isso, o build produzia `/` e `/_not-found` estáticos, incompatíveis com nonce individual por request.
- A spec `tests/e2e/sec-01b-security-headers.spec.ts` valida política por ambiente, unicidade dos headers, cookies Secure em origem TLS, fluxos autenticados e probes negativos. O teste unitário de CSP foi ajustado para as diretivas finais.
- Não houve atualização de dependências, alteração de regra de negócio ou alteração da configuração CSP em `next.config.ts`.

## 5. Política final testada

Política de produção observada em documento (nonce omitido aqui):

```text
default-src 'self'; script-src 'self' 'nonce-[por-requisição]' 'strict-dynamic'; style-src 'self' 'nonce-[por-requisição]'; style-src-elem 'self' 'nonce-[por-requisição]'; style-src-attr 'none'; img-src 'self'; font-src 'self'; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
```

| Diretiva | Justificativa observada |
|---|---|
| `default-src 'self'` | Fallback restritivo para tipos não declarados explicitamente. |
| `script-src 'self' 'nonce-…' 'strict-dynamic'` | Scripts same-origin e scripts confiados por nonce; sem `unsafe-eval` em produção. |
| `style-src 'self' 'nonce-…'` | Fallback e compatibilidade para estilos. |
| `style-src-elem 'self' 'nonce-…'` | Estilos carregados pela aplicação e estilos Next autorizados com nonce. |
| `style-src-attr 'none'` | A aplicação validada não requer atributos `style` inline. |
| `connect-src 'self'` | Chamadas da aplicação são same-origin em produção. O WebSocket de HMR é adicionado apenas em desenvolvimento/teste local. |
| `img-src 'self'` | Imagens observadas são locais; não foi encontrado uso que exigisse `data:` ou origem externa. |
| `font-src 'self'` | Fontes WOFF2 são empacotadas localmente. |
| `frame-src 'none'` | Nenhum iframe é necessário nos fluxos analisados. |
| `object-src 'none'` | Bloqueia plugins/objetos incorporados não usados. |
| `base-uri 'self'` | Restringe elemento base ao próprio site. |
| `form-action 'self'` | Formulários e endpoints de autenticação são same-origin. |
| `frame-ancestors 'none'` | A aplicação não deve ser incorporada por frames. |

Não há nonce necessário em `next.config.ts`; o Next extrai o nonce do CSP encaminhado no request pelo Proxy. A configuração depende de renderização dinâmica e tem consequência para cache e desempenho. A documentação oficial do Next.js explica a geração de nonce, o custo de renderização dinâmica e a exceção de `unsafe-eval` no desenvolvimento: [CSP guide](https://nextjs.org/docs/app/guides/content-security-policy). O comportamento request/response do Proxy está descrito na [documentação Next.js 16 de Proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy).

## 6. Evidências com CSP enforced

- Build criado em cópia temporária limpa do projeto, sem carregar `.env.local`; somente valores sintéticos foram usados. Next.js `16.4.3`, Playwright `1.64.1`, Chromium `156.0.8078.4` (revisão Playwright 1248) e Zod `4.6.7`.
- `next build` terminou com sucesso; todas as rotas, inclusive `/` e `/_not-found`, foram listadas como dinâmicas após `connection()`.
- Next production foi acessado por HTTPS em loopback via proxy temporário com certificado local sintético. O runner ignorou apenas a validação da CA self-signed local (`ignoreHTTPSErrors`); CSP permaneceu ativa. Não se usou `bypassCSP`.
- Os documentos `/login` e `/dashboard` retornaram exatamente um header `Content-Security-Policy`, sem `Content-Security-Policy-Report-Only`. Nonces variaram por documento. O proxy não adicionou política. APIs e downloads não apresentaram CSP, de acordo com o escopo deliberado do matcher.
- A página de login e dashboard autenticado não apresentaram violações CSP enforced. Sessão, navegação, escolha de organização e exportação funcionaram; o cookie de sessão foi verificado como Secure na origem HTTPS. Login inválido retornou mensagem genérica e resposta de erro esperada.

## 7. Testes negativos

HTML inteiramente sintético, atendido por rota local controlada com a CSP exata de produção, tentou: script inline sem nonce, `eval`, script externo não autorizado, elemento `<style>` inline e atributo `style`. Um script válido com nonce serviu como controle positivo. O teste observou eventos `Audits.issueAdded` do Chromium, e cada evento indicou disposição enforced. Foram observados bloqueios para `script-src-elem` inline, `script-src` eval, `script-src-elem` URL externa, `style-src-elem` inline e `style-src-attr` inline; o script autorizado por nonce executou. Nenhuma requisição externa foi realizada e não houve mutação dos flags de teste dos comportamentos bloqueados.

O teste não usa `page.evaluate` para injetar os comportamentos sob teste; esse método havia sido identificado como inadequado para prova de bloqueio por rodar no contexto DevTools. Nenhum payload foi enviado a serviço externo.

## 8. Build

`npm run build` passou usando a cópia isolada, com variáveis sintéticas e PostgreSQL descartável. Todas as rotas ficaram dinâmicas devido à exigência de nonce por request. A renderização dinâmica é custo e implicação de cache que devem ser incluídos na decisão de arquitetura; nenhuma alteração foi promovida à infraestrutura de produção.

## 9. Regressão

- Typecheck: aprovado.
- ESLint: aprovado, sem erros/avisos.
- Unitários: 107/107 aprovados (17 arquivos), incluindo 2 testes de política CSP.
- Teste focado de produção/CSP e fluxos de auth: 1/1 aprovado.
- Suíte integral Playwright: **47/47 aprovados**, um worker, zero retries, skips e timeouts; relatório final `test-results/.last-run.json` indica status `passed` e lista de falhas vazia. Duração informada pelo Playwright: 2,2 min.
- A execução inicial de diagnóstico, que forçou enforcement também em development, teve 45/47 aprovados. Falharam a auditoria de headers por estilos injetados pelo runtime dev e a navegação por teclado que depende de `page.addStyleTag`. A política foi separada por ambiente conforme a finalidade do controle; ambas as falhas desapareceram na regressão final. Não foram relaxadas assertions nem alterados timeouts.
- Integrações Vitest não foram reexecutadas nesta etapa; os caminhos de auth/persistência pertinentes foram exercitados pela spec E2E contra PostgreSQL descartável. As 53 integrações citadas em relatórios anteriores são evidência histórica, não validação SEC-02B.5.

## 10. Resultado da suíte E2E

Baseline SEC-02B.4 preservada: descoberta de 47 testes; a execução final desta etapa aprovou os 47, sem retries, skips, timeouts, respostas 429 ou fatal Skia. A spec CSP focada executou também no projeto production e aprovou 1/1. O cenário inicial com enforcement em desenvolvimento é registrado acima como diagnóstico, não como resultado final aprovado.

## 11. Gates G-11 e G-15

**Atenção: há divergência entre a descrição dos gates no pedido desta etapa e os identificadores da SEC-02A.** A SEC-02A define **G-11 como logging redigido com ACL/retention verificáveis** e **G-15 como testes de release e limites CSP/tenant documentados**. Esta documentação preserva os identificadores e critérios originais, sem transferir descrições.

- **G-15 — parcialmente validado.** A evidência de CSP em build de produção local e regressão E2E melhora os critérios de homologação. Não aprova o gate integralmente: ambiente de implantação, proxy/TLS reais, eventual CSP de edge, pipeline de release e demais critérios originais continuam pendentes. Esta validação não promove CSP para produção.
- **G-11 — parcialmente validado, status preservado.** Nenhum sistema de coleta foi implementado ou avaliado nesta etapa. Destino, ACL, retenção, redaction operacional e administração dos coletores dependem da arquitetura definitiva e de evidência operacional. A evidência de logging das etapas anteriores permanece no escopo histórico; não foi reaberta F005.

## 12. Riscos residuais

- `connection()` no root layout faz todas as rotas dependerem de renderização por request; revisar cache e latência no destino escolhido.
- A validação é local/descartável e não demonstra o comportamento do proxy, edge, TLS, cache ou collector definitivo. Se a infraestrutura adicionar uma CSP própria, duas políticas podem ser aplicadas cumulativamente; o destino escolhido deve atribuir CSP a uma única camada.
- Development/test continuam Report-Only para não bloquear tooling de desenvolvimento. Enforcement foi demonstrado apenas no build de produção descartável.
- APIs, assets estáticos, prefetch e downloads estão fora do matcher CSP; isso é escopo intencional do código atual, mas a fronteira precisa ser compatibilizada com qualquer política adicional da implantação.
- O incidente PW-005 sobre Skia permanece com causa exata inconclusiva; a execução final desta etapa não registrou novo fatal.
- G-11 e G-15 permanecem parciais segundo SEC-02A. CRM não foi declarado pronto para publicação.

## 13. Arquivos modificados

- `src/lib/content-security-policy.ts`
- `src/proxy.ts`
- `src/app/layout.tsx`
- `tests/unit/security/content-security-policy.test.ts`
- `tests/e2e/sec-01b-security-headers.spec.ts`
- `docs/security/SEC-02B-05-csp-enforcement.md` (este documento)

Não houve alteração de package manifest/lockfile, `.env*`, regras de negócio, `next.config.ts` ou infraestrutura de produção.

## 14. Recursos temporários removidos

Execução realizada na cópia `/tmp/sec02b5-20261103`, com PostgreSQL 18 descartável `sec02b5-pg-20261103` e rede isolada `sec02b5-net-20261103`; o banco usou apenas tmpfs e dados sintéticos, sem volume persistente. Certificado/chave TLS locais e variáveis sintéticas estavam no diretório temporário. O ID e os mounts do container foram conferidos antes da remoção. Após os testes, o container e a rede foram removidos; não havia mounts persistentes. A verificação final não encontrou container/rede com esses nomes, listeners em 5433/3100/3101 ou o diretório `/tmp/sec02b5-20261103`. Containers e volumes preexistentes não foram removidos.

## 15. Próxima decisão recomendada

Manter G-11 parcial até o destino operacional de logs e seus controles serem definidos e verificados. Avaliar G-15 conforme os critérios da SEC-02A, incorporando a escolha de runtime/cache e a política do proxy/edge à configuração de homologação definitiva. Não habilitar a CSP em produção com base exclusivamente nesta cópia local.

## 16. Referências preservadas

- [SEC-02A — arquitetura-alvo e critérios originais de G-11/G-15](SEC-02A-target-architecture.md)
- [SEC-02B.2 — remediação inicial e evidência temporária](SEC-02B-02-gates-remediation.md)
- [SEC-02B.3 — estabilização E2E e logging](SEC-02B-03-e2e-stabilization.md)
- [SEC-02B.4 — diagnóstico Chromium e baseline 47/47](SEC-02B-04-chromium-stability.md)
