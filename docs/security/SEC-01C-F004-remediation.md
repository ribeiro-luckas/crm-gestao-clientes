# SEC-01C.3 — F004: headers HTTP

**Status:** implementação no repositório concluída; validação dinâmica local pendente. Produção e HTTPS não avaliados.
**Escopo:** somente headers HTTP/CSP. Nenhuma alteração em autenticação, autorização, regras comerciais ou banco.

## Diagnóstico

A configuração anterior de `next.config.ts` desabilitava `X-Powered-By`, mas não declarava os headers básicos de segurança. A captura histórica da SEC-01B observou a ausência de CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` e `Permissions-Policy` no servidor HTTP local. Essa observação não descreve proxy, edge ou ambiente publicado.

O CRM usa Next.js 16 App Router. O layout autenticado é `force-dynamic`, e login e páginas comerciais dependem de `searchParams`, sessão e dados do workspace. Foram encontradas fontes, CSS e scripts locais; não foram encontrados scripts/iframes externos. O dashboard possui dois usos de `style` inline para larguras calculadas. CSV já retorna `private, no-store`; respostas de autenticação e páginas privadas observadas na SEC-01B usam cache privado/no-store. Não foi alterado cache.

## Implementação

`next.config.ts` define, para `/:path*`, uma única vez:

| Header | Valor | Aplicação |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Páginas, API e assets |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Páginas, API e assets |
| `X-Frame-Options` | `DENY` | Páginas, API e assets; não há caso de uso de iframe encontrado |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Recursos não usados pelo CRM |
| `X-Powered-By` | removido | Configuração preexistente preservada |

Não foi adicionado `Cache-Control` global para preservar as políticas existentes por rota.

## CSP

`src/proxy.ts` gera nonce criptográfico novo em cada GET/HEAD de documento, encaminha ao renderizador um CSP de requisição e entrega o mesmo valor como `Content-Security-Policy-Report-Only`. A política candidata usa `default-src 'self'`, nonce e `strict-dynamic` para scripts, nonce para style elements, `style-src-attr 'none'`, imagens/fontes/conexões próprias, `frame-src 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'` e restrições de manifest/media. Não foram encontradas imagens, fontes, iframes ou conexões externas no código inventariado, portanto não há origens ou esquemas `data:`/`blob:` adicionais. O websocket de HMR é acrescentado somente em desenvolvimento/teste quando o hostname é loopback. API, arquivos com extensão, assets Next e prefetches são excluídos do Proxy; continuam recebendo os headers básicos do `next.config.ts`.

O header é **Report-Only**, sem endpoint externo de coleta. Não bloqueia recursos: o teste de navegador registra violações apenas com diretiva, disposição e categoria do recurso, sem URL completa. Não são usados `unsafe-inline`, wildcard ou origens externas. `unsafe-eval` é incluído somente para `NODE_ENV=development`/`test`, pois o teste usa `next dev`; não é incluído quando `NODE_ENV=production`.

Esta política ainda não está pronta para enforcement: os `style` attributes dinâmicos do dashboard devem aparecer como violações `style-src-attr`. O modo Report-Only permite observar o impacto sem degradar a interface. Antes de enforcement, refatorar esses styles ou aprovar uma exceção específica documentada e reavaliar seu custo de segurança. A política deve ser verificada nas páginas e fluxos completos no Bazzite; zero violações não pode ser inferido da compilação estática.

O uso de nonces exige renderização dinâmica e pode impedir otimização estática/ISR e cache de CDN para páginas cobertas. O app shell privado já é dinâmico; o login usa parâmetros de busca. A rota raiz apenas redireciona e outras páginas precisam ser confirmadas em build/runtime. Nonces podem aumentar trabalho de SSR e impedir cache estático. Não foi aplicado `force-dynamic` indiscriminadamente.

## HTTPS, HSTS e cookies

HSTS não foi configurado. O domínio, proxy/TLS termination, obrigatoriedade de HTTPS e relação entre subdomínios são desconhecidos. Não adicionar `includeSubDomains` ou `preload` antes de confirmar esses requisitos. A política recomendada é definir HSTS na única camada que termina HTTPS depois de comprovar o domínio e todos os subdomínios envolvidos, e validá-lo numa resposta HTTPS real.

Nenhuma configuração Better Auth/cookie foi alterada. O código já define cookies Secure quando `NODE_ENV=production`; a captura histórica HTTP local registrou `HttpOnly`, `SameSite=Lax`, `Path=/` e `Secure=false`, esperado no transporte HTTP de teste. O atributo Secure em produção não foi observado.

## Testes e evidências

Adicionados dois testes unitários para a construção de política: nonce/limitações em desenvolvimento e ausência de `unsafe-eval` em produção. A spec `tests/e2e/sec-01b-security-headers.spec.ts` agora verifica headers básicos em HTML, JSON, CSV, respostas autenticadas e negativas; cache CSV; flags sanitizadas de cookies; nonce em scripts inline; headers e MIME de CSS/JS locais; nonce distinto entre páginas; e registra violações CSP sanitizadas no artefato existente `test-results/security-sec01b/headers.json`.

Execução local atual: `npm run typecheck`, `npm run lint` e `npm test` passaram; os testes unitários somaram 96 em 17 arquivos. Playwright/E2E, integração, regressão completa, M-01 e I-01 não foram executados: o executor atual não disponibiliza `distrobox`/`podman`, e a identidade/conectividade do PostgreSQL autorizado não foi confirmada. Nenhuma captura de resposta nova foi produzida. A execução Bazzite anterior de 47 E2E e 12 integrações é apenas baseline histórico.

