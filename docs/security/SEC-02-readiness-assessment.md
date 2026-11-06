# SEC-02 — Avaliação de segurança da infraestrutura e prontidão

**Data:** 2026-11-03  
**Escopo desta execução:** inspeção estática e reconciliação documental. Nenhum teste foi executado; nenhuma migration, alteração de código, conexão a banco, ambiente de produção ou credencial foi acessada. `.env.local` não foi lido.

## 1. Resumo executivo

O projeto define um **monólito modular Next.js App Router com PostgreSQL**, mas não define uma arquitetura de implantação de produção. A documentação descreve o ambiente de desenvolvimento local e registra que Quadlet seria avaliado depois. Não há configuração de hospedagem, proxy reverso, terminação TLS, rede de produção, deployment, réplicas, secret manager, collector de logs ou política efetiva de backup.

Há controles implementados no código que precisam ser medidos no ambiente real para demonstrar seu efeito. `next.config.ts` define headers básicos; `src/proxy.ts` envia uma CSP nonce em `Report-Only`; Better Auth ativa `Secure` quando `NODE_ENV=production` e usa `BETTER_AUTH_URL` como `baseURL` e trusted origin. Nenhum deles comprova, por si só, HTTPS, redirecionamento, HSTS, headers efetivamente recebidos, confiança segura em proxy ou atributos de cookies numa resposta HTTPS.

**Decisão:** a aplicação continua sem evidência suficiente para publicação. Os P1 da SEC-01 permanecem gates de evidência/configuração, não vulnerabilidades P1 comprovadas. A próxima decisão necessária é identificar o destino pretendido e seus responsáveis por TLS, banco, segredos e logs. Não se recomenda escolher provedor, adicionar HSTS, trocar rate limiter ou introduzir réplicas antes dessa descoberta.

### Conclusões principais

- **Produção:** não definida nos documentos e arquivos de implantação inspecionados.
- **Execução:** scripts `build` e `start` existem; não há imagem, orquestrador, pipeline de release ou health check declarado.
- **TLS/HSTS:** sem configuração de domínio, proxy ou TLS; HSTS não está em `next.config.ts`. O dono da terminação e dos headers precisa ser decidido.
- **Sessões:** sessões Better Auth usam adapter PostgreSQL; `useSecureCookies` é condicionado a `NODE_ENV === "production"`. O teste HTTP local registra HttpOnly/SameSite=Lax, mas não prova `Secure` em HTTPS.
- **Réplicas:** a arquitetura proposta diz “um deploy”, sem declarar uma ou várias instâncias. Sessões persistidas no banco podem ser compartilhadas se as instâncias usarem o mesmo banco/configuração; o rate limiter padrão permanece por processo.
- **PostgreSQL:** conexão por `pg.Pool`, máximo 10 conexões por processo e `DATABASE_URL`. Não foi localizada separação declarada de usuário de runtime e usuário de migrations, regra de rede, TLS do banco ou configuração de backup operacional. Migrations revogam `PUBLIC` em funções específicas; isso não demonstra o privilégio efetivo de um usuário implantado.
- **Logs:** logger allowlist e integração F005 validados nos sinks da aplicação capturados. Destino final, logs internos de plataforma/PostgreSQL, collector, ACL, retenção e redaction externos não foram demonstrados. F005 não é reaberta.
- **F001/F003:** status “aguardando validação” nos relatórios individuais está desatualizado frente à execução integrada de 03/11. A evidência permite reconciliar o status para **correção validada nos cenários cobertos**, preservando limites explícitos; não se deve extrapolar para auditoria integral de tenant ou concorrência geral.

## 2. Reconciliação documental F001 e F003

