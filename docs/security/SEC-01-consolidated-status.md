# SEC-01 — Estado consolidado da auditoria de segurança

**Data de consolidação:** 2026-11-03  
**Escopo:** evidências existentes em SEC-01A/B/C e na validação integrada F005 de 2026-11-03. Esta consolidação não executou código, testes, migrations ou consultas a ambientes.  
**Referencial da auditoria:** OWASP ASVS 5.0.0, nível 1 com controles selecionados de nível 2 para SaaS multi-tenant. Isto não é certificação.

## 1. Resumo executivo

O CRM **não tem evidência suficiente para ser declarado pronto para produção pública**. Não há vulnerabilidade P0 ou P1 comprovada nos relatórios. As pendências de publicação decorrem sobretudo de configuração e infraestrutura ainda não observadas: HTTPS/terminação TLS, HSTS, cookie `Secure`, topologia de réplicas, privilégio do usuário PostgreSQL, destino e controles dos logs e uma auditoria atual das dependências.

O código corrigiu os caminhos centrais de F001 e F005. A execução integrada de 2026-11-03 confirmou rollback e persistência de `audit_logs` em cenários F001 e validou Better Auth, PostgreSQL e Next.js para F005. A F005 está encerrada **no escopo da aplicação e da integração**; collectors, acesso, retenção e logs do PostgreSQL permanecem fora dessa conclusão. A evidência nova também sustenta as correções de F003 e o rate limiter local de F002, mas as respectivas remediações não têm atualização formal de status que substitua seus relatórios antigos.

F004 tem headers implementados e passou por validações locais de navegador reportadas, mas a CSP permanece somente em `Report-Only`. Um artefato de desenvolvimento registra 33 eventos `style-src-elem`; 15 estilos foram associados a ferramentas Next de desenvolvimento e três não foram atribuídos. Não há validação de build/HTTP em perfil de produção nem evidência de TLS/HSTS/cookies em um endpoint HTTPS publicado. **Não ativar CSP enforcement por inferência.**

### Estado resumido

| ID | Severidade registrada | Estado baseado nas evidências disponíveis | Pendência material |
|---|---|---|---|
| F001 | P2 | Correção transacional implementada; testes integrados positivo e de rollback passaram em 2026-11-03. | Reconciliar o status ainda “pendente” no relatório individual e avaliar concorrência/critério de preflight antes de encerrar formalmente. |
| F002 | P2 condicional a múltiplas instâncias | O teste de quatro requests do handler real está incluído na suíte integrada que passou; valida o rate limit de um processo Better Auth. | Confirmar topologia e confiança no proxy/IP. Se houver múltiplas réplicas, demonstrar limite compartilhado ou implantar storage compatível. |
| F003 | P3 | Implementação fail-closed existe; a execução integrada/E2E recente traz evidência de multi-tenant, sessão e seleção de workspace, sem bypass reportado. | O relatório F003 ainda declara validação pendente e não foi formalmente reconciliado com a execução de 2026-11-03. |
| F004 | P3 | Headers básicos/CSP Report-Only implementados; validação de navegador local reportada. | 33 violações CSP de estilo, três estilos sem atribuição, nenhum teste de HTTPS/produção; HSTS e `Secure` efetivo não observados. |
| F005 | P3 | **Encerrada no código e integração do CRM** em 2026-11-03. Canários ausentes nos streams de aplicação capturados. | Sinks e coletores externos, ACL, retenção e redaction não foram validados. Não reabrir sem evidência nova. |

## 2. Escopo e leitura das fontes

Os achados originais estão em [SEC-01A-findings.md](SEC-01A-findings.md). SEC-01B registra evidências históricas, resultados informados e limites de execução; SEC-01C não possui um relatório único, mas remediações individuais para F001, F003, F004 e F005. Não foi encontrado relatório individual de remediação F002.

Esta consolidação separa a severidade original de cada achado da prioridade operacional recomendada abaixo. Ausência de evidência de produção não é tratada como prova de configuração insegura; também não é tratada como prova de segurança.

## 3. Inventário de vulnerabilidades

### F001 — Alteração de papel sem auditoria atômica