## Acompanhamento SEC-01C.3.1 — header Report-Only ausente

O erro em `expectCspReportOnly()` na linha 67 era causado pelo layout do arquivo Proxy: o projeto usa `src/app`, mas o arquivo estava em `./proxy.ts` na raiz. A convenção oficial exige que `proxy.ts` fique no mesmo nível que `app` quando se usa a pasta `src`; assim, o Proxy anterior não era descoberto para `/login`. O manifesto local `.next/server/middleware-manifest.json` estava vazio, mas tinha timestamp anterior à execução reportada, então é evidência apenas corroborativa de artefato stale, não uma medição daquela resposta Bazzite.

A linha que falhava fazia `GET /login` por `page.request.get`, e esperava uma resposta 2xx antes da asserção. O relatório de erro não guardou status ou Content-Type; a spec agora captura método, caminho, status, tipo de conteúdo, redirecionamento e presença dos headers, sem valores de nonce/cookie. Também limita a expectativa de CSP a documentos HTML reais. O Proxy foi movido para `src/proxy.ts`, ao lado de `src/app`; seu export nomeado `proxy`, matcher e geração de nonce foram preservados.

| Tipo de resposta | CSP Report-Only | Justificativa/asserção |
|---|---|---|
| HTML público `/login` | Obrigatória | Documento executável; verificada por GET e navegação real |
| HTML privado `/dashboard` | Obrigatória | Documento com dados autenticados; nonce por resposta |
| HTML `/workspace/select` | Obrigatória | Documento dinâmico protegido; rota testada separadamente |
| JSON/API Better Auth e sessão | Não exigida | Não são documentos; headers básicos continuam verificados |
| CSV de exportação | Não exigida | Download, não documento executável; `private, no-store` e headers básicos preservados |
| CSS/JavaScript estáticos | Não repetida | Assets são excluídos do matcher; CSP do documento controla seu carregamento e `nosniff` continua obrigatório |
| Redirect de página privada | Não exigida no redirect | Redirect não é documento; status/destino são verificados e a página HTML final `/login` precisa ter CSP |

O nonce é encaminhado em `x-nonce` e no request header `Content-Security-Policy`, que o Next usa para adicionar nonce aos scripts/estilos inline gerados; só `Content-Security-Policy-Report-Only` é enviado na resposta ao navegador. O request header não ativa enforcement no navegador. Nenhum header CSP enforcement é esperado nesta etapa. A implementação e a asserção do documento preservam essa distinção conforme o guia oficial do Next.

O erro original comprovou a ausência da CSP na resposta testada, mas não registrou o número/classificação de violações CSP. Contagem de violações pós-mudança permanece pendente de execução da spec no Bazzite. Não houve alteração para enfraquecer políticas ou para exigir CSP de API/assets.

## Acompanhamento SEC-01C.3.2 — correspondência de nonces por documento

**Diagnóstico do código:** a hipótese de que a asserção comparava o nonce do `page.request.get("/login")` aos scripts de uma navegação posterior não corresponde à spec inspecionada. A resposta do GET auxiliar tem seu nonce guardado separadamente; `loginNonce` é extraído da resposta de `page.goto("/login")`, e os scripts são lidos do documento carregado nessa navegação. O GET auxiliar continua sendo uma verificação independente de headers.

A falha estava na leitura do DOM: a spec usava `script.getAttribute("nonce")`. Browsers modernos ocultam o atributo nesse getter; a propriedade `HTMLScriptElement.nonce` é a API apropriada para ler seu valor. A correção troca a leitura para `.nonce`. Isso confirma um defeito na medição do teste, mas, sem a execução Chromium desta alteração, ainda não prova que todos os scripts renderizados pelo Next receberam o nonce correto.

A validação agora mantém o nonce de cada resposta apenas em memória e compara a política Report-Only da resposta de navegação com scripts do mesmo documento. A coleta inclui scripts executáveis inline e externos, marcadores `data-nscript` e contagem de atributo oculto por `getAttribute`. Anexos, assertions e artefatos registram apenas contagens/estados sanitizados. Nonces de cinco respostas HTML independentes (GET auxiliar do login, navegação login, GET dashboard, navegação dashboard e seleção de workspace) são comparados por igualdade agregada, sem imprimir os valores; três documentos de navegação também são verificados individualmente contra suas próprias políticas. A resposta HTML final de redirect para login permanece em Report-Only e também é verificada para ausência de CSP enforcement. A SEC-01C.3.3 identificou que as contagens anteriores de ausentes/divergentes não eram mutuamente exclusivas; a instrumentação exclusiva por estado descrita abaixo substitui aquela medição.

A spec coleta violações Report-Only por documento com diretiva, disposição e categoria sanitizada do recurso, e anexa o resumo. A classificação real de `script-src`, `style-src`, `style-src-attr`, `connect-src`, `img-src` e outras diretivas continua pendente da execução no Bazzite; em particular, não se declara quantidade atual de violações do dashboard.