| Finding | Status histórico | Evidência posterior existente | Status tecnicamente justificável agora | Limite e risco residual |
|---|---|---|---|---|
| **F001 — papel alterado sem auditoria atômica (P2)** | SEC-01C-F001: correção implementada; validação PostgreSQL, E2E e preflights pendentes. SEC-01B também preserva a reprodução da implementação antiga. | A seção “Validação integrada F005 — 2026-11-03” em SEC-01C-F005 relata `tests/integration/sec-01b-audit-workspace.test.ts`: sucesso persistiu papel e `audit_logs`; falha injetada no insert reverteu o papel, não deixou evento falso e não alterou a outra organização. A integração geral registrou 195 aprovados e 35 skips em M-01/I-01. Typecheck e lint passaram. | **Remediação validada nos caminhos positivo e rollback cobertos em PostgreSQL descartável.** O status individual deve ser atualizado para “corrigida/validada neste escopo”, em vez de “validação dinâmica pendente”, mantendo a descrição histórica da falha original. | Não há teste dinâmico de concorrência registrado nessa execução; validação geral de todos os invariantes de banco e deployment não decorre deste teste. O F001 original não está reaberto; ampliar cobertura concorrente só se houver requisito concreto. Teste referido: `sec-01b-audit-workspace.test.ts`, casos positivo e de falha de auditoria. |
| **F003 — fallback silencioso de workspace inválido (P3)** | SEC-01C-F003: implementação preparada; PostgreSQL/E2E pendentes. SEC-01B registra comportamento antigo restrito às memberships legítimas, sem evidência de acesso a terceiro tenant. | A integração de 03/11 passou e cobre ausência de contexto, seleção inequívoca, múltiplas memberships e contexto ativo inválido sem migrar leituras/escritas para outra membership. A regressão E2E integral teve 46/47 passados; a única reprovação foi `ux-visual-audit`, não a suíte multi-tenant. O teste `workspace ativo inválido exige nova seleção e não renderiza o fallback de A` está em `multitenant-security.spec.ts`; a mesma suíte cobre seleção/troca explícita, sessão expirada e falta de membership. | **Correção fail-closed validada nos cenários F003 registrados.** O relatório individual deve substituir o status “aguardando validação” por “validada para o achado F003”, sem converter isso em aprovação geral de todos os controles multi-tenant. | Os 35 testes gated M-01/I-01 não rodaram nesta execução. A execução anterior reportada sem inconsistência é histórica e distinta. Cobertura completa de toda Server Action/API, concorrência de remoção de membership e auditoria adversarial permanece fora do que esta evidência prova. Testes referidos: `sec-01b-audit-workspace.test.ts` e `multitenant-security.spec.ts`. |

Os documentos SEC-01A/B e os relatórios individuais devem permanecer como histórico. A atualização futura deve acrescentar uma nota datada e referências aos resultados de 03/11, sem apagar o registro de que a validação era pendente antes dessa execução. Esta SEC-02 apenas identifica a reconciliação necessária; não altera aqueles relatórios.

## 3. Arquitetura de implantação observada

### Componentes e estado

| Componente | Evidência no repositório | Classificação |
|---|---|---|
| Forma da aplicação | `docs/architecture.md` e ADR-0001 descrevem monólito modular Next.js App Router e um deploy com PostgreSQL; sem microsserviços no MVP. | **Planejado**, não uma topologia de produção observada. |
| Processo web | `package.json` expõe `next dev`, `next build` e `next start`; Node 24.22.2 foi usado no Distrobox na validação F005. | **Implementado/testado localmente**; imagem, runtime de produção e release não definidos. |
| Hospedagem/orquestração | Nenhum artefato de provedor, Containerfile/Dockerfile, Compose, Kubernetes, Quadlet ou pipeline foi encontrado no inventário inspecionado. | **Não definido.** Quadlet é citado como avaliação futura. |
| Proxy/TLS/rede | Sem configuração local de reverse proxy, domínio, certificado, listener público, firewall ou encaminhamento de headers. | **Não definido.** |
| PostgreSQL | `pg.Pool` conecta pelo `DATABASE_URL`; arquitetura descreve PostgreSQL 18 em Podman rootless com volume persistente para desenvolvimento. Testes recentes usaram PostgreSQL descartável e isolado. | **Implementado/testado no desenvolvimento**; produção/managed DB e rede não definidos. |
| Deploy e escala | Arquitetura fala em “um deploy”; não há réplicas, balanceador, estratégia de rollout/rollback, health check ou cache compartilhado definidos. | **Não definido para produção.** “Um deploy” não prova instância única. |
| Configuração/segredos | `.env.example` lista apenas `DATABASE_URL`, `BETTER_AUTH_SECRET` e `BETTER_AUTH_URL`; `.gitignore` ignora `.env*` e reabre `.env.example`. README prevê `.env.local` para desenvolvimento. | **Padrão local implementado; secret manager, rotação e configuração de produção não definidos.** Nenhum arquivo de segredo foi lido. |
| Logs | `safeLogger` envia JSON a `console`; scripts de bootstrap enviam mensagens estáticas a `console`. Não foi encontrada integração declarada com collector. | **Sanitização de sinks controlados validada; destino/controles operacionais desconhecidos.** |
| Backup/recuperação | `docs/architecture.md` prevê exercitar backup/restore antes do piloto. | **Planejado; não comprovado.** |

