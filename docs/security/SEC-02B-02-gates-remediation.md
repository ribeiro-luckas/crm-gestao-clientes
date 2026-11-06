# SEC-02B.2 — Triagem e remediação dos gates reprovados

**Data:** 03/11/2026  
**Escopo:** G-11 (logging) e G-15 (CSP e regressão), conforme identificadores da [SEC-02A](SEC-02A-target-architecture.md).  
**Decisão:** os dois gates continuam parcialmente validados. Esta execução não autoriza publicação.

## 1. Resumo executivo

A violação CSP de produção foi causada por uma verificação de capacidade do Zod 4.6.7 que chama `Function("")`, não por lógica da aplicação nem pelo runtime de desenvolvimento do Next.js. A configuração global suportada `z.config({ jitless: true })` remove essa avaliação dinâmica. A aplicação autenticada também tinha dois atributos `style` dinâmicos no dashboard, incompatíveis com a política estrita. Eles foram substituídos por larguras de retângulos SVG. Build e rotas relevantes passaram em Chromium com CSP **enforced** na cópia temporária. O código de configuração entregue continua em Report-Only, portanto a política ainda não está aplicada como bloqueio no projeto.

O sink de logging foi identificado em Better Call 1.4.4: a biblioteca escreve `# SERVER_ERROR` diretamente em `console.error` depois do callback de erro, fora do `safeLogger`. A rota Better Auth agora converte exceções em resposta genérica e evento estruturado sanitizado. No cenário de falha reproduzido antes da correção, o stderr da aplicação continha o canário de email dentro de parâmetros SQL; não continha o canário de senha. Após a correção, nenhum canário, SQL, detalhe PostgreSQL ou stack trace apareceu nos streams da aplicação ou na resposta HTTP. O PostgreSQL descartável ainda registra a estrutura da instrução e identificadores de tabela em seu próprio log, sem os valores de parâmetros ou os canários. ACL, destino e retenção desse sink operacional continuam desconhecidos.

Os testes focados passaram, mas a execução integral E2E não passou: sob a topologia HTTPS correta e rate limit ativo, o melhor resultado foi 30/46. Treze casos receberam HTTP 429, dois falharam em cascata após login limitado e um teste de teclado foi bloqueado porque a instrumentação do Playwright injeta estilo inline sob CSP enforced. Não se desabilitou o rate limit. G-11 e G-15 permanecem parciais; a publicação continua não autorizada.

## 2. Ambiente utilizado

- Bazzite 44 x86_64; Podman rootless; Distrobox `laboratorio-node`; Node.js 24.22.2.
- Cópia de trabalho em `/tmp/sec-02b2-20261103`, sem `.env*`, `.git`, configurações locais sensíveis ou dados reais; processos iniciados com ambiente controlado e marcadores sintéticos distintos.
- Build de produção sem rede. A primeira tentativa abortou durante coleta de dados por limite de threads do container; repetição com limite de processos/CPU maior concluiu. Isso foi limitação do ambiente de teste, não falha do CRM.
- PostgreSQL 18.6 novo, banco `sec02b2_homolog`, rede interna Podman, armazenamento temporário sem volume preexistente; aplicação e proxy HTTPS locais sem exposição pública. Os papéis de migration e aplicação eram separados. Todas as falhas foram induzidas apenas nesse banco descartável.
- Versões instaladas: Next.js 16.4.3, React 19.3.1, Better Auth 1.7.14, Better Call 1.4.4 e Zod 4.6.7.
- Nenhuma produção, credencial real ou banco preexistente foi acessado. O projeto original não carregou `.env.local`.

## 3. CSP: reprodução, causa e remediação

### Reprodução e atribuição

O evento original ocorreu no build e servidor de **produção**, em `/login`, sem autenticação, com CSP Report-Only. Chromium reportou a diretiva `script-src`, recurso `eval`, na origem same-origin de um chunk de cliente `/_next/static/chunks/...js`. A posição instrumentada no artefato apontou para `Function("")` em `zod/v4/core`, dentro do probe `allowsEval` que verifica se compilação dinâmica está disponível. O evento não foi atribuído ao Next.js nem a código autoral da aplicação.