**Validações desta alteração:** `npm run typecheck`, `npm run lint` e `npm test` passaram nesta execução; Vitest reportou 96 testes em 17 arquivos. O verificador da base de conhecimento também passou, sem erros. O executor dispõe de Node/npm e `node_modules`, mas não encontrou `distrobox`, `podman` ou Chromium; a identidade e disponibilidade do PostgreSQL isolado não foram confirmadas. Não foi executado E2E nem acessado banco. Assim, a causa provável da falha reportada é o uso de `getAttribute`, enquanto a correspondência real de todos os scripts com a política por documento permanece aguardando o Chromium autorizado.

## Acompanhamento SEC-01C.3.3 — scripts sem nonce/divergentes

**Evidência Bazzite fornecida:** a falha ocorreu no primeiro documento verificado, `/login`, com 27 elementos `script`: 4 inline, 23 externos, 2 classificados como sem nonce, 2 como divergentes e 25 com nonce hiding. O artefato `test-results/sec-01b-security-headers-S-c2052-endo-evidências-sanitizadas-chromium/error-context.md` contém apenas contagens agregadas, não identidade/índice/origem de cada script nem eventos CSP. Não havia `headers.json` sanitizado dessa execução.

**Causa confirmada na instrumentação antiga:** `differentNonce` era calculado por `currentNonce !== responseNonce`; para um script sem nonce, `currentNonce` é `""`, portanto ele também era contado como divergente. No mesmo conjunto de 27 scripts, os 2 ausentes são necessariamente subconjunto dos 2 “divergentes”; as contagens iguais provam que são os mesmos dois elementos. A distribuição confirma um inline e um externo em ambos os contadores; não houve script com nonce presente divergente nesse documento. Os outros 25 tinham nonce presente e, como `nonceAttributeHiddenCount=25`, o atributo estava oculto para todos; junto com a contagem de divergência isso indica que os 25 valores `.nonce` correspondiam à política. Ainda não se conhece a identidade/posição/fonte dos dois sem nonce. `nonceAttributeHidden` sozinho mede apenas a ocultação por `getAttribute`, não a correspondência.

A instrumentação foi ajustada para atribuir um único estado por script relevante: `missing`, `different` (somente quando existe nonce) ou `matches-document`. O anexo sanitizado lista cada script sem correspondência por índice e registra apenas categoria de tipo, inline/externo, origem própria/externa, marcador `data-nscript`, caminho conhecido `/_next/`, heurística textual booleana para runtime inline do Next, indicador de desenvolvimento, correspondência do nonce e contagem de eventos CSP associados. `nextDataNscriptMarkerCount`, caminhos conhecidos e heurística de conteúdo são dimensões independentes; o valor antigo `nextRuntimeScriptCount=0` apenas indicava ausência do atributo `data-nscript`, não ausência de scripts do Next. O marcador, o caminho `/_next/` e a heurística de conteúdo não concedem autorização. Nenhum nonce, código, URL completa, query string, cookie ou credencial é anexado. Scripts observados depois de `DOMContentLoaded` são identificados como inseridos posteriormente; os demais ficam explicitamente como “markup inicial ou inserção pré-DOMContentLoaded não distinguível”, pois a observação não comprova sua origem exata.

O listener de `securitypolicyviolation` é instalado por `page.addInitScript()` antes das navegações. Cada snapshot e anexo CSP é coletado antes das asserções de nonce; eventos são agrupados por `effectiveDirective`, `violatedDirective`, disposição, categoria sanitizada do recurso, índice associado quando o elemento pôde ser correlacionado, e quantidade. Para scripts externos sem nonce, o registro informa se houve uma violação `script-src*` correlacionada ou se nenhuma foi observada; nenhuma origem/path conhecido é usado como lista de autorização. Erros de console/page e falhas de rede recebem somente categorias/indicadores de hidratação ou CSP, tipo de recurso e origem classificada; mensagens e URLs não são armazenadas.

**Interpretação CSP:** Chromium aplica `strict-dynamic` a partir de um script raiz autorizado por nonce/hash e permite que esse script carregue outros scripts sem exigir nonce em cada elemento externo. Em browsers CSP3, `'self'` e listas de origem deixam de autorizar por si só elementos sem confiança propagada. Scripts inline continuam precisando de nonce/hash compatível. A spec agora exige nonce correspondente para scripts inline, rejeita qualquer nonce presente porém divergente e rejeita violações `script-src*` reportadas pelo browser. Ela não falha somente porque um script externo não tem nonce: sua elegibilidade depende do resultado Report-Only real do Chromium, e o caminho `/_next/` ou um rótulo de ferramenta nunca é tratado como autorização. O anexo reporta se o elemento foi observado depois de `DOMContentLoaded`, sem afirmar a cadeia de confiança de um script carregador.

**Estado da causa:** ainda não é possível identificar quais elementos são os dois sem nonce nem determinar se o externo é autorizado por `strict-dynamic`. O relatório agregado antigo não tem os dados necessários. A alteração atual é somente na spec diagnóstica e nesta documentação; CSP e código de produção não foram modificados. Validação dinâmica, violações CSP atuais e compatibilidade do ambiente de desenvolvimento continuam pendentes no Bazzite. Não foi avaliado build de produção.

**Validações SEC-01C.3.3:** typecheck, ESLint e testes unitários passaram nesta execução; 96 testes em 17 arquivos. O verificador da base de conhecimento passou sem erros. A spec focal e regressão E2E não foram executadas aqui: Distrobox, Podman e Chromium não estão disponíveis no executor, e não foi validado o banco PostgreSQL isolado. Os números 27/4/23/2/2/25 acima pertencem à execução Bazzite reportada pelo solicitante, não são resultado desta execução. Nenhuma quantidade atual de violações CSP pode ser declarada.