O README contém instruções de setup local e afirma que nenhum serviço foi iniciado; trechos de status inicial divergem dos relatórios posteriores. Foi usado como evidência de intenção de desenvolvimento, não como descrição da instalação atual nem como plano de produção.

## 4. Análise de HTTPS, HSTS e headers

- `next.config.ts` define `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` e `Permissions-Policy`, remove `X-Powered-By` e aplica a regra aos caminhos do Next. Isso é configuração implementada. O resultado wire depende do build, do proxy e de respostas externas; não comprova todas as rotas de erro, redirects ou respostas do edge.
- `src/proxy.ts` gera nonce e envia `Content-Security-Policy-Report-Only` para páginas documentais correspondentes ao matcher. Não há HSTS nem redirecionamento HTTP→HTTPS no código inspecionado. A CSP continua Report-Only, com as violações históricas descritas na SEC-01.
- Não há owner declarado para TLS/HSTS. Se TLS terminar na borda, ela deve ser a fonte autoritativa de redirect/HSTS; se TLS terminar diretamente no servidor Next, a política pode ser entregue ali. Escolher uma camada responsável e evitar duas políticas conflitantes. Garantir que o app não seja alcançável por uma rota HTTP paralela e que headers encaminhados sejam sobrescritos/aceitos somente do proxy confiável.
- Não habilitar `includeSubDomains` ou `preload` até haver domínio, HTTPS obrigatório e inventário dos subdomínios. HSTS recebido por HTTP local não é evidência de HTTPS; a SEC-01 registra que HSTS e `Secure` sob HTTPS efetivo não foram testados.
- Validação futura deve observar a resposta HTTPS real de login, rota privada, API/auth, erro, redirect, asset e CSV. Verificar redirect HTTP→HTTPS, uma única política HSTS na camada escolhida, ausência de conflito/duplicação, CSP/headers adequados ao tipo de resposta e preservação de `private, no-store` nas respostas privadas.

**Estado:** implementação parcial local; configuração de transporte e edge **não verificada**. Não é uma reprovação comprovada de produção porque não há endpoint de produção autorizado/inspecionado.

## 5. Sessões e origem confiável

### Configuração observada

- Better Auth usa `drizzleAdapter(getDb(), { provider: "pg" })`; sessões são mantidas no banco compartilhado, conforme o adapter e o schema. A integração de 03/11 comprovou criação, consulta, logout e ausência de sessão após logout em PostgreSQL descartável.
- `baseURL` e `trustedOrigins` são ambos derivados de `BETTER_AUTH_URL`, com default local `http://localhost:3000`. Para uma implantação, deve-se fornecer explicitamente a origem canônica HTTPS; o default não configura o hostname público.
- `advanced.useSecureCookies` é `process.env.NODE_ENV === "production"`. Assim, a flag correta de runtime influencia `Secure`; ela não comprova que `NODE_ENV` seja correto nem que proxy/camada TLS estejam corretos.
- Não há configuração explícita de `Domain`, `Path`, `HttpOnly` ou `SameSite` no objeto Better Auth. O artifact local SEC-01B/F004 observou `HttpOnly`, `SameSite=Lax`, `Path=/` e `Secure=false` em HTTP local. Esses atributos locais refletem a execução HTTP, não uma captura HTTPS de produção. Nenhuma sessão real foi consultada nesta inspeção.
- Não foi encontrada configuração de proxy confiável ou regra de encaminhamento de `Host`/`X-Forwarded-*` no repositório. Isso é uma lacuna de desenho operacional, não prova de spoofing. O valor de `BETTER_AUTH_URL`, o host HTTP observado e os trusted origins precisam concordar, e o app deve confiar apenas nos headers definidos pelo edge que controla.