- **Severidade original:** P2; impacto de integridade e rastreabilidade condicionado à falha do insert de auditoria.
- **Causa confirmada:** a versão anterior atualizava o papel via Better Auth e, em uma escrita posterior, inseria o evento em `audit_logs`. A falha da segunda operação podia deixar um papel novo sem trilha correspondente.
- **Correção:** `member-role-service.ts` executa validação, atualização condicionada e insert de auditoria na mesma transação Drizzle/PostgreSQL. Server Action e endpoint HTTP Better Auth usam o serviço comum; a transação não é atribuída ao adapter Better Auth por suposição.
- **Evidência atual:** o relatório F005 de 2026-11-03 registra os testes de integração positivo e de falha injetada aprovados. No sucesso, o papel e o evento correto persistiram; na falha, o papel foi revertido, nenhum evento falso ficou registrado e a outra organização permaneceu inalterada. Typecheck, lint e 195 testes de integração passaram na execução consolidada.
- **Limites:** o relatório individual [SEC-01C-F001-remediation.md](SEC-01C-F001-remediation.md) ainda declara validação dinâmica pendente. Não há resultado dinâmico de concorrência nessa remediação; M-01/I-01 ficaram gated na execução de F005. A correção central está validada, mas o status documental de encerramento precisa ser reconciliado com a nova evidência e seus critérios.
- **Status consolidado:** causa original confirmada; correção implementada e caminhos positivo/rollback integrados aprovados. Não há evidência atual de que a falha original continue no caminho testado. Formalizar o encerramento após registrar a evidência detalhada e decidir se concorrência/preflights são critérios obrigatórios para esse achado.

### F002 — Rate limit em memória por processo

- **Severidade original:** P2 se houver múltiplas instâncias; P3 de endurecimento se o runtime for single-process estável.
- **Causa confirmada:** Better Auth 1.7.14 habilita rate limit em produção por padrão, mas usa storage em memória quando não há storage secundário. Reinício perde contadores e instâncias diferentes não compartilham o limite.
- **Correção implementada:** não há correção de produção registrada. O ajuste SEC-01B corrigiu somente o harness: ativa `CRM_TEST_MODE=1` depois de validar o banco isolado e antes de importar a rota Better Auth real.
- **Evidência atual:** `tests/integration/sec-01b-rate-limit.test.ts` envia quatro requests sintéticos ao handler real e espera `401, 401, 401, 429`. A suíte integrada de 2026-11-03 teve 195 aprovados e 35 skipped em duas suítes gated M-01/I-01; o teste F002 não pertence a esses gates. Isso comprova o comportamento local de um processo, embora o relatório dessa execução não preserve a saída individual dos quatro status.
- **Limites:** topologia de deployment, reinícios, proxy confiável e origem de IP não foram avaliados. Não se demonstrou ataque ou bypass em produção; não se demonstrou limite global entre réplicas.
- **Status consolidado:** rate limit local de um processo validado pela suíte; risco P2 permanece **condicional à topologia**. Não escolher Redis ou outra dependência sem conhecer o runtime e o mecanismo de confiança no proxy.

### F003 — Fallback silencioso de workspace ativo inválido

- **Severidade original:** P3. Os relatórios não demonstraram acesso a uma organização sem membership; demonstraram risco de executar uma operação na organização errada dentre as memberships legítimas do usuário.
- **Causa confirmada:** quando `activeOrganizationId` não correspondia a uma membership atual, a implementação anterior escolhia `memberships[0]` sem seleção explícita.
- **Correção:** seleção explícita para múltiplas memberships; contexto ativo presente e inválido falha fechado, não escolhe outra organização; páginas orientam nova seleção, APIs recusam e a escolha valida membership no servidor via Better Auth.
- **Evidência disponível:** o relatório de remediação lista cobertura unitária, integração `sec-01b-audit-workspace.test.ts` e E2E `multitenant-security.spec.ts`. Na execução de 2026-11-03, a suíte de integração passou e a execução E2E completa teve uma única falha, no teste da matriz visual UX; a documentação F005 registra que os fluxos multi-tenant exercitaram sessão e isolamento de organização.
- **Limites:** [SEC-01C-F003-remediation.md](SEC-01C-F003-remediation.md) ainda classifica F003 como aguardando validação. O relatório de F005 não enumera status por cenário F003 nem inclui artefato sanitizado específico que permita reconciliar todos os critérios de seleção, sessão revogada e ausência de writes.
- **Status consolidado:** implementação presente e regressão agregada sem bypass reportado; não há evidência de acesso cross-tenant. Manter o status formal como **validação a reconciliar**, sem declarar encerramento somente pelo agregado de testes.