## Acompanhamento SEC-01C.3.4 — investigação de scripts sem nonce

**Evidência Bazzite fornecida:** no documento `/login` foram observados 27 scripts: 25 com nonce correspondente à política daquele documento, dois sem nonce e nenhum nonce não vazio divergente. Os dois elementos sem nonce foram observados depois de `DOMContentLoaded`: um script externo same-origin em caminho classificado como `/_next/`, sem violação `script-src*` associada; e um elemento inline que a heurística anterior não reconheceu como runtime Next. O relatório fornecido não contém atributos, ancestral, tipo, texto, eventos de ciclo de vida ou registros CSP por elemento, então não identifica conclusivamente nenhum deles nem comprova execução.

**Revisão estática do código instalado:** a busca no código da aplicação não encontrou uso de `next/script`, `page.addScriptTag`, criação explícita de `<script>`, `document.write`, `innerHTML` ou `dangerouslySetInnerHTML` para inserir scripts. A spec usa `page.addInitScript()` somente para instalar observadores/listeners; ela não cria elementos `<script>`. Essa busca reduz as origens explícitas conhecidas, mas não exclui scripts gerados pelo framework/runtime ou bibliotecas.

No Next.js 16.4.3 instalado, `next/dist/client/route-loader.js` contém `appendScript`, que cria um `<script>`, define `src` e o acrescenta a `document.body` sem atribuir nonce. Isso é compatível com a categoria observada do script externo 21, mas caminho same-origin `/_next/` e a existência desse helper não provam que esse elemento específico veio dele nem quem o carregou. O teste agora registra `data-nscript`, tipo, nomes de atributos (sem valores), categoria de origem, pai, indicador de mutação, evento `load`/`error`, `initiatorType` de Resource Timing e se sua assinatura é única entre os scripts do DOM. Eventos CSP externos só são associados a um elemento quando há exatamente uma correspondência de URL no DOM; a URL completa não é armazenada. A propagação de confiança por `strict-dynamic` depende da cadeia de carregamento executada pelo browser; nome de caminho, origem ou evento `load` não é tratado como prova isolada dessa cadeia.

O mesmo pacote contém `createServerInsertedMetadata`, que gera um script inline para mover links de ícone do `body` para o `head`; o helper inclui nonce quando o contexto de renderização fornece um. O script 26 **pode** corresponder a esse helper, mas o relatório atual não fornece informação que confirme essa correspondência. A spec acrescentou um indicador booleano de assinatura dessa operação, além de tipo, comprimento do texto (sem o conteúdo), nomes de atributos, pai e informação de inserção. Se coincidir, isso será uma classificação por assinatura para revisão, não uma autorização automática. A ausência do nonce continua sendo falha para qualquer script inline executável que a política candidata não autorize.

**Evidência de execução:** `addedAfterDOMContentLoaded` demonstra somente que a instrumentação observou a inserção depois desse evento. Um evento `load` externo confirma somente que o evento do elemento foi observado; os campos do relatório foram nomeados para não declarar execução. Para inline, `securitypolicyviolation` informa a diretiva/disposição e recurso, mas não possui referência ao elemento que permita atribuir com segurança uma violação inline a um script específico. A coleta mantém essa limitação explícita. `disposition` é preservado, eventos `script-src*` não são filtrados, e o teste aguarda duas frames estáveis com os scripts externos resolvidos (ou falha no limite de espera) antes de coletar e anexar os resultados.

O resumo sanitizado do DOM, as violações CSP e os diagnósticos são atribuídos a `observed` antes das asserções de nonce. O bloco `finally` sempre grava `security-header-audit.json` no diretório de saída da execução, inclusive após falha; o `headers.json` compartilhado permanece um artefato de conclusão bem-sucedida. Nenhum conteúdo inline, nonce, cookie, token ou URL completa é incluído. A afirmação anterior de que a coleta por elemento dependia apenas do caminho de runtime foi substituída por esses metadados diagnósticos, sem enfraquecer asserções: script inline sem nonce, nonce divergente e qualquer violação `script-src*` continuam falhando; script externo sem nonce não é autorizado por heurística e ainda requer ausência de violação real para a política candidata.

**Resultado e limites:** não foi possível confirmar a origem nem a execução efetiva dos scripts 21 e 26 nesta execução. O executor não disponibiliza Chromium, Distrobox ou Podman; a spec focal não foi executada novamente e o banco isolado não foi validado. Portanto, não há contagem atual de violações CSP, prova de cadeia `strict-dynamic` ou confirmação de que a assinatura inline do Next coincide com o elemento 26. CSP segue exclusivamente em Report-Only, sem mudanças na aplicação ou na política. Enforcement e HTTPS permanecem pendentes.

**Validações SEC-01C.3.4:** `npm run typecheck`, `npm run lint` e `npm test` passaram; Vitest reportou 96 testes em 17 arquivos. `git diff --check`, verificação manual de whitespace/newline dos três arquivos alterados e consistência da base compartilhada passaram. Uma verificação Node isolada da assinatura confirmou que o detector reconhece o código-fonte instalado do helper de ícones; isso valida somente o padrão, não a identidade do script no documento Bazzite. Não havia Chromium, Distrobox ou Podman disponíveis neste executor; `TEST_DATABASE_URL` não foi carregada nem validada e nenhum banco foi acessado. A spec focal, a regressão E2E, as integrações F001/F002/F003/RBAC, M-01 e I-01 permanecem pendentes.