### Evidência reproduzível necessária

Em uma cópia temporária sem arquivos `.env*`, usar apenas banco descartável e segredo/usuário sintéticos, `NODE_ENV=production`, `BETTER_AUTH_URL` HTTPS de teste e TLS terminado por proxy local isolado. Capturar somente metadados sanitizados de `Set-Cookie` (nomes/atributos, sem valores): `Secure`, `HttpOnly`, `SameSite`, `Path`, ausência/presença justificada de `Domain`; confirmar login, sessão, logout, redirects de origem confiável e comportamento sob host/forwarded headers inválidos. Inspecionar também cookie pós-logout sem gravar o valor. Comparar o request HTTPS e HTTP antes/depois da terminação TLS. Não carregar `.env.local` e não exibir tokens/cookies.

## 6. Réplicas e estado compartilhado

O repositório não escolhe instância única nem múltiplas réplicas. A arquitetura MVP usa um monólito e uma base, o que é compatível com qualquer uma das topologias. Better Auth guarda sessões no PostgreSQL, mas o rate limit default é memória por processo segundo a configuração instalada e o achado F002. Reiniciar o processo limpa contadores; duas réplicas não compartilham contadores. O pool PostgreSQL, singleton Better Auth e runtime Next existem por processo.

**Decisão condicionante:** primeiro registrar a topologia alvo. Se for uma instância estável, documentar limite por processo e a aceitação operacional do risco condicionado de F002. Se forem várias, comprovar sessões/configuração comuns e limitar tentativas com storage compartilhado ou serviço equivalente antes de expor login; também validar proxy/IP de cliente confiável, distribuição de requests, restart e limite global. Não instalar Redis ou adicionar réplicas somente para satisfazer checklist.

Teste isolado possível quando a topologia for escolhida: duas instâncias efêmeras com mesma configuração sintética e banco descartável, atrás de proxy temporário na rede Podman interna; criar sessão na instância A e consultar/logout via B; alternar tentativas de login e restart para verificar o rate limit no escopo pretendido. Se o destino escolhido é single-process, não há requisito de teste multi-réplica, mas registrar esse limite e validar restart/contagem local.

## 7. PostgreSQL e privilégios

### Observado

- `src/db/index.ts` usa `pg.Pool` com `DATABASE_URL`, `max: 10`, `idleTimeoutMillis: 30_000`, `connectionTimeoutMillis: 5_000`. A opção não declara `ssl`; a criptografia efetiva pode depender do parâmetro da URL/serviço, portanto está **não verificada**.
- `drizzle.config.ts` carrega configuração de ambiente para migrações locais; a configuração `drizzle.test.config.ts` valida explicitamente o destino isolado. A estratégia já demonstrada de F005 usou cópia sem `.env*`, `TEST_DATABASE_URL` sintética e banco efêmero.
- Migrations criam objetos e funções; algumas funções `SECURITY DEFINER` revogam permissões de execução de `PUBLIC`. Não foram localizados `CREATE ROLE/USER` ou `GRANT` de uma role específica para runtime/migrations nos arquivos inspecionados. Logo, não há evidência no repositório de separação efetiva nem de grants de runtime. A revogação específica é um controle implementado, não prova de least privilege total.
- `docs/database-model.md` e `docs/architecture.md` descrevem schema/relacionamentos e ambiente local; não documentam allowlist de rede, TLS do PostgreSQL, política de backup executada, RPO/RTO ou teste de restore. Backup/restore está somente planejado antes do piloto.
- A execução F005 criou PostgreSQL temporário rootless em rede `internal=true`, tmpfs e sem volume; confirmou identidade do banco de teste antes das migrations e removeu apenas recursos temporários. Isso comprova a capacidade de testar com isolamento local; não comprova segurança de um DB de produção.

### Validação futura em instância descartável