### F004 — Headers HTTP, CSP, HTTPS e cookies

- **Severidade original:** P3; SEC-01A caracterizou uma lacuna de defesa em profundidade e deixou explícito que ausência em `next.config.ts` não prova ausência em proxy/edge.
- **Correção:** `next.config.ts` declara `nosniff`, `strict-origin-when-cross-origin`, `X-Frame-Options: DENY` e uma `Permissions-Policy`; `X-Powered-By` permanece desabilitado. `src/proxy.ts` emite CSP nonce em `Content-Security-Policy-Report-Only`. Não foi adicionado `Cache-Control` global. `useSecureCookies` depende de `NODE_ENV=production` no Better Auth.
- **Evidência de navegador:** SEC-01C.3.7 registra artefato sanitizado de uma execução Bazzite com auditoria focal concluída, headers básicos e nonce examinados, 27 scripts no login e CSP Report-Only. Foram reportados 33 eventos de `style-src-elem`; 18 elementos `<style>` foram observados, 15 com marcador de ferramenta de desenvolvimento e três sem atribuição comprovada. A execução F005 posterior teve 46/47 E2E aprovados; sua única reprovação foi a matriz visual UX. O teste de headers não foi relatado como falha nessa execução, mas não há artefato F004 novo preservado no relatório F005.
- **Risco residual:** não há CSP enforcement. A origem de todos os eventos de estilo não está identificada; os eventos foram classificados como provavelmente ligados ao runtime de desenvolvimento, não exclusivamente provados. Build/runtime de produção não foi validado. HSTS não foi enviado no HTTP local (o que não prova falha em HTTPS), e `Secure=false` só foi observado em HTTP de teste. Domínio, terminação TLS, proxy, CDN e cookies em produção são desconhecidos.
- **Status consolidado:** implementação local e evidência limitada de browser existem; **F004 não está encerrada para produção**. Tratar HSTS, cookie `Secure` e headers na camada TLS como gates de publicação. Manter CSP em Report-Only até explicar as violações e avaliar uma build de produção segura; não enfraquecer a política para fazer o teste passar.

### F005 — Exceções encaminhadas a logs sem allowlist

- **Severidade original:** P3. A evidência original demonstrou um objeto `Error` chegando ao sink `console.error`, não que dados sensíveis tenham sido persistidos ou vistos por um collector.
- **Correção:** logger estruturado allowlist nos pontos controlados do CRM; adaptador Better Auth descarta mensagem e argumentos arbitrários; o script local de diagnóstico de migration emite mensagem estática em vez dos campos brutos da exceção.
- **Evidência atual:** 103 unitários aprovados; integração real com Next.js, Better Auth e PostgreSQL descartável; login inválido HTTP 401, login válido, sessão, logout e resposta pós-logout aprovados; signup público continuou desabilitado. Canários sintéticos não apareceram nos stdout/stderr de aplicação capturados. O evento Better Auth observado continha somente timestamp, nível, categoria, operação e código allowlistados.
- **Limite separado:** logs do PostgreSQL são outro sink: na execução descartável, erros negativos de teste registraram detalhes de fixtures sintéticas. Não houve canário de autenticação, mas o `safeLogger` da aplicação não sanitiza o PostgreSQL. Destino, ACL, retenção e redaction de collectors externos são desconhecidos.
- **Status consolidado:** **encerrada no código e na integração do CRM**, conforme a última seção de [SEC-01C-F005-remediation.md](SEC-01C-F005-remediation.md). Isso não valida os controles operacionais de logging nem autoriza reabrir F005 sem nova evidência.

## 4. Evidências consolidadas

### Execução mais recente — 2026-11-03

O relatório final de F005 registra execução no Bazzite 44, Distrobox `laboratorio-node` com Node 24.22.2, PostgreSQL 18 descartável em rede interna/tmpfs e credenciais sintéticas. O container e a cópia temporária foram removidos; a porta `5433` e containers preexistentes foram preservados. Nenhuma credencial real, produção ou banco principal foi acessado.

