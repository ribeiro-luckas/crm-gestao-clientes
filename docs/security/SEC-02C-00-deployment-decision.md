# SEC-02C.0 — Decisão de implantação e preparação do release

**Data:** 2026-11-03  
**Natureza:** recomendação para decisão do responsável; não aprova arquitetura, fornecedor ou implantação.  
**Escopo:** consolidação da SEC-02A e das evidências SEC-01/SEC-02. Nenhum serviço, banco, migration ou deploy foi iniciado; não foram acessados produção, credenciais reais ou `.env.local`.

## 1. Resumo executivo

O CRM já demonstrou build Next.js, runtime Node, PostgreSQL, autenticação e sessões Better Auth, migrations Drizzle, exportação CSV, auditoria transacional, CSP nonce enforced em build de produção isolado e regressão E2E 47/47. Isso demonstra compatibilidade técnica local, não operação em um provedor ou prontidão para publicar.

**Recomendação para aprovação:** adotar como candidata a **Alternativa A — aplicação Node.js gerenciada e PostgreSQL gerenciado**, inicialmente em uma única instância lógica, com PostgreSQL privado, job de migrations separado, proxy/edge como owner de TLS/HSTS e a aplicação como única emissora da CSP. Essa opção reduz tarefas operacionais de banco/host que ainda não têm owner identificado. Só avançar se o serviço suportar runtime Node real, renderização dinâmica por request, conexão privada/TLS, gestão de segredos, jobs separados e restore verificável dentro do orçamento que o responsável aprovar.

**Alternativa B — VPS autogerida** é viável se o responsável preferir esse modelo e designar quem cuidará continuamente de patching, firewall, PostgreSQL, backups, monitoramento, incidentes e recuperação. Containers separados ajudam no isolamento, mas não removem o host único como domínio de falha.

Nenhum fornecedor ou custo foi selecionado. A aprovação humana ainda é necessária para hospedagem, orçamento, domínio, escala, disponibilidade, owner operacional, backup e retenção de logs. G-11 e G-15 permanecem parciais.

## 2. Requisitos técnicos

“Obrigatório” descreve o contrato funcional/de segurança observado ou necessário ao sistema. “Preferência” é uma escolha inicial de simplicidade que pode ser alterada por decisão do responsável.