1. Construir uma matriz a partir das migrations e operações efetivamente usadas por runtime/bootstrap; separar role de migrations (DDL temporário) da role de aplicação (DML estritamente necessário). Não presumir grants antes de testar em cópia descartável.
2. Em container PostgreSQL rootless novo, rede interna, tmpfs e credenciais sintéticas, aplicar schema somente nessa instância e testar startup, login, CRUD básico, sessão, auditoria e triggers usando a role runtime. Confirmar que essa role não cria/altera schema, não é superuser, tem somente privilégios necessários em tabelas/sequências/funções e não pode executar funções auxiliares proibidas.
3. Testar que a role de migration consegue aplicar a versão de schema e que a role de runtime não consegue executar DDL. Consultar `current_user`, privilégios efetivos e grants sem imprimir senha/URL.
4. Confirmar bind/network access somente no endpoint local/isolado necessário. TLS de banco deve ser testado numa topologia que realmente o use; o PostgreSQL descartável local sem TLS não comprova criptografia em trânsito para serviço remoto.
5. Se backup for requisito do alvo, gerar e restaurar dump de dados sintéticos em outro banco descartável; registrar integridade, duração e limites. Isso não substitui restore observado no serviço escolhido.

## 8. Logs e controles operacionais

O `safeLogger` serializa campos allowlistados e uma representação reduzida de `Error` para `console`; o adaptador Better Auth descarta mensagens/argumentos arbitrários. A execução F005 integrada de 03/11 capturou stdout/stderr do runner/Next e logs do PostgreSQL descartável: canários não apareceram, mas erros PostgreSQL dos testes continham detalhes sintéticos de fixtures. Essa execução validou os streams observados nessa rodada e a integração; não os coletores de uma implantação.

### Limites explícitos

- `console` é um sink; o destino depois dele depende do processo, container, plataforma e configuração do host. Não há collector/serviço declarado no repositório.
- `safeLogger` não controla logs internos de Node/Next, do driver, PostgreSQL, reverse proxy, balanceador, CDN ou collector.
- Nenhuma política concreta de redaction, ACL/RBAC de operador, retenção/expurgo, localização, criptografia, exportação, alertas ou resposta a incidente foi documentada para um destino operacional.
- Para PostgreSQL descartável, F005 encontrou logs de erros esperados de testes negativos e detalhes de fixture sintética. Isso não constitui evidência de exposição real nem reabre F005; torna o log do banco um sink separado a configurar/avaliar.

### Validação posterior

Antes de dados reais, inventariar todos os sinks do destino escolhido; gerar canários sintéticos distintos por aplicação, banco e proxy; capturar streams apenas dos processos temporários; verificar redaction, permissões de leitura, retenção e expurgo na plataforma de homologação. Relatar separadamente `safeLogger`, logs framework/Node, PostgreSQL e collector. Não afirmar ACL ou retenção sem consultar a política/configuração efetiva ou obter evidência do operador.

## 9. Matriz de gates de publicação

Prioridade indica a ordem de evidência antes da publicação, não severidade de uma vulnerabilidade comprovada. “Homologação” significa ambiente segregado com configuração representativa e dados sintéticos; nenhum gate abaixo foi avaliado em produção.