## Arquivos

- `next.config.ts`
- `src/proxy.ts`
- `src/lib/content-security-policy.ts`
- `tests/unit/security/content-security-policy.test.ts`
- `tests/e2e/sec-01b-security-headers.spec.ts`
- este documento e os relatórios F004 relacionados.

## Pendências antes do encerramento

1. No Bazzite, validar `TEST_DATABASE_URL` para `127.0.0.1:5433/crm_test_isolated`, usuário `crm_test_admin`, com `DATABASE_URL` removida; executar a spec de headers e inspecionar o artefato sanitizado.
2. Confirmar que documentos têm nonce novo, scripts carregam, APIs/assets recebem os headers básicos e CSV mantém `private, no-store`.
3. Rever cada evento Report-Only e testar login, dashboard, troca de workspace, formulários, Kanban, temas e exportação.
4. Executar regressão E2E completa, integrações de segurança e preflights M-01/I-01 no banco isolado.
5. Definir camada TLS/domínio antes de HSTS; medir headers e Secure cookies no ambiente HTTPS autorizado antes de qualquer status de produção.
6. Decidir a refatoração/exceção dos estilos inline antes de CSP enforcement.
7. Executar novamente `tests/e2e/sec-01b-security-headers.spec.ts` no Bazzite; verificar contagens de scripts ausentes/divergentes e o artefato sanitizado de violações antes de considerar a medição de nonce validada.

## Referências técnicas