| Tema | Requisito obrigatório ou evidência | Preferência inicial / pendência |
|---|---|---|
| Runtime | Next.js 16.4.3 usa APIs Node (`node:crypto`) e `pg`; um alvo exclusivamente Edge não atende ao runtime atual. Node 24.22.2 foi validado no ambiente local. | Node gerenciado ou container OCI, sem acoplamento ao SDK do provedor. Confirmar versão suportada e ciclo de patch no serviço escolhido. |
| Build | `next build` passou em cópia limpa. O preflight SEC-02B.0 demonstrou necessidade de `BETTER_AUTH_SECRET` e `DATABASE_URL` sintéticos durante o build, sem conexão PostgreSQL. | Builder deve receber valores próprios e não produtivos; nunca segredos de produção. Separar configuração de build e runtime. |
| PostgreSQL | Sessões Better Auth, dados comerciais e `audit_logs` persistem em PostgreSQL; migrations SQL/Drizzle estão no projeto. PostgreSQL 18 foi usado nos testes. | Serviço PostgreSQL gerenciado ou versão compatível; rede privada, TLS quando aplicável, storage durável e role runtime de privilégio mínimo. |
| Better Auth e sessão | Better Auth 1.7.14, adapter Drizzle, sessão persistida no banco; login, sessão, logout e Secure cookie foram testados em ambiente descartável HTTPS. A URL canônica e trusted origins devem corresponder ao domínio escolhido. | Um ambiente e uma configuração isolados por estágio; signup comum continua desabilitado. Não habilitar e-mail/convites sem provedor e validação próprios. |
| Segredos | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` e `DATABASE_URL` são exigidos nos contextos documentados. Bootstrap `CRM_OWNER_*`/`CRM_ORGANIZATION_*` é de uso controlado, não configuração normal de runtime. | Secret store do destino, valores distintos por ambiente, ACL mínima e rotação com procedimento. Não persistir valores no artefato, repositório ou logs. |
| CSP e renderização | Em produção, documentos recebem `Content-Security-Policy` com nonce por request; `connection()` no layout raiz torna as rotas dinâmicas. A validação SEC-02B.5 foi local, não na arquitetura escolhida. | Aplicação permanece owner da CSP; proxy preserva headers de request necessários ao Next e não adiciona política concorrente. Development/test continua Report-Only. |
| Auditoria e CSV | Eventos de `audit_logs` são transacionais nos fluxos cobertos. Exportação CSV foi exercitada; não foi identificado requisito de armazenamento persistente de arquivos para o fluxo atual. | Banco como storage durável da auditoria; streaming/download do CSV sem armazenar arquivo no filesystem efêmero do app. |
| Migrations | `drizzle-kit migrate` existe; o código não deve depender de DDL no startup web. Evidência de role/job de produção ainda não existe. | Job/release step separado com identidade de migration. Runtime recebe somente grants necessários a operações normais. |
| Logs | Aplicação usa logger allowlistado e F005 foi encerrada no escopo de código/integração. Logs de PostgreSQL/Next/edge/collector são sinks distintos; collector, ACL e retenção reais não foram verificados. | stdout/stderr estruturados para collector escolhido; redaction, ACL, retenção e expurgo configurados por fonte. |
| Backups | Nenhum backup/restore da infraestrutura escolhida foi demonstrado. Snapshot disponível não é prova de restauração. | Política automatizada compatível com RPO/RTO aprovados, cópia independente do host e restauração ensaiada antes de dados comerciais. |
| Conexões e escala | Pool atual permite até 10 conexões por processo. Rate limit Better Auth é em memória por processo; réplicas ou reinícios mudam sua efetividade. | Começar com uma instância lógica e dimensionar o total potencial de conexões antes de expandir. Se serviço distribuir processos, demonstrar rate limit compartilhado ou aceitar formalmente o comportamento. |

## 3. Arquitetura recomendada — Alternativa A

```text
Navegador ── HTTPS ──► DNS + proxy/edge gerenciado
                              │ TLS, redirect HTTP→HTTPS, HSTS
                              │ origem privada; forwarded headers confiáveis
                              ▼
                     Aplicação CRM em Node.js
                     Next.js 16 + Better Auth
                     CSP nonce no Proxy da aplicação
                              │ rede privada + TLS quando remoto
                              ├────────► PostgreSQL gerenciado
                              │          sessões, CRM, audit_logs
                              ├────────► job separado de migrations
                              └────────► collector de logs do destino