| ID | Requisito | Risco associado | Evidência existente | Evidência necessária | Ambiente necessário | Dependências | Prioridade | Status |
|---|---|---|---|---|---|---|---|---|
| ARCH-01 | Registrar provedor, topologia, componentes e responsável operacional | Controles podem não ter dono ou camada definida | Arquitetura de monólito e DB local descrita; sem alvo de produção | Diagrama/configuração aprovada do runtime, rede, edge, DB, logs e ownership | Descoberta documental; sem serviço | Decisão do responsável pelo produto/infra | P1 | **Não verificado** |
| REL-01 | Build/start de release e processo de deploy/rollback/health | Release inconsistente ou indisponível | Scripts `build`/`start`; nenhum pipeline/imagem | Build de produção isolado, artefato imutável, startup, health/readiness e rollback definidos | Cópia temporária no Distrobox; depois homologação | Alvo de hospedagem e processo de release | P1 | **Parcialmente comprovado** |
| TLS-01 | HTTPS efetivo e redirect HTTP→HTTPS | Credenciais/sessões podem trafegar sem TLS ou originar caminhos inconsistentes | Nenhuma configuração/endpoint de produção; SEC-01 só observou HTTP local | TLS válido no endpoint de homologação e redirect sem loop; app sem rota pública HTTP alternativa | Homologação HTTPS isolada com proxy temporário | Domínio de teste, owner de TLS e proxy | P1 | **Não verificado** |
| TLS-02 | HSTS na única camada responsável | Browser pode continuar usando HTTP; duplicidade/conflito de políticas | HSTS ausente no Next config; implantação/edge desconhecidos | Header medido na resposta HTTPS; escopo de host definido; `includeSubDomains`/preload só com inventário e decisão | Homologação HTTPS | Decisão do domínio/TLS owner | P1 | **Não verificado** |
| HDR-01 | Headers efetivos em documento, API, erro, redirect, assets e CSV | Divergência entre configuração Next e resposta entregue | Headers básicos implementados; execução focal local reportada em SEC-01C/F004 | Captura sanitizada por tipo/status, inclusive no proxy; sem duplicidade e sem quebrar cache privado | Build `production` local e homologação | Resolver TLS/proxy e CSP Report-Only | P1 | **Parcialmente comprovado** |
| CSP-01 | Interpretar CSP antes de enforcement | Política pode não bloquear recursos indevidos ou quebrar fluxos | Report-Only implementada; 33 eventos `style-src-elem`, três estilos sem atribuição na evidência anterior | Captura em build de produção representativa, explicação por origem e decisão registrada antes de enforcement | Build de produção local; depois homologação | URL/rotas/fontes externas representativas | P2 | **Parcialmente comprovado** |
| SESS-01 | Cookie de sessão seguro em HTTPS | Cookie exposto em transporte HTTP ou disponível a script | `useSecureCookies` depende de `NODE_ENV=production`; HTTP local mostrou HttpOnly/Lax/Path e Secure=false | `Set-Cookie` HTTPS sanitizado com `Secure`, `HttpOnly`, `SameSite`, `Path`, `Domain` justificado; login/logout | Homologação HTTPS + usuário sintético | TLS, configuração de produção e trusted origin | P1 | **Parcialmente comprovado** |
| SESS-02 | Origem canônica e proxy confiável | Host/origin spoofing, redirects/cookies com origem errada | `BETTER_AUTH_URL` alimenta baseURL/trustedOrigins; fallback localhost | Testes de origem válida/inválida e de `Host`/forwarded headers através do proxy controlado | Homologação com proxy isolado | Definir hostnames e semântica do proxy | P1 | **Parcialmente comprovado** |
| SCALE-01 | Instâncias e estratégia do rate limit coerentes | Contadores por processo permitem mais tentativas em multi-réplica/restart | F002 teste local do handler; storage default em memória por processo; topologia não definida | Número de instâncias documentado; se multi, sessão compartilhada e limit global/restart/IP demonstrados; se single, aceitação explícita e reinício testado | Uma instância ou duas efêmeras atrás de proxy, conforme decisão | Decisão de arquitetura; possível storage compartilhado se multi | P1 condicional | **Não verificado** |
| DB-01 | Role runtime least privilege separada da role de migrations | Compromisso da app pode permitir DDL/controle total do schema | Migrations têm revogações específicas; sem roles/grants runtime declarados | Grants efetivos por tabelas, sequências e funções; app sem superuser/DDL; migrations separadas | PostgreSQL descartável; homologação para role efetiva | Inventário de operações e decisão de gestão do DB | P1 | **Não verificado** |
| DB-02 | Rede e TLS para PostgreSQL | Banco acessível de redes não necessárias ou tráfego sem proteção | F005 usou rede interna descartável; Pool não declara opção `ssl` | ACL de rede/listener e política TLS medidas no alvo; origem de conexões restrita | DB descartável para rede; homologação para TLS/ACL de serviço | Definir DB local/gerenciado e rede alvo | P1 | **Parcialmente comprovado** |
| DB-03 | Backup e recuperação testados | Perda de dados ou recuperação não operacional | Backup/restore é plano antes do piloto; sem evidência executada | Retenção, RPO/RTO, backup protegido e restore verificado com dados sintéticos, depois procedimento do serviço | DB descartável; depois homologação/serviço escolhido | Owner de dados/DB e política do provedor | P1 | **Não verificado** |
| SEC-01 | Secret store, escopo, rotação e configuração runtime | Segredos ausentes/expostos/reutilizados ou config insegura | `.env.example` lista variáveis; `.env.local` ignorado; F005 usou valores sintéticos | Fonte de segredo aprovada, rotação/backup, variáveis obrigatórias, `NODE_ENV=production`, sem `.env*` no artefato | Build limpo e homologação com segredos sintéticos | Escolha do host/secret manager e domínio | P1 | **Parcialmente comprovado** |
| LOG-01 | Sanitização dos sinks sob controle da aplicação | Dados sensíveis em logs de auth/handlers do CRM | F005 encerrada em código/integração; canários ausentes em stdout/stderr capturados | Manter regressão de canário no build/release do CRM | Testes atuais de CI/homologação, sem dados reais | Nenhuma além da regressão existente | P2 | **Comprovado no escopo testado** |
| LOG-02 | Destino, ACL, redaction e retenção dos logs operacionais | Exposição de PII/detalhes e retenção indevida | Nenhum collector definido; logs PostgreSQL são sink distinto | Inventário, configuração de ACL, retenção/expurgo e teste de canários por sink | Homologação do collector/serviço escolhido | Escolha do destino e responsável de observabilidade | P1 | **Não verificado** |
| FIND-01 | Status F001/F003 reconciliados formalmente | Relatórios contraditórios levam a decisão de release desatualizada | Integração 03/11 cobre os cenários; relatórios individuais mantêm “pendente” | Adendo datado aos relatórios individuais citando testes e limites, sem reescrever história | Documental | Revisão do responsável de segurança | P2 | **Parcialmente comprovado** |
| TEN-01 | Gates de integridade M-01/I-01 no schema de release | Relações inválidas entre memberships e registros/organizações | Histórico anterior reportou preflights limpos; 35 casos gated foram skipped na última execução | Rodar suites gated e preflights read-only no PostgreSQL isolado e registrar artefato | PostgreSQL descartável com schema atual | Flags/harness e validação de identidade do DB | P1 | **Parcialmente comprovado** |