| Tipo | Evidência e interpretação |
|---|---|
| Unitária | `npm test`: 103 testes em 17 arquivos aprovados. Inclui canários para logger e Better Auth em memória. |
| Integração | `npm run test:integration`: 195 aprovados; 35 skipped em duas suítes gated. Inclui caminho transacional F001 e handler real de rate limit; os 35 skips são M-01/I-01. |
| E2E | Execução integral: 46 aprovados e um timeout de 30 s na matriz visual UX. Esse teste passou isoladamente em 39,6 s com `--timeout=180000`. Não houve um único run integral verde com timeout padrão. |
| F005 integrado | Spec temporária contra Next/Better Auth/PostgreSQL: signup web 400 por estar desabilitado; login inválido 401; login válido 200; consulta de sessão 200; logout 200; sessão pós-logout sem usuário/sessão. Canários ausentes. |
| F001/auditoria | Testes de sucesso e falha injetada confirmaram audit row no sucesso e rollback da mudança sem evento falso na falha; organização paralela permaneceu intacta. |
| Logs | Stdout/stderr Next/runner e log PostgreSQL foram capturados somente para os processos descartáveis. Nenhum marcador de credencial apareceu. PostgreSQL registrou erros esperados de testes negativos e detalhes sintéticos; collector externo não foi testado. |
| Infraestrutura | Podman rootless, rede `internal=true`, container sem volume e `tmpfs`; limpeza verificada. Isto valida apenas o ambiente de teste. |
| Dependências | Manifest/lock/instalação relevante concordaram e `npm ci --offline --ignore-scripts` funcionou na cópia. Isso verifica reprodutibilidade, não CVEs. `npm audit` não foi executado. |

Os 35 casos skipped não são falhas, mas também não são aprovação. São duas suítes gated M-01/I-01 e ficaram fora do objetivo F005. O relatório SEC-01C.3.7 registra uma execução Bazzite anterior reportada como 47/47 E2E, 12/12 integrações, 32 varreduras axe e preflights M-01/I-01 sem inconsistências. SEC-01B contém números anteriores de 44/44 E2E. São execuções distintas; não somar seus contadores nem tratá-los como resultado de 2026-11-03.

### Evidência documental e histórica

- **SEC-01A:** revisão estática e inventário de ameaças; registrou severidades e condições, sem execução dinâmica na auditoria inicial. Não encontrou P0/P1 confirmado, bypass RBAC, acesso cross-tenant, SQL injection, XSS ou vazamento CSV no escopo revisado. A própria análise declara que revisão estática não prova ausência.
- **SEC-01B:** contém resultados de Bazzite informados pelo usuário e um artefato local de headers. F001/F003 foram reproduzidos no código anterior; F002 inicialmente falhou antes de requests. Esses resultados são baseline histórico, não validação da implementação posterior.
- **SEC-01C:** remediações e testes foram feitos em datas diferentes. Os cabeçalhos locais, o CSP report-only e as mudanças em F001/F003/F005 devem ser avaliados pelo acompanhamento mais recente de cada arquivo, preservando as seções antigas como histórico.
- **Produção:** nenhum relatório contém observação de produção, configuração de edge, configuração efetiva de TLS, privilégios reais do banco, secret store ou collector. Não existe evidência de exploração real ou exposição de credenciais.

## 5. Riscos residuais por área