```

Começar sem serviços auxiliares não exigidos pelo produto: sem filas, object storage, cache compartilhado ou provedor de e-mail. Manter uma instância lógica do app até definir escala e testar a relação entre processo, rate limit e pool. “Instância lógica única” não pode ser presumida apenas pelo plano comercial: é preciso confirmar se o serviço usa workers/processos adicionais, scale-to-zero ou réplicas automáticas.

Condições para aprovar A:

- runtime Node que suporte `node:crypto`, Next Proxy e renderização dinâmica; origem do app não acessível publicamente quando o serviço permitir restringi-la;
- PostgreSQL compatível e privado, conectividade segura, grants distintos para app e migration, e limites de conexão suficientes;
- configuração separada de build/runtime e secret store com ACL demonstrável;
- um owner claro para domínio, configurações, logs e decisão de release;
- backup exportável ou recuperável e restore verificável em ambiente separado;
- política de logs com destino, redaction, ACL e retenção configuráveis;
- preço, limites de execução, armazenamento, rede, logs, backup e restore confirmados dentro do teto aprovado.

Se o serviço não satisfizer qualquer condição, não inferir compatibilidade. Comparar outro serviço ou voltar à decisão humana sobre B. A SEC-02A já identificou que A tende a exigir menos operação de sistema/DB, sem avaliar um fornecedor concreto.

## 4. Alternativa de implantação — B: VPS

Uma VPS pode hospedar proxy/TLS, app Node em container e PostgreSQL em container separado. Publicar somente o proxy; manter app e banco em redes internas, sem porta pública do PostgreSQL. Separação em containers e roles reduz exposição entre processos, mas não separa falha do host, storage, kernel ou operador.

| Aspecto | Alternativa A: serviços gerenciados | Alternativa B: VPS autogerida |
|---|---|---|
| Operação | Provedor mantém componentes contratados; o projeto segue responsável por aplicação, dados, IAM, configuração, migrations e análise do contrato. | Operador do projeto responde por OS, runtime, containers, firewall, TLS/proxy, DB, patches, disponibilidade e incidentes. |
| Manutenção | Menor trabalho de sistema/DB; integração e limites variam por provedor. | Mais controle e portabilidade, com rotina contínua de patch, monitoramento e recuperação. |
| Segurança | Responsabilidade compartilhada; validar isolamento de rede, IAM, logs, suporte e modelo de dados do serviço. | Pode ser segura com operação consistente; configuração incorreta concentra impacto no host único. Podman rootless não substitui hardening/backup. |
| Backups/DR | Confirmar escopo, região, retenção, exportação, restore e custo; executar restore de prova. | Operador implementa backup fora da VPS, criptografia/acesso, cópia independente e restore em host/DB separado. Volume local sozinho não é backup. |
| Escala | Possível expandir, mas confirmar processos, conexões, rate limit e sessões compartilhadas antes de autoescalar. | Escala vertical simples; replicas exigem balanceamento, DB compartilhado, rate limit distribuído e release coordenado. |
| Portabilidade | Média; PostgreSQL e imagem padrão ajudam, mas rede, IAM e logs criam lock-in. | Alta para imagem OCI, PostgreSQL e migrations convencionais; mantém dependências de VPS/DNS/registrador. |
| Adequação ao MVP | Recomendação condicional enquanto não existe owner de infraestrutura documentado. | Adequada somente se houver owner que aceite as responsabilidades e a carga de operação. |

Não há preços ou capacidades comerciais atualizados neste documento. Orçamento e serviços precisam ser cotados/confirmados após decisão do modelo; nenhum fornecedor específico está recomendado.

## 5. Impactos de renderização dinâmica e CSP

A SEC-02B.5 tornou o root layout dinâmico para garantir nonce CSP individual por request. Efeito observado: todas as rotas, inclusive `/` e `/_not-found`, são geradas sob demanda no build. Não há evidência de problema de desempenho, mas HTML deixa de se beneficiar de cache estático de build e consome CPU/memória por renderização. O impacto de latência e custo deve ser medido, não presumido.

Estratégia de medição para homologação representativa:

1. Usar exatamente o artefato e a topologia candidata, com proxy/TLS e banco de homologação; nenhum dado real.
2. Medir `/login`, redirect de rota protegida e dashboard autenticado, em carga sintética aprovada, com cenários cold start e aquecido.
3. Registrar p50/p95/p99 de TTFB/resposta, requisições concluídas/erro, CPU/memória do app, conexões/espera do pool e custo estimado no perfil de uso aprovado.
4. Separar HTML autenticado/personalizado de assets versionados. Validar `Cache-Control` e CDN: não compartilhar cache de HTML autenticado ou resposta com estado de sessão; assets imutáveis podem ter política própria. Não cachear CSP/nonce de um request como se fossem reutilizáveis.
5. Repetir com comportamento do edge habilitado e confirmar que nonce por resposta, CSP efetiva, headers e headers forwarded permanecem coerentes. `connection()` não deve ser “otimizado” removendo a renderização dinâmica sem redesenhar a CSP e repetir a validação.
6. Antes de medir, o responsável aprova metas de latência, erro, uso de CPU/memória, pool e custo. Não há thresholds de negócio definidos; não fixar metas numéricas por suposição.

A aplicação é a única fonte de `Content-Security-Policy` para os documentos abrangidos pelo Proxy. O Next precisa receber a CSP encaminhada no request para extrair o nonce e marcar scripts/estilos. O proxy/edge deve preservá-la e não adicionar CSP ou Report-Only concorrente. A SEC-02B.5 não aplica CSP a APIs, assets, prefetch e downloads pelo matcher atual; decidir e documentar a fronteira completa no desenho de homologação, sem apagar essa delimitação por configuração genérica do edge. HSTS tem um único owner no edge que termina TLS.

## 6. Matriz de responsabilidades

“Operador” é papel ainda sem pessoa designada. Em A, o provedor executa somente o que estiver incluído e confirmado no serviço; em B, o papel operacional é do projeto.

| Controle | Aplicação | Provedor / plataforma | Operador / responsável do projeto | Evidência de homologação |
|---|---|---|---|---|
| Node/Next e release | Mantém runtime compatível, build e comportamento das rotas | Disponibiliza runtime, recursos, logs e modelo de execução contratados | Fixa artefato/candidato, aprova variáveis e janela | Versões/artefato identificados; build/start, health e erro verificados |
| TLS e HTTPS | Better Auth recebe URL/cabeçalhos confiáveis corretos | Edge/proxy termina TLS, renova certificado e redireciona HTTP, conforme produto | Controla DNS/domínio, valida origem direta e cadeia de confiança | Handshake válido e redirect HTTPS sem expor origem |
| HSTS | Não duplicar header de edge | Um edge é fonte autoritativa | Aprova host/idade/escopo; avalia subdomínios antes de ampliar | Resposta HTTPS capturada sem duplicidade; nenhuma política ampla sem decisão |
| CSP e nonces | `src/proxy.ts` produz CSP/nonce por documento; root dinâmico | Preserva headers encaminhados e não acrescenta CSP conflitante | Configura forwarding/cache sem mudar nonce; confere CDN/headers | Uma CSP enforced, nonce novo por resposta, sem violações não explicadas nos fluxos |
| Cookies e sessão | Better Auth define atributos e valida sessão/autorização | Não remove atributos nem permite cache compartilhado inadequado | Confirma `NODE_ENV=production`, URL/origin e HTTPS | Cookie Secure/HttpOnly/SameSite/Path sem expor valor; login, expiração/logout |
| Segredos | Consome env sem imprimir valor | Fornece secret store e controles de acesso contratados | Cria, autoriza, rotaciona e separa build/runtime; não injeta segredo real no builder | ACL/inventário redigido, rotação ensaiada e ausência em logs/artifact |
| PostgreSQL e privilégios | Usa DML mínimo e conexão configurada | Provedor opera serviço, patches/storage/rede conforme contrato | Revisa grants, conexão privada/TLS, capacidade e usuário | Identidade/grants efetivos; sem DDL com role app; conexão restrita |
| Migrations/bootstrap | Mantém SQL/Drizzle e compatibilidade de schema | Oferece mecanismo de job ou execução separada | Aprova execução, seleciona destino e credencial migration; não repete bootstrap | Job isolado, logs sem segredo, versão de schema e plano de compatibilidade |
| Backups/restore | Mantém formato restaurável e validação da app | Executa backup/snapshot somente segundo serviço contratado | Aprova RPO/RTO/retenção, confirma cópia e coordena restore | Restore em ambiente separado com dados sintéticos, duração e checklist |
| Logs, ACL e retenção | Emite JSON allowlistado; trata erros sanitizados | Expõe streams/collector e controles do plano contratado | Define owners, permissões, redaction, retenção/expurgo e resposta | Teste de acesso autorizado/negado, canários por sink e expurgo demonstrado |
| Auditoria de negócio | Persiste `audit_logs` transacionalmente no banco | Protege durabilidade do DB contratada | Define acesso e retenção de dados/auditoria | Evento positivo e rollback íntegro; acesso restrito e consistente |
| Monitoramento/incidentes | Expõe readiness e erros úteis sem PII | Disponibiliza métricas/alertas contratados | Define alerta, on-call, triagem, comunicação e ação de rollback | Simulação de alerta e runbook com responsável definido |

## 7. Estratégia para G-11 — logging operacional

Definição original SEC-02A: **logging redigido com ACL/retention verificáveis**. Status permanece **parcial**; a implementação e integração de F005 continuam encerradas no escopo histórico, sem reabertura sem nova evidência de falha.

Para avançar G-11 no ambiente escolhido, produzir evidência por sink, sem dados reais:

- inventário dos destinos e owners de logs da aplicação/Next, PostgreSQL, proxy/edge e collector; separar log operacional de `audit_logs` transacional;
- eventos com canários sintéticos em falhas pertinentes, verificando ausência de senha, token, cookie, e-mail ou valores de parâmetros onde não devam aparecer; distinguir texto/estrutura SQL de parâmetros efetivos e campos de autenticação;
- prova da redaction configurada em cada sink: argumento emitido pelo app não comprova redaction no PostgreSQL, edge ou collector;
- ACL por função/conta, acesso permitido e negado, trilha administrativa e revisão de quem pode consultar/exportar;
- política documentada de retenção e expurgo para cada fonte, com evidência operacional de expiração/deleção e backup de logs, se houver;
- export/cópia de logs não deve incluir Authorization, Cookie, payload comercial integral, URL de conexão ou credenciais;
- owner responsável, canal de incidente, investigação, acesso emergencial e revogação de acesso.

Não aprovar G-11 apenas porque F005 sanitiza logs da aplicação ou porque uma execução não encontrou canários. ACL, retenção, redaction dos sinks externos e administração de collector ainda dependem do destino real.

## 8. Estratégia para G-15 — release, CSP e tenant

Definição original SEC-02A: **testes de release e limites de CSP/tenant documentados**. Status permanece **parcial**. A evidência SEC-02B.5 (CSP enforced em build de produção isolado e 47/47 E2E) é relevante, mas não comprova a arquitetura final, o candidato à publicação ou todo o isolamento entre organizações.

No release candidate escolhido, exigir:

- identificar commit/revisão, lockfile, versão de Node/Next, artefato imutável, configuração não secreta, migrations incluídas e checksums; comprovar que teste e artifact correspondem ao mesmo candidato;
- CSP enforced de ponta a ponta na topologia escolhida: header único em documentos, nonce por resposta, aplicação de nonces pelo Next, CDN/cache e edge sem duplicação, fluxos funcionais e violações classificadas. Preservar CSP sem `unsafe-eval`/`unsafe-inline` em produção;
- regressão de release com build, typecheck, lint, unitários, integrações pertinentes, Chromium/E2E e resultados discriminados (passou, rerun, falhou, skipped, bloqueado, timeout). Investigar cada falha e preservar evidência sanitizada;
- executar M-01 e I-01 gates/preflights aplicáveis em PostgreSQL descartável cuja identidade/destino foi validada. Os 35 skips de 03/11/2026 anotados na SEC-01 não contam como aprovação; os 47 E2E mais recentes tampouco substituem essas provas gated;
- usar organizações e usuários sintéticos independentes A/B, registros identificáveis por tenant, sessões válidas e papéis distintos. Testar leitura, pesquisa/listagem, detalhe por ID direto, criação/atualização/exclusão, Server Actions/handlers e exportação CSV; para cada operação, validar negação de cross-tenant e de usuário sem membership/role;
- testar seleção/switch de organização, sessão expirada/removida, membership removida, IDs válidos de outra organização, respostas de erro e ausência de efeitos colaterais ou audit events indevidos;
- comprovar coerência tenant de relações entre cliente/oportunidade/tarefa (I-01), atribuição a membro (M-01) e escrita/auditoria transacional com rollback onde aplicável; validar ausência de dados da outra organização nas respostas, exports, caches e artifacts;
- rever a cobertura para cada rota e Server Action autorizada e documentar os limites não testados. Não inferir que a suíte agregada prova todos os endpoints.

Só atualizar G-15 após evidências do candidato e ambiente de homologação representativo, cobrindo CSP, release e tenant; não modificar status nesta etapa de preparação.

## 9. Plano recomendado de release

Nenhuma etapa abaixo foi iniciada nesta SEC-02C.0.

1. **Aprovar arquitetura e critérios:** decisão humana registrada; confirmar limites de custo, disponibilidade, RPO/RTO e owners.
2. **Escolher o provedor/modelo:** confirmar documentação, limites, runtime Node, Next dynamic rendering, rede, IAM, logs, backups e cobranças.
3. **Preparar homologação representativa:** hostname de homologação, TLS, rede privada, collector, PostgreSQL, secrets de homologação; sem produção e sem dados reais.
4. **Configurar segredos e permissões:** ambientes segregados, ACL mínima, origem/trusted origin canônica e processo de rotação. Configurar build só com valores sintéticos não produtivos quando necessário.
5. **Configurar PostgreSQL:** versão/compatibilidade, rede, TLS, limites de conexão, roles `app` e `migration` separadas, backups e logs por fonte.
6. **Validar migrations:** identificar schema inicial e migration set; executar em DB descartável primeiro, validar grants/logs e estratégia de compatibilidade; só aplicar em homologação aprovada por job separado.
7. **Validar backup e restauração:** produzir backup da homologação e restaurar em DB separado. Registrar integridade, duração e aderência aos RPO/RTO aprovados.
8. **Configurar HTTPS e headers:** validar DNS/certificado/redirect, owner único de HSTS, CSP da aplicação, forwarding do nonce e ausência de políticas conflitantes.
9. **Validar autenticação e sessão:** login válido/inválido, sessão, Secure cookie, logout, expiração, origem confiável e comportamento Better Auth no runtime escolhido.
10. **Validar CSP enforced:** capturar headers em wire, observar violações em Chromium, validar login, rotas privadas, forms, temas, navegação, APIs/assets de acordo com escopo, negative probes locais e política de cache.
11. **Testar isolamento tenant:** M-01/I-01, autorização por endpoint/ação/ID, CSV e cenários adversariais descritos na seção G-15.
12. **Executar regressão automatizada:** usar mesmo artefato candidatado, 1 worker inicialmente; aumentar paralelismo somente se necessário/representativo; registrar retry/falha/skip/timeout sem mascaramento.
13. **Verificar logs:** canários sintéticos em cada sink, ACL, redaction, retenção/expurgo e alertas; conferir G-11 sem reabrir F005 fora do escopo.
14. **Avaliar desempenho:** medir cenário representativo com limites aprovados, analisar impacto de SSR dinâmico, banco/pool e CDN; não otimizar sem evidência.
15. **Revisar gates e riscos:** anexar resultados sanitizados, marcar dependências de infraestrutura e obter revisão de segurança/qualidade/owner operacional.
16. **Decisão Go/No-Go:** somente responsável autorizado, com critérios e rollback verificados, toma a decisão. Esta preparação não concede autorização de deploy.

## 10. Estratégia de rollback e recuperação

- Versionar e reter o artefato anterior validado; promover candidato imutável e manter rota operacional para voltar o tráfego ao artefato anterior. Testar essa mudança em homologação antes de qualquer release.
- Projetar migrations no padrão expand/contract: primeiro alterações aditivas compatíveis com aplicação anterior; só remover/renomear colunas depois de janela e prova de que nenhuma versão antiga depende delas. Migration destrutiva sem rollback/restauração demonstrados bloqueia Go.
- Em falha funcional, CSP, auth ou tenant, interromper a promoção e direcionar tráfego ao artefato anterior ou modo de manutenção do edge, conforme mecanismos reais do destino. Preservar logs, auditoria e evidências; não apagar dados nem repetir migration às cegas.
- Ao reverter aplicação, confirmar compatibilidade do schema e da sessão. Não “desfazer” automaticamente migration já usada por versão nova; seguir script reverso previamente testado ou manter migration aditiva.
- Em corrupção/perda de dados, seguir plano de recuperação aprovado: restaurar backup em banco separado, verificar integridade e decidir ponto de corte conforme RPO/RTO. Restauração sobre a base ativa pode perder escritas após o backup; exige decisão explícita e comunicação do responsável.
- Após rollback/restore, repetir smoke de autenticação, sessão, acesso tenant, auditoria e integridade. Declarar incidente encerrado só após validação e registro de causa/ações. Não há plano automatizado demonstrado hoje.

## 11. Decisões pendentes do responsável

Nenhum valor abaixo é conhecido ou inventado neste documento.

| Decisão humana | Recomendação inicial | Risco se não for decidida |
|---|---|---|
| Orçamento mensal total | Definir teto que inclua app, DB, tráfego, logs, backup, DNS/domínio, impostos e operação; obter cotação atual depois. | Escolha de arquitetura incompatível com caixa ou custos incidentais não percebidos. |
| Modelo de hospedagem | Aprovar A gerenciada para minimizar toil; aprovar B apenas se houver owner operacional explícito e orçamento/hora para operar. | Sem owner, patching, restore e incidentes ficam sem responsável; A sem due diligence mantém risco de dependência/limites ocultos. |
| Domínio | Usar domínio controlado pelo projeto/organização e com acesso administrativo definido; nome ainda não informado. | Trusted origin, URL Better Auth, cookies, TLS e HSTS não podem ser fechados com host estável. |
| Usuários iniciais | Informar número de usuários ativos/concurrentes esperado e fase piloto; até isso, dimensionar conservadoramente e não habilitar escala automática sem medição. | Pool, limites e capacidade podem ser insuficientes ou pagar-se recursos sem necessidade. |
| Quantidade de organizações | Definir número previsto no piloto e padrão de crescimento; usar isolamento sintético A/B em homologação independentemente do número inicial. | Cobertura/volumes e expectativa de tenant não podem ser dimensionados; teste de isolamento ainda é obrigatório. |
| Disponibilidade | Para MVP sem SLA informado, começar sem HA deliberada apenas se manutenção eventual for aceita; definir janelas, RPO/RTO e comunicação. | Interrupção ou perda de dados sem tolerância acordada; decisão de custo/HA indefinida. |
| Responsabilidade operacional | Designar papéis de app, DB, segurança/logs, backup/restore e incidente, com substituição/cobertura. Em VPS precisa haver owner on-call. | Falhas e tarefas de recuperação sem dono, especialmente em B. |
| Política de backup | Aprovar RPO/RTO, frequência, retenção, cópia independente/região quando necessário e periodicidade de restore drill, com base no valor dos dados. | Backup pode ser insuficiente, irrecuperável ou incompatível com perda tolerável. |
| Retenção de logs | Definir janela mínima por aplicação, PostgreSQL, edge e collector, com ACL/expurgo e necessidade de investigação; evitar coleta de PII desnecessária. | G-11 não fecha e retenção excessiva ou curta aumenta risco de privacidade ou falta de evidência. |

## 12. Recomendação final

Submeter ao responsável **Alternativa A, uma instância lógica Node.js gerenciada mais PostgreSQL gerenciado**, para aprovação condicional; não selecionar fornecedor nesta etapa. Ela está alinhada ao monólito atual, ao uso de PostgreSQL durável e à prioridade de baixo esforço operacional, sem adicionar serviços sem necessidade. Antes de aprovar, validar os requisitos da seção 3, cotar o custo total vigente e confirmar modelo de execução, single-instance efetiva, backup/restore, rede, secrets e logs.

Manter a **VPS** como alternativa caso orçamento/termos de A não sejam aceitáveis, desde que o responsável aceite e atribua a operação completa e o teste de recuperação. Não escolher hospedagem própria sem requisito de controle local demonstrado.

Após decisão humana, iniciar a SEC-02C com o provedor, domínio, custo, escala e owner explicitamente definidos e executar primeiro a homologação representativa. Manter G-11 e G-15 parciais até suas evidências originais serem satisfeitas. Não houve alteração arquitetural ou de código; o CRM não foi declarado pronto para publicação.

## Referências

- [SEC-01 — status consolidado](SEC-01-consolidated-status.md)
- [SEC-02A — arquitetura-alvo e critérios originais dos gates](SEC-02A-target-architecture.md)
- [SEC-02B.0 — build e contrato de configuração](SEC-02B-00-build-preflight.md)
- [SEC-02B.4 — Chromium e baseline de regressão](SEC-02B-04-chromium-stability.md)
- [SEC-02B.5 — CSP enforced e regressão 47/47](SEC-02B-05-csp-enforcement.md)