Nenhum requisito está classificado como **Reprovado** porque esta etapa não executou teste dinâmico e as fontes não demonstram falha na infraestrutura de produção. Isso não transforma “não verificado” em aprovado.

## 10. Sequência de validação segura

### Fase A — Decisões e limites do alvo (sem execução de serviços)

1. Definir hospedagem pretendida, domínio de homologação, quantidade de processos/réplicas, owner da terminação TLS, DB local/gerenciado, proxy/headers encaminhados, secret manager, collector e política de backup.
2. Registrar se o deploy será single-process ou multi-instance. A decisão resolve se o rate limiter F002 atual pode ser aceito com risco operacional documentado ou se é necessária solução compartilhada.
3. Estabelecer requisitos de release, rede, retenção e recuperação antes de selecionar uma configuração concreta.

### Fase B — Validação local de produção, descartável

1. Criar cópia temporária do projeto excluindo `.env*`, `.git`, `node_modules`, build e artefatos. Nenhum teste deve permitir que Next carregue um `.env.local` existente.
2. Usar variáveis de teste sintéticas e um PostgreSQL rootless exclusivo, novo, rede interna, tmpfs, sem volume persistente e sem dependência de container/DB existente. Confirmar identidade e privilégios antes de qualquer operação de escrita autorizada nessa fase futura.
3. Validar build/start `NODE_ENV=production`, origem canônica e cookies Better Auth no wire atrás de proxy HTTPS temporário. Capturar apenas atributos de cookie, status/headers sanitizados e canários sintéticos.
4. Examinar headers em login, página privada, API/auth, 401/403, erro, redirect, assets e CSV; conferir CSP Report-Only, HSTS apenas na resposta HTTPS e política de redirect.
5. Validar roles distintas de migration/runtime no PostgreSQL descartável; rodar apenas operações necessárias com role de runtime e provar que DDL não é permitido. Conferir grants efetivos e conexões.
6. Reexecutar M-01/I-01 e preflights read-only no banco isolado; atualizar evidências F001/F003 sem conflar as datas/execuções.
7. Executar somente os testes automatizados relevantes já existentes depois da identidade do banco descartável ser validada. A regressão E2E completa deve registrar o timeout visual separado e M-01/I-01 sem skips quando forem alvo.

### Fase C — Homologação representativa