Na comparação com `next dev`, a política de desenvolvimento inclui `unsafe-eval`; por isso o mesmo probe não gera a violação `script-src` observada em produção. A execução de desenvolvimento também gerou eventos distintos de estilo inline e não representa o comportamento de produção. O proxy temporário encaminhou CSP sem duplicar ou substituir o header.

### Correções e validação

1. Foi adicionado `ZodCspProvider` no layout raiz, configurando a opção oficial `z.config({ jitless: true })` antes dos formulários/clientes Zod. O [guia de compilação do Zod](https://zod.dev/compile) documenta o modo sem avaliação dinâmica.
2. Sob a política estrita da cópia temporária, o dashboard autenticado revelou duas violações `style-src-attr` causadas por larguras em `style={{...}}`. Os indicadores foram convertidos em retângulos SVG com larguras calculadas e cores acessíveis, preservando valores e apresentação.
3. O build final de produção foi servido com CSP em modo de bloqueio **somente na cópia descartável**. `/login` retornou 200, validação de formulário continuou funcional, e `/dashboard` autenticado retornou 200. Nos dois contextos: zero eventos CSP, zero erros no console, sem `unsafe-eval` e sem violações de estilo observadas.
4. Fluxos focados no mesmo candidato confirmaram login, sessão autenticada e logout/invalidação.

**Limite:** `src/proxy.ts` no projeto permanece Report-Only. O enforcement foi uma condição de teste temporária e não foi copiado para o projeto. O gate de aplicação permanece parcial até que a política pretendida seja aprovada e exercitada em ambiente representativo, incluindo uma decisão sobre ativação do header.

## 4. Logging: sink, conteúdo e impacto

### Reprodução e origem

Foi induzida uma falha `permission denied` retirando temporariamente `SELECT` do papel de runtime somente sobre a tabela `public.user` do banco descartável. Um POST sintético de login sem autenticação produziu HTTP 500. A inspeção da versão instalada identificou o caminho: Better Auth lança quando `onAPIError.throw` está habilitado; Better Call captura o erro e, após o callback `onError` retornar, executa incondicionalmente `console.error("# SERVER_ERROR: ", error)` para erro não classificado como `APIError`. Assim, esse sink contornava o adaptador `safeLogger`; não era uma reformatação originada pelo Next.js.

Antes da correção, o stderr do processo mostrou erro Drizzle, estrutura SQL, nomes de tabela/colunas, `params` com o canário sintético de **email**, erro PostgreSQL e stack trace. O canário de senha não apareceu. Nenhum dado real foi usado. Isso acrescenta evidência ao alcance do sink descrito historicamente na SEC-01C-F005 e na SEC-02B.1; os relatórios históricos foram preservados e não foram reescritos.

### Correção mínima e validação

- `src/lib/auth.ts` usa o mecanismo documentado `onAPIError: { throw: true }`, em vez de um callback observacional que permite à biblioteca seguir para o log bruto. A opção `throw` é documentada nas [opções do Better Auth](https://better-auth.com/docs/reference/options).
- `src/app/api/auth/[...all]/route.ts` envolve GET/POST, registra erro sanitizado pelo `safeLogger` com categoria, operação e código controlado, e retorna 500 genérico sem mensagem interna. Respostas 5xx também recebem evento estruturado genérico.
- As rotas de saída/remoção de membros preservam a tradução já existente de erros invariantes F001/F003; erros não classificados são propagados. Isso evita que habilitar o lançamento pelo Better Auth altere esses contratos.
- Na falha repetida após correção: HTTP 500 com corpo vazio; stdout sem SQL, parâmetros, canários ou `SERVER_ERROR`; stderr da aplicação contendo somente campos controlados (`authentication-error`, `auth.api`, `INTERNAL_SERVER_ERROR`, tipo/nome de erro). O Better Auth emitiu ainda um evento `warn` sem detalhe bruto. Proxy stderr vazio; stdout apenas indicou inicialização.
- O privilégio `SELECT` foi restaurado e verificado no banco temporário.
- O sink PostgreSQL permanece independente: seu log registrou erro de permissão e a forma da instrução com placeholder `$1` e identificador da tabela. Canários de email e senha, valores de parâmetros e stack da aplicação não apareceram no log PG capturado. Não se conclui que coletores ou retenção externos filtrem isso: não foram configurados nem testados.

### Impacto e classificação

O sink Better Call podia ser acionado por uma requisição não autenticada a login quando uma falha de banco ocorria e, na reprodução, registrou dado sintético derivado da requisição no log do servidor. A resposta HTTP não refletiu o conteúdo. A correção removeu o caminho bruto observado e preservou sinal operacional sanitizado. Não há evidência de exposição de senha, token, cookie ou valor real.

O log PostgreSQL contém divulgação de estrutura interna (SQL/identificadores), sem valores de parâmetros no teste. Classificação: **risco residual operacional P2, limitado à divulgação de detalhes internos**; não é evidência de credencial vazada. Frequência em operação normal, configuração final de log, ACL, destino, coleta e retenção não foram demonstrados. Vincula-se como observação nova `SEC-02B.2-LOG-01`, relacionada ao histórico F005, sem reabrir retroativamente seu status de código/integração.

## 5. Regressão

Resultados de execuções separadas — os números não devem ser somados como se fossem uma única execução:

| Execução | Resultado | Observações |
|---|---|---|
| Typecheck + ESLint no candidato | Aprovados | Sem erros. |
| Unitários no candidato | 107/107 aprovados, 17 arquivos | Inclui testes de classificação dos erros F001/F003 e caminho sanitizado. |
| Integrações direcionadas | 53/53 aprovadas em três suítes | Proteção de saída/remoção de membro e integridade de atribuição no PostgreSQL descartável. Duas tentativas anteriores falharam em guard temporário de identidade do banco, ajustado apenas na cópia de teste; a execução final passou. |
| Chromium, CSP/auth/session/dashboard | 3/3 aprovados | Build de produção, CSP enforced apenas no ambiente temporário. Login, sessão, logout e dashboard autenticado. |
| Chromium, logging canário | 1/1 aprovado | HTTP genérico e ausência dos canários/SQL nos streams da aplicação. |
| E2E integral, topologia errada | 5/46 aprovados | Base HTTP do harness divergia da origem HTTPS real; muitas respostas 403. Não classificado como defeito do CRM. |
| E2E integral, origem HTTPS corrigida | 18/46 aprovados | 28 reprovados; 26 respostas 429 do rate limit real e falhas subsequentes. |
| E2E integral, espaçamento aumentado no harness | 30/46 aprovados | Ainda 13 respostas 429; duas falhas `toContainText` ocorreram após login limitado; um teste de teclado não pôde injetar CSS inline (`page.addStyleTag`) sob CSP enforced. Assertions não foram relaxadas e rate limit não foi desabilitado. |

Na SEC-02B.1 histórica, 18/21 testes passaram; duas falhas de seletor foram aprovadas em rerun focalizado após correção de ambiguidade no harness. A terceira era a violação CSP agora atribuída. A execução E2E de F005 registrada na SEC-01C teve 46 aprovados e um timeout visual; o caso passou isoladamente com timeout adequado. Esses resultados são históricos e não são agregados às execuções desta etapa. O timeout anterior não foi reproduzido nesta validação focada.

Uma tentativa de scanner de build que identificasse marcadores específicos foi executada no build final: nenhum marcador de build/runtime foi encontrado em `.next/static` ou `.next/server`. Isso não substitui uma revisão de configuração de produção real.

## 6. Gates SEC-02A

Somente gates com nova evidência nesta execução são atualizados:

| Gate | Resultado SEC-02B.2 | Evidência e limite |
|---|---|---|
| G-11 — Logging redigido com ACL/retention verificáveis | **Parcialmente validado** | Sink de erro da aplicação corrigido e canários ausentes dos streams capturados. O PostgreSQL ainda registra estrutura SQL. Collector, ACL e retenção não foram definidos/testados. |
| G-15 — Testes de release e limites CSP/tenant documentados | **Parcialmente validado** | Causa CSP classificada e build/rotas focadas sem violações sob enforcement temporário. Código de origem continua Report-Only; E2E integral não passou por 429 e instrumento de estilo bloqueado; não se valida infraestrutura final. |

Os demais 13 gates mantêm os status da SEC-02A; esta etapa não produziu nova evidência suficiente para alterá-los. Em especial, controles dependentes de provedor, domínio, TLS real, banco gerenciado, backups, collector e retenção seguem pendentes de infraestrutura/decisões reais.

## 7. Arquivos modificados

Arquivos de aplicação e testes alterados nesta remediação:

- `src/lib/auth.ts`
- `src/app/api/auth/[...all]/route.ts`
- `src/lib/auth-http-error-context.ts`
- `src/app/layout.tsx`
- `src/components/zod-csp-provider.tsx` (novo)
- `src/app/(app)/dashboard/page.tsx`
- `src/app/globals.css`
- `tests/unit/lib/organization-owner-invariant-error.test.ts` (novo)
- `tests/unit/lib/member-assignment-integrity-error.test.ts` (novo)

Documentação: este relatório e a nota `docs/knowledge/testing.md`, com o aprendizado sobre inspeção dos sinks nativos e CSP em produção. `src/proxy.ts` não foi alterado; a versão temporariamente enforced existiu somente na cópia de homologação. Alterações de origem nos arquivos acima foram executadas após a reprodução e validadas no projeto original por typecheck, ESLint e testes unitários.

## 8. Limpeza, riscos residuais e próximas ações

Esta execução usou apenas containers, rede, arquivos e banco temporários próprios. A limpeza foi concluída: `sec02b2-app` e `sec02b2-dev` foram removidos; `sec02b2-pg` foi iniciado com remoção automática e desapareceu ao ser parado; a rede `sec02b2-homolog-20261103` e as cópias/artefatos `/tmp/sec-02b2-20261103`, `/tmp/sec-02b2-dev-20261103` e `/tmp/sec-02b2-20261103-proxy.cjs` foram removidos. A listagem final confirmou apenas os containers preexistentes `laboratorio-node`, `crm-postgres` (parado, como antes) e `crm-postgres-test` (ativo), e a rede padrão `podman`. A verificação final de listeners não encontrou processos nas portas locais `15434`, `18444` e `18081` usadas nesta homologação. Nenhum volume ou imagem foi removido.

Riscos/pendências:

1. Decidir a política CSP e promover Report-Only para bloqueio somente após revisão do responsável, seguida de E2E estável em HTTPS representativo.
2. Definir destino, ACL e retenção para logs PostgreSQL e observar se política de logging do destino exige reduzir estrutura de statement; não foi validado collector externo.
3. Tornar a suíte E2E integral reprodutível sem desabilitar proteção: espaçar ou organizar fluxos para respeitar o rate limiter vigente e ajustar o teste de teclado para não depender de injeção de estilo bloqueada. Não mascarar 429 nem enfraquecer CSP.
4. Repetir validações dependentes de infraestrutura quando provedor, domínio e responsabilidades operacionais forem escolhidos. Esta homologação local não aprova produção.

**Conclusão:** as causas dos dois achados foram demonstradas e as correções mínimas do código foram aplicadas. Os cenários focados passaram. G-11 e G-15 permanecem parciais pelas limitações de logging PostgreSQL/controles operacionais, CSP do código ainda em Report-Only e suíte integral E2E sem aprovação. A F005 não foi reaberta; o achado de conteúdo bruto do sink de aplicação está corrigido nesta execução e o residual PostgreSQL está vinculado como observação nova e delimitada. Publicação permanece não autorizada.