| Área | Estado observado | Risco residual e peso da evidência |
|---|---|---|
| Autenticação/sessões | Better Auth com DB real, sessão criada e revogada; páginas privadas redirecionam sem sessão; cookies locais HttpOnly/SameSite=Lax. | Cookies `Secure`, duração e expiração reais em HTTPS/produção não foram observados. Fluxos de reset/recuperação e e-mail não foram auditados de ponta a ponta. Evidência parcial; sem bypass confirmado. |
| Autorização/tenant | Server-side membership/role, queries scoped e FKs compostas; testes integrados e E2E multi-tenant existem e foram incluídos em execuções recentes. | Matriz adversarial completa por cada Server Action/ID, sessão expirada, remoção concorrente e chamadas diretas não está comprovada. M-01/I-01 foram skipped em 2026-11-03; histórico anterior reporta preflights sem inconsistência. |
| Auditoria transacional | F001 positivo/rollback validado em PostgreSQL descartável. | Concorrência e regras de retry/observabilidade não foram avaliadas na validação integrada. A auditoria de negócio não é substituída por logs técnicos. |
| Rate limit | Quatro requests do handler Better Auth são cobertos no teste e a suíte integrada passou. | Storage é por processo. Sem topologia e proxy confiável, não se sabe se o limite atende deployment distribuído; reinícios resetam o estado em memória. Risco condicional, não ataque demonstrado. |
| Headers/CSP | Headers básicos e Report-Only observados localmente; CSP sem enforcement. | 33 eventos de estilo, três elementos sem origem atribuída, e nenhuma build/HTTP de produção. HSTS e cookie Secure em HTTPS desconhecidos. Não concluir falha em edge nem prontidão de enforcement. |
| Logs/observabilidade | Eventos controlados pelo CRM são allowlistados; canários ausentes nos streams amostrados. | PostgreSQL pode registrar detalhes de erro; coletores, ACL, retenção, redaction, exportação e alertas não foram examinados. Risco operacional, não vazamento real comprovado. |
| Dependências | Lockfile e instalação foram conferidos; instalação offline limpa passou sem scripts. | Não há saída de `npm audit`, scanner ou SBOM atual. Nenhuma CVE está identificada nos relatórios; a ausência de scan não permite declarar a árvore limpa. |
| Configuração/infraestrutura | Harness de teste isolado validou o DB descartável e removeu `DATABASE_URL`. | URL/segredo Better Auth de produção, `NODE_ENV`, origins, forwarded headers, usuário PostgreSQL least-privilege, RLS, backup/restore e rede não foram observados. RLS não identificada no schema, mas é defesa adicional e sua ausência não prova bypass da camada tenant-scoped. |
| CSRF/CORS/exportação | Better Auth usa trusted origin; CSV tem autorização, escopo e `private, no-store` testados localmente. | Proxy/edge/CORS reais, CSRF em todos os handlers, custos/limites de export e efeito GET de auditoria não foram testados em produção. Nenhum bypass foi confirmado. |

## 6. Pendências operacionais e inconsistências dos registros

1. **SEC-01A/B e as remediações F001/F003 continuam desatualizados:** vários trechos dizem que a validação integrada estava bloqueada. O relatório final F005 documenta nova execução e F001 positivo/rollback; o agregado também inclui regressões mais recentes. Não apagar nem reescrever o histórico, mas registrar uma atualização formal por finding e vincular os resultados que justificam o novo status.
2. **F005 tem seções históricas que dizem “bloqueada”:** a seção “Validação integrada F005 — 2026-11-03” afirma explicitamente que substitui aquela decisão. Para o estado atual prevalece essa seção final: encerrada no código/integração; controles externos continuam separados.
3. **Contagens E2E são de runs diferentes:** 44/44 SEC-01B, 47/47 reportado em SEC-01C.3.7 e 46/47 na execução F005 de 2026-11-03 não são um único resultado. O teste visual isolado aprovado com timeout maior não transforma o run integral de timeout padrão em verde.
4. **F002 está inconclusiva em deployment, não em rate limit single-process:** o teste antigo falhou antes dos requests; o harness foi consertado. A suíte integrada posterior passou, mas não há storage distribuído nem topologia registrada.
5. **F004 distingue baseline e implementação:** headers ausentes na SEC-01B são históricos. O código e capturas Bazzite posteriores mostram headers locais, mas CSP continua Report-Only e HTTPS/produção não foram observados.
6. **M-01/I-01:** a execução de F005 pulou as suítes gated; preflight anterior foi reportado sem inconsistência em SEC-01C.3.7. Não converter o skip mais recente em falha ou aprovação; conservar a data/execução de cada evidência.
7. **Dependências:** `npm ci` offline confirma que lock e cache permitem instalação em uma cópia; não é auditoria de CVE nem parecer de segurança de dependências.

## 7. Prontidão para publicação