1. Implantar o mesmo artefato/configuração pretendidos em ambiente segregado, ainda sem dados reais, para verificar endpoint HTTPS, redirect, HSTS, atributos de cookie e resposta real do edge.
2. Confirmar política de proxy confiável e que o app só aceite tráfego pelo caminho esperado.
3. Se houver réplicas, testar sessão criada em uma e consumida em outra, rate limit cruzado, restart e consistência de segredo/configuração.
4. Testar logging no collector escolhido com canários por sink e verificar ACL/retention/redaction com evidência do próprio serviço. Exercitar restore somente em cópia descartável/sandbox.
5. Documentar cada resultado como local, homologação ou produção. SEC-02 não autoriza acessar produção; qualquer verificação futura de produção dependerá de autorização e janela explícitas.

O Bazzite 44, Podman rootless, Distrobox `laboratorio-node`, PostgreSQL temporário e Playwright estão documentados como disponíveis em 03/11. Podman teve restrição de sandbox no caminho libpod e exigiu autorizações pontuais em execução anterior. Esse histórico serve para planejar futuras chamadas com escopo limitado; não é autorização permanente e nenhum recurso foi criado nesta SEC-02.

## 11. Dependências de decisão e próximo ciclo

Antes de uma execução com proxy e PostgreSQL descartáveis, o responsável pelo projeto precisa definir ao menos: alvo de hospedagem/homologação, domínio de teste, processo/rede e eventual contagem de réplicas, quem termina TLS, onde ficará PostgreSQL, como segredos serão fornecidos e qual serviço recolherá os logs. Sem isso, é possível validar o código local, mas não decidir HSTS, rate limit distribuído, proxy confiável, ACL ou retenção.

### Próxima execução recomendada: SEC-02A — Descoberta do alvo e prova local production-like

**Esforço qualitativo:** pequeno para registrar decisões; médio para build, PostgreSQL descartável, proxy HTTPS efêmero e teste wire.  
**Ordem:** primeiro obter as decisões de alvo; depois executar somente build/start e testes não destrutivos em cópia limpa com recursos temporários identificados. Não criar infraestrutura persistente nem alterar o CRM. Se o alvo ainda não estiver escolhido, limitar a execução seguinte à avaliação de PostgreSQL roles e comportamento Better Auth em ambiente local descartável, deixando HSTS/topologia para depois.

Objetivos verificáveis da SEC-02A:

- produzir registro da arquitetura de homologação e donos por camada;
- demonstrar startup de produção sem `.env*` no checkout e com variáveis sintéticas;
- medir `Set-Cookie` e headers em HTTPS local atrás do proxy escolhido;
- validar roles/grants no PostgreSQL descartável;
- executar suites F001/F003 e gates M-01/I-01 com resultados separados;
- decidir condicionalmente a validação single/multi-instance de F002;
- não fazer alteração arquitetural sem uma falha observada e uma decisão autorizada.

## Fontes inspecionadas

- [SEC-01 consolidada](SEC-01-consolidated-status.md), [SEC-01A achados](SEC-01A-findings.md), [SEC-01B atualização](SEC-01B-findings-update.md).
- [Remediação F001](SEC-01C-F001-remediation.md), [F003](SEC-01C-F003-remediation.md), [F004](SEC-01C-F004-remediation.md) e [F005](SEC-01C-F005-remediation.md).
- [Arquitetura](../architecture.md), [modelo de segurança](../security-model.md), [modelo de banco](../database-model.md), [ADR-0001](../decisions/ADR-0001-stack-e-identificadores.md), [README](../../README.md) e [estratégia de testes](../test-strategy.md).
- Código examinado: `package.json`, `next.config.ts`, `src/proxy.ts`, `src/lib/auth.ts`, `src/lib/safe-logger.ts`, `src/db/index.ts`, `drizzle.config.ts`, `drizzle.test.config.ts`, migrations e testes citados acima. Nenhum arquivo `.env*` foi aberto.

## Limitações desta avaliação

Revisão documental/estática não comprova comportamento de proxy, TLS, cookie HTTPS, grants efetivos, acesso de rede, collector, ACL, retenção, restore ou runtime de produção. Também não demonstra que esses controles estejam ausentes fora do repositório. Nenhum teste, scan de dependências, migration, serviço, consulta de banco ou mudança de aplicação foi executado nesta SEC-02.