- Next.js [CSP guide](https://nextjs.org/docs/app/guides/content-security-policy), [headers config](https://nextjs.org/docs/app/api-reference/config/next-config-js/headers) e [Proxy convention](https://nextjs.org/docs/app/api-reference/file-conventions/proxy).
- MDN [HTMLElement: nonce](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/nonce) documenta a leitura do nonce pela propriedade DOM e a proteção do atributo contra exposição via `getAttribute`.
- MDN [CSP `script-src`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src) documenta `strict-dynamic`, propagação de confiança e o descarte de `'self'` como allowlist em browsers que suportam CSP3.
- OWASP [HTTP Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html) e [Content Security Policy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html).

## Acompanhamento SEC-01C.3.5 — timeout de observação

### Artefato examinado antes das alterações

Foi lido integralmente o único `security-header-audit.json` disponível, junto de `error-context.md`, em `test-results/sec-01b-security-headers-S-c2052-endo-evidências-sanitizadas-chromium/`. Os dois arquivos têm timestamps adjacentes (2026-11-02 23:10:58 -0300) e o contexto aponta para a mesma asserção `timedOutAtFrameLimit` fornecida nesta tarefa. São compatíveis com a execução reportada; sem identificador de execução não é possível comprovar outra cronologia fora desse par local. Não foram sobrescritos nem produzidos por esta execução.

O artefato contém `/login` com status 200, HTML e Report-Only presente, enforcement ausente, headers básicos presentes e nenhum diagnóstico de navegador. Há 27 scripts, 23 externos, 22 eventos `load`, nenhum evento de erro e 25 nonces correspondentes. As cinco entradas CSP agrupadas totalizam **33 ocorrências `style-src-elem`, todas `disposition=report`**; zero ocorrências `script-src*` foram registradas no intervalo observado. Isso não representa toda a aplicação nem prova ausência de eventos posteriores.

**Lacuna confirmada:** `loginStability` não foi incluído no JSON; era apenas anexado separadamente e esse anexo não está disponível. Não existem frames observados, contagens de mutações, tempo decorrido, lista dos candidatos sem conclusão ou estado funcional verificado. A asserção de heading ficava depois da asserção de estabilização e não foi alcançada. Portanto, não é possível atribuir conclusivamente o timeout a eventos perdidos ou mutações. A diferença entre 23 externos e 22 eventos `load` indica uma conclusão não observada no snapshot; não comprova requisição de rede pendente. O script 21 recebeu `load` e não é esse candidato.

### Condição anterior e alteração da instrumentação

O algoritmo exigia duas frames sem qualquer mutação `childList` no documento inteiro, além de `load` ou `error` observado para todo script com `src`. Encerrava em 60 frames, sem prazo temporal independente. A ausência de um evento era tratada como pendência permanente. Os listeners já eram instalados por `addInitScript`, antes dos scripts da página; não há evidência de instalação tardia neste caso. Sessenta frames tampouco representam uma duração fixa entre máquinas.

A correção mantém o limite de **60 frames** e as **duas frames** estáveis, restringindo as mutações ao objeto da auditoria: adição/remoção de scripts, alteração de `src`/`type`/`nonce` e texto diretamente no elemento. Mutações de componentes sem relação com scripts são contadas, mas não reiniciam a observação. Um prazo independente de 5000 ms encerra a coleta como incompleta se RAF deixar de avançar; ele não amplia o limite de frames nem concede aprovação.

Antes da observação, o teste verifica prontidão funcional por locators: heading, campos E-mail/Senha habilitados e botão Entrar no CRM no login; main e heading esperado nos documentos autenticados. Os resultados ficam no JSON, inclusive em caso negativo. Asserções de hidratação também são preservadas por documento. O método não usa `networkidle`, esperas fixas ou a ausência absoluta de mutações como prontidão.

O novo resumo persiste `documentReadyState`, `framesObserved`, `configuredFrameLimit`, `elapsedMs`, `configuredDeadlineMs`, `stableForFrames`, contagens total/relevante de mutações, última categoria, `pendingExternalScriptCount`, metadados de `completionUnobservedScripts`, contagens de eventos `load`/`error`, scripts e violações, prontidão funcional e `stabilityExitReason`. Cada candidato sem evento recebe apenas índice, categorias de origem/caminho/tipo, nomes de atributos, presença de nonce e sinais de Resource Timing. Transferência concluída não é convertida em prova de execução ou de autorização. A designação explícita é `unobserved-not-proven-pending`.

A coleta só passa se terminar em `script-observation-settled` e não houver conclusão externa desconhecida. Saídas por frames, prazo, prontidão negativa ou instrumentação ausente continuam falhando, com evidência incompleta identificada. O teste registra `auditPhase`, `failurePhase`, `auditOutcome` e mantém o JSON em `finally`, além dos anexos sanitizados antes das asserções. Essa mudança corrige a abrangência indevida da observação e a falta de diagnóstico; ainda não demonstra que o candidato sem evento se resolverá no Chromium.

### Identificação dos scripts

- **Script 21:** externo, no head, somente atributo `src`, caminho Next, inserção observada após DOMContentLoaded, Resource Timing `initiatorType=script` e evento `load=true`. Nenhuma violação `script-src*` foi correlacionada. A URL/iniciador exato e a cadeia de confiança continuam desconhecidos; a hipótese anterior do loader que acrescenta ao body não identifica este elemento no head. Não há classificação automática de autorização por caminho ou origem.
- **Script 26:** o artefato confirma texto de comprimento zero, sem `src`, no body, atributos `data-nextjs-dev-overlay` e `style`. O Next.js 16.4.3 instalado, em `next/dist/compiled/next-devtools/index.js`, cria um script com esse marcador e coloca `nextjs-portal` como filho. Essa combinação aponta ao contêiner do overlay de desenvolvimento, em vez do helper de metadados sugerido anteriormente (`nextIconRelocationPatternCount=0`). A instrumentação acrescenta verificação do valor do marcador e do filho portal para confirmar a correspondência na próxima execução; esses dois detalhes não estão no artefato atual. Segundo o [algoritmo HTML de preparação de scripts](https://html.spec.whatwg.org/multipage/scripting.html#prepare-the-script-element), um elemento sem `src` e com texto vazio retorna sem executar código. A contagem de inline sem autorização passa a excluir apenas elementos com texto **exatamente vazio**; eles continuam inventariados. Nenhum nome Next ou heurística dispensa um inline que contenha código. Qualquer nonce presente divergente continua reprovando, inclusive em elementos vazios. Essa observação não prova que o elemento nunca teve outro conteúdo antes do snapshot.

CSP continua exclusivamente Report-Only; 33 eventos de estilos permanecem documentados. A identidade do script externo, a causa de seu colega sem conclusão observada e eventual reprodução em build de produção seguem pendentes. Nenhum código de produção, autenticação, RBAC, F001, F003 ou banco foi alterado.

### Validação desta alteração

`npm run typecheck`, `npm run lint` e `npm test` passaram (96 testes em 17 arquivos); o verificador da base compartilhada passou sem erros. O checkout mantém a spec e a documentação como arquivos não rastreados, portanto o whitespace/newline também foi verificado diretamente, além de `git diff --check`. Chromium, Distrobox e Podman não foram encontrados; nenhum banco foi acessado. Um agente auxiliar realizou revisão somente de leitura do algoritmo e do artefato; não executou testes ou fez alterações. Primeiro executar somente a spec focal no Bazzite com `TEST_DATABASE_URL` validada pelo harness e `DATABASE_URL` removida. Examinar especialmente `loginStability.completionUnobservedScripts` e `stabilityExitReason`. Somente após aprovação executar regressão completa, integrações F001/F002/F003/RBAC e M-01/I-01. F004 permanece pendente; enforcement, estilos inline e HTTPS não estão validados.

Com `TEST_DATABASE_URL` autorizada já carregada, executar no diretório do projeto:

```bash
distrobox enter laboratorio-node -- env -u DATABASE_URL npm run test:e2e -- tests/e2e/sec-01b-security-headers.spec.ts --workers=1
```

O config existente valida protocolo, host, porta, banco, usuário e senha, remove fallback e inicia o servidor local com `CRM_TEST_MODE=1`. Nenhum resultado dinâmico da alteração atual está declarado.

## Acompanhamento SEC-01C.3.6 — estabilização e violações de estilos

### Estabilização e prontidão

O artefato mais recente (`security-header-audit.json`, timestamp 2026-11-02 23:22:58 -0300) registra `documentReadyState=complete`, 60/60 frames, 981 ms, zero mutações relevantes e `frame-limit-completion-unobserved`. Havia um único elemento sem evento: índice 20, com `src`, `nonce` e `nomodule`, sem entrada Resource Timing. Isso é comportamento esperado em navegadores com suporte a módulos: o HTML Standard diz que scripts `nomodule` são ignorados nesses navegadores; a propriedade `HTMLScriptElement.noModule` reflete o atributo. Não há necessidade de esperar evento de recurso que o navegador não solicita. A rotina agora detecta suporte por `"noModule" in HTMLScriptElement.prototype`, mantém o elemento no inventário e o exclui somente da contagem de recursos aplicáveis ao evento `load`/`error` nesse browser. Não há exceção ampla para outros scripts sem evento.

A prontidão falhou por locators, não por `document.readyState`: o snapshot marcou heading e botão visíveis, mas os dois campos não encontrados pelos seletores `getByLabel("E-mail", exact)` e `getByLabel("Senha", exact)`. O markup usa `<label htmlFor>` e `<input id>` próprios. O teste passou a localizar os inputs por role textbox e nome visível parcial (`/E-mail/`, `/Senha/`), e exige singularidade, visibilidade e habilitação. A próxima execução confirmará se esses nomes correspondem à árvore de acessibilidade real. A prontidão segue como asserção obrigatória, sem ser inferida do estado do documento.

O contador de 60 frames não será aumentado. A observação encerra após duas frames sem mutação relevante e sem scripts aplicáveis sem conclusão observada, ou reprova com motivo explícito no limite atual. O prazo independente de 5 s só evita espera sem RAF e resulta em evidência incompleta, nunca em aprovação.

### Script inline e script 21

O elemento 26 continua vazio no snapshot (`textLength=0`), com `data-nextjs-dev-overlay`, no body, depois de DOMContentLoaded. O Next.js 16.4.3 instalado cria esse elemento como contêiner do portal de desenvolvimento. A nova regra isenta somente inline sem `src` e com comprimento de texto exatamente zero do requisito de nonce para código executável; o inventário e confirmação do marcador/portal permanecem. Um `script` vazio não executa código segundo o algoritmo HTML. Scripts com conteúdo não recebem essa exceção.

O elemento 21 recebeu `load`; segue sem nonce e sem violação `script-src*` observada. `strict-dynamic` é compatível com scripts externos carregados por um script confiável, mas a cadeia exata ainda não está registrada. Caminho Next, Resource Timing `initiatorType=script` e evento `load` não provam sozinhos quem autorizou a inserção. CSP permanece Report-Only.

### Violações `style-src-elem`

As 33 violações agrupadas têm `disposition=report`, bloqueado como recurso inline e origem em código de caminho Next. A aplicação não contém estilos `<style>` dinâmicos explícitos. O pacote Next instalado inclui o overlay de desenvolvimento e seu runtime de estilos baseado em `style-loader`, cujo helper define nonce apenas quando o nonce webpack está configurado. Isso torna o overlay/runtime de desenvolvimento uma causa provável das violações, não uma causa individual confirmada. O artefato anterior não continha inventário de elementos `<style>` nem sua correspondência de nonce.

A spec agora coleta por documento os elementos `<style>` presentes: nonce como estado relativo à resposta, tamanho do texto sem conteúdo, nomes de atributos, ancestral e observação após DOMContentLoaded. Isso permite comparar a próxima execução com as violações agrupadas sem expor estilos ou nonces. Os eventos CSP continuam completos e as contagens não são filtradas. Não se adicionou `unsafe-inline` nem se alterou a política. A confirmação das origens específicas e a validação de uma build de produção isolada permanecem pendentes; nada nesta evidência justifica acomodar ferramentas dev na política de produção.

### Validação

`npm run typecheck`, `npm run lint` e `npm test` foram executados depois das alterações; Vitest reportou 96 testes em 17 arquivos. `git diff --check` e verificação direta de whitespace/newline foram executados. A spec focal e a validação Chromium no Bazzite não foram executadas neste ambiente; logo, os novos locators, o tratamento `nomodule` e a classificação de estilos aguardam confirmação dinâmica. F004 continua pendente e enforcement/HTTPS não foram validados.

Referências: [HTML Standard — scripts `nomodule`](https://html.spec.whatwg.org/multipage/scripting.html) e [Next.js CSP](https://nextjs.org/docs/app/guides/content-security-policy).

## Acompanhamento SEC-01C.3.7 — resultado consolidado e origem das violações

### Correspondência e resultado da execução Bazzite

O artefato disponível em `test-results/sec-01b-security-headers-S-c2052-endo-evidências-sanitizadas-chromium/security-header-audit.json` tem timestamp 2026-11-02 23:22:58 -0300. Seus campos confirmam `auditStatus=complete`, `auditOutcome=complete`, `failurePhase=null`, prontidão funcional verdadeira, três frames observados, estabilidade em duas frames, zero recursos externos sem conclusão, suporte a módulos no browser e um `nomodule` não aplicável. Os 33 eventos Report-Only são `style-src-elem`. Essa evidência corresponde aos valores resumidos para a última execução fornecida, embora o artefato não carregue um identificador externo da execução.

Os resultados informados para essa execução foram: spec focal 1/1; regressão E2E 47/47; integrações de segurança 12/12; axe 32 varreduras sem violações; M-01 e I-01 sem inconsistências. São resultados Bazzite reportados e corroborados pelo JSON focal; esta auditoria local não repetiu Playwright ou preflights.

### Classificação das violações de estilo

O resumo sanitizado agora contém inventário de 18 elementos `<style>` no login. Todos estavam sem nonce e nenhum tinha nonce divergente. Quinze tinham atributo `data-nextjs-dev-tool-style`, 15 estavam desconectados do DOM principal no snapshot, um estava no `head` e um sob um `div`; os três sem o marcador do devtool não podem ser atribuídos a uma origem pela captura disponível. A lista de origem CSP tinha `sourceCategory=same-origin-next-path`, 33 eventos e `disposition=report`. O listener não guardou o caminho real do bundle nem identidade do nó atingido pelo evento; CSP violation events não fornecem uma referência de `<style>` que permita correlacioná-los com segurança aos 18 nós do snapshot. A contagem de eventos pode incluir tentativas repetidas de inserção/atualização e não equivale ao número de elementos.

A presença de 15 elementos com marcador explícito de ferramentas de desenvolvimento, junto da origem Next e da versão local que inclui o overlay e seu runtime de estilos, é forte evidência de que uma parte substancial vem do dev overlay/runtime. O código instalado do `next-devtools` inclui estilos sinalizados com esse marcador; o runtime usa injeção de estilos. Ainda não é possível afirmar que as 33 violações sejam exclusivamente do overlay: a instrumentação não preservou caminho de origem com granularidade suficiente, os eventos não foram associados a nós e há três estilos sem o marcador. A resposta Report-Only permite que os estilos sejam aplicados enquanto o browser reporta que a política candidata os rejeitaria.

Assim, a causa está **parcialmente identificada** como injeção de estilos do Next.js em desenvolvimento; a atribuição evento a evento e a exclusão de qualquer estilo da aplicação ou de biblioteca permanecem não comprovadas. Não alteramos CSP nem ignoramos eventos. A próxima validação de produção deverá coletar as mesmas categorias e comparar estilos/nonces sem expor texto CSS. O desaparecimento do overlay não será suficiente por si só para declarar a política compatível.

### Estado de segurança e validação em produção

Headers básicos (`nosniff`, Referrer-Policy, X-Frame-Options e Permissions-Policy, remoção de X-Powered-By) foram observados nas respostas HTTP locais cobertas pela execução de headers. HTML recebeu CSP Report-Only; não foi observado header de enforcement. `/login` e documentos privados tiveram nonce por documento; a auditoria de `/login` registrou 27 scripts, 25 com nonce correspondente, zero nonce não vazio divergente, um externo sem nonce aceito sem relatório `script-src*`, um inline vazio do overlay e um `nomodule` ignorado pelo browser. A avaliação de outros documentos consta no artefato completo.

HSTS não foi enviado no HTTP local e não foi validado sob HTTPS. Cookies locais foram exercitados pela spec, mas atributos de cookies em produção e configuração de terminação TLS continuam não avaliados. Nenhuma evidência cobre proxy, domínio, CDN ou implantação publicada.

`.env.local` existe neste checkout; seu conteúdo não foi lido. Um build no workspace atual não é seguro. A configuração do Next carrega arquivos `.env*`, e o handler Better Auth constrói a instância no escopo do módulo, chamando `getDb()`/`getPool()` ao importar a rota. Um build pode avaliar esse módulo; sem ambiente adequado falharia na guarda de conexão, e com configuração herdada poderia tocar um destino de banco. Distrobox, Podman e Chromium não estão disponíveis neste executor. Por isso, não foi executado `next build` nem iniciado servidor de produção local.

Um procedimento seguro futuro deverá copiar apenas fontes, manifests e lockfile para diretório temporário; excluir todos os arquivos `.env*`, `.next`, artefatos e qualquer estado local; executar build com ambiente limpo, sem `DATABASE_URL`, sem segredos reais, com segredo Better Auth sintético e guardas de banco em modo de teste; e confirmar que módulos de rotas não tentem conectar. Se o build exigir banco, parar até que a conexão autorizada `TEST_DATABASE_URL` validada esteja disponível; nunca usar fallback. Depois, executar somente contra a instância local isolada e fixtures sintéticas, coletando headers, nonce, prontidão, scripts, styles, violações CSP e erros do browser. Build/runtime de produção local permanecem pendentes.

### Status e critérios futuros

- **Headers básicos locais:** observados nas respostas cobertas; infraestrutura publicada não avaliada.
- **CSP Report-Only:** validada localmente como presente, com 33 violações de estilo que exigem análise adicional.
- **CSP enforcement:** não habilitado e não pronto para habilitar enquanto houver violações sem classificação completa.
- **HTTPS/HSTS/cookies Secure em produção:** pendentes de infraestrutura HTTPS autorizada.

Antes de considerar enforcement, exigir CSP Report-Only sem violações inexplicadas nos fluxos de produção representativos, estilos aplicáveis com nonce/autorização adequada, headers de documentos/APIs/downloads revisados, login e rotas privadas funcionais, regressão completa, axe sem violações e domínio/TLS/HSTS definidos. Os 33 eventos de desenvolvimento devem ser comparados com execução local de produção; os três styles sem marcador e qualquer evento sem fonte correlacionável precisam de explicação baseada em evidência.

**Validação SEC-01C.3.7:** os resultados Bazzite acima são os fornecidos e corroborados pelo artefato, não uma nova execução local. Nesta execução, `npm run typecheck`, `npm run lint` e `npm test` serão registrados depois da validação estática; o build seguro, E2E, integrações, M-01/I-01 e ambiente HTTPS não foram executados aqui. Nenhum arquivo de produção foi alterado.