| Dimensão | Estado | Critério ainda necessário |
|---|---|---|
| Funcionamento da aplicação | Local/dev validado; Next, Better Auth e PostgreSQL integrado funcionaram. | Build e startup com configuração de produção isolada, sem carregar credenciais locais nem depender de banco principal. |
| Segurança do código | F001/F005 corrigidas com testes integrados; F003 alterada para fail-closed. Nenhum P0/P1 confirmado. | Formalizar F001/F003; manter matriz de autorização/tenant e concorrência relevante aprovada. |
| Banco/autenticação | PostgreSQL descartável e sessões sintéticas aprovados. | Revalidar migrations aplicáveis, pool, usuário DB least-privilege, segredo e URL canônica em staging; sem consultar produção durante esta auditoria. |
| Infraestrutura | Bazzite rootless e rede temporária demonstrados. | Topologia de aplicação, proxy/edge, TLS, segmentação, backup/restore e observabilidade da implantação não observados. |
| Produção | Não avaliada. | `NODE_ENV=production`, origins confiáveis, secret store, cookie `Secure`, HSTS e headers medidos no endpoint HTTPS efetivo. |
| CSP | Report-Only; 33 eventos de estilo registrados. | Explicar violações em build/runtime representativos e decidir enforcement sem exceções amplas. |
| Dependências | Versões/lock e instalação local verificados. | Scan de dependências/SBOM com triagem documentada de advisories atuais; não há lista de CVEs verificada. |
| Testes | Unitários/integrados atuais passaram; E2E integral teve 1 timeout, reproduzido com timeout maior. | Run integral reproduzível verde ou decisão documentada sobre o limite do teste. Reexecutar gates M-01/I-01 no próximo ciclo de release, sem tratá-los como parte da F005. |
| Auditoria/observabilidade | Evento transacional verificado; logger da aplicação sanitiza canários. | Determinar sinks de PostgreSQL/Next/Node/collector, proprietário, ACL, retenção, redaction e acesso de resposta a incidente. |

**Conclusão de prontidão:** não publicar para clientes ainda. Isto é uma decisão de evidência e de gates operacionais; não é afirmação de que uma falha P1 foi explorada ou que os controles de produção estão ausentes.

## 8. Prioridades antes da publicação

As prioridades abaixo são de trabalho/lançamento, não substituem as severidades originais.

### P0 — bloqueio crítico

**Nenhum P0 confirmado** nas fontes analisadas.

### P1 — gates de publicação

1. **Comprovar a fronteira HTTPS e cookies de produção.** Identificar TLS termination/proxy/domínio; medir `Secure` em cookie Better Auth e HSTS na resposta HTTPS efetiva. HSTS ausente no servidor HTTP local não prova falha em produção; o gate é a evidência da configuração efetiva.
2. **Validar configuração e privilégios do runtime.** Confirmar `NODE_ENV=production`, Better Auth URL/secret via secret store, trusted origins mínimas, política de forwarded headers, `DATABASE_URL` com privilégio mínimo, rede e backups. Não basta a validação do harness local.
3. **Confirmar o deployment para F002.** Registrar número de processos/réplicas e comportamento em restart. Se for multi-instância, exigir rate limiter compartilhado e validação do IP confiável no proxy antes de expor auth publicamente. Se single-process, registrar aceitação explícita do limite por processo.
4. **Comprovar isolamento multi-tenant no estado de release.** Apesar do histórico positivo de preflights, a rodada mais recente pulou 35 testes M-01/I-01. Antes de dados de clientes, executar as suítes/preflights autorizados contra schema isolado atual e preservar artefato sanitizado.
5. **Fechar controles de logging operacional antes de dados reais.** Inventariar console, Next/Node, PostgreSQL e collector efetivo; definir proprietário, ACL, retenção e redaction. O `safeLogger` cobre os pontos da aplicação, não logs do banco ou collectors.

Esses itens são gates por falta de observabilidade da implantação ou por regressão não executada, não vulnerabilidades confirmadas em produção.

### P2 — importantes para fechar o diagnóstico

1. Executar auditoria de dependências e gerar inventário/SBOM; triagem explícita de advisories críticos/altos. Não há CVE identificada nesta consolidação.
2. Atualizar formalmente o status de F001 e F003 em seus documentos, vinculando os resultados Bazzite atuais e identificando as coberturas ainda ausentes (incluindo concorrência quando aplicável). Preservar o histórico antigo.
3. Classificar os 33 eventos CSP de estilo em build de produção-like, atribuir os três estilos sem marcador e não habilitar enforcement até não haver violações inexplicadas.
4. Tornar a regressão E2E integral reproduzível dentro do timeout padrão ou registrar a política de timeout. O timeout observado ocorreu na matriz visual UX e passou isoladamente com 180 s; isso não é uma falha de autenticação demonstrada.
5. Registrar comportamento de renovação/expiração de sessão e completar a matriz direta de Server Actions/CSRF somente onde a cobertura atual deixa lacuna concreta.

### P3 — defesa em profundidade

- Avaliar RLS e papéis PostgreSQL como camada adicional após confirmar pool/contexto; não introduzir RLS sem desenho de tenant no banco.
- Expandir casos de CSV Unicode/controle e testar em planilha suportada se isso fizer parte do produto.
- Avaliar limites de export/busca e custo de requests com autenticação válida; não há abuso comprovado.
- Reavaliar cookies de cache, recovery/e-mail e controles de conta conforme funcionalidades sejam habilitadas.

## 9. Próximo ciclo recomendado

Recomendo **SEC-01D — Validação de prontidão de produção**, começando por descoberta e evidência, sem iniciar implementação até conhecer a arquitetura de destino.

| Frente | Trabalho | Esforço | Efeito na prontidão |
|---|---|---|---|
| Descoberta de runtime | Registrar réplicas, processo, edge/proxy/TLS, domínios, headers encaminhados, DB role e destinos de logs sem coletar valores de credenciais. | Pequeno | Decide se F002 exige storage compartilhado e onde testar F004. |
| Supply chain | Scan de dependências e SBOM; separar achados alcançáveis de advisories não aplicáveis. | Pequeno/médio | Substitui “sem scan” por risco de dependências rastreado. |
| Staging HTTPS isolado | Testar status/headers/cookies em HTML, API, redirect, assets e CSV; verificar HSTS, Secure, trusted origins e rate limit sob topologia representativa. | Médio | Fecha evidência de produção sem acessar ambiente produtivo. |
| Tenant/auditoria | Executar M-01/I-01, F001/F003 e regressões relevantes no banco descartável; guardar resultados por finding. | Médio | Permite reconciliar status formais e invariantes antes de dados reais. |
| CSP/logging | Analisar violações Report-Only em build representativo, separar devtools de aplicação e mapear sinks/ACL/retention. | Médio/alto | Determina se enforcement é seguro e se os logs estão operacionais. |

Não recomendo começar por trocar rate limiter, habilitar CSP enforcement ou adicionar RLS às cegas. Essas decisões dependem da topologia, da cadeia de violações e do contexto de conexão que ainda não foram observados.

## 10. Critérios objetivos para declarar prontidão

1. Nenhum finding confirmado P0/P1 aberto; cada F001–F005 tem status atualizado, evidência citada e risco residual aceito por responsável.
2. F001 prova evento de auditoria junto da mudança no sucesso e rollback sem evento falso na falha; condição concorrente aplicável tem teste ou análise registrada.
3. F002 é validada na topologia real: limite global entre todas as réplicas, IP derivado de proxy confiável e comportamento de restart documentado; ou runtime single-process formalmente definido.
4. F003 não executa leitura, mutation ou export em workspace alternativo quando contexto ativo é inválido; sessão removida/revogada e seleção explícita estão testadas.
5. M-01/I-01 e os checks de escopo organization passam no schema atual de teste sem skips não justificados.
6. F004 tem headers efetivos medidos sob HTTPS; cookies de sessão incluem `Secure`, HSTS é aplicado na camada TLS correta e CSP tem violações explicadas antes de eventual enforcement.
7. F005 mantém canários ausentes nos sinks da aplicação; PostgreSQL e todos os collectors identificados têm ACL, retenção e redaction documentadas. A conclusão F005 não se estende além dos sinks comprovados.
8. Scan atual de dependências/SBOM tem zero advisory crítico/alto sem decisão, mitigação ou aceite explícito.
9. Typecheck, lint, unitários, integrações relevantes e E2E rodam em uma execução de release reproduzível, com skips, warnings e falhas classificados; o teste visual não fica como falha opaca de timeout.
10. Segredos/configuração, usuário PostgreSQL least-privilege, backup/restore, ownership dos logs e plano de resposta a incidente foram comprovados em staging, sem expor credenciais nos artefatos.

## Fontes primárias

- [SEC-01A — relatório](SEC-01A-report.md), [achados](SEC-01A-findings.md), [modelo de ameaças](SEC-01A-threat-model.md), [superfície de ataque](SEC-01A-attack-surface.md) e [cobertura](SEC-01A-test-coverage.md).
- [SEC-01B — relatório](SEC-01B-report.md), [atualização dos achados](SEC-01B-findings-update.md), [evidências](SEC-01B-evidence.md) e [matriz de testes](SEC-01B-test-matrix.md).
- [SEC-01C F001](SEC-01C-F001-remediation.md), [F003](SEC-01C-F003-remediation.md), [F004](SEC-01C-F004-remediation.md) e [F005](SEC-01C-F005-remediation.md).
