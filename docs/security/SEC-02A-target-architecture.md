# SEC-02A — Arquitetura-alvo e responsabilidades operacionais

**Data:** 2026-11-03  
**Natureza:** proposta técnica condicional; não aprovada para produção.  
**Escopo:** inspeção da implementação e da documentação; nenhum deploy, teste, container, migration, banco ou segredo foi acessado ou iniciado. Nenhum código/dependência foi alterado.

## 1. Resumo executivo

O CRM é compatível com execução Node.js e PostgreSQL convencional: Next.js 16.4.3, Better Auth com adapter Drizzle, banco PostgreSQL, migrations SQL versionadas e configuração por variáveis de ambiente. O MVP está documentado como monólito modular, um deploy e uma base. Não há upload de arquivos, storage de objetos, filas, serviço de e-mail ativo ou infraestrutura de produção declarada.

### Proposta inicial para decisão

Usar **uma instância lógica Node.js da aplicação e PostgreSQL gerenciado**, mantendo o banco privado e acessível somente pela aplicação e pelo processo controlado de migrations. O app deve rodar como runtime Node (não somente Edge), com imagem/container OCI ou pacote equivalente e configuração explícita. Um proxy/edge suportado pelo destino termina TLS, redireciona HTTP para HTTPS e é o único dono de HSTS. A aplicação fornece headers específicos do Next e `Secure` nos cookies via `NODE_ENV=production`. Segredos vêm do mecanismo da plataforma; logs saem por stdout/stderr para um destino com controles definidos.

Esta proposta favorece manutenção e recuperação de banco sem escolher fornecedor. Sua viabilidade depende de um serviço que aceite Node/Next e PostgreSQL compatível, conexão privada/TLS, backup recuperável, configuração de uma instância lógica ou rate limiting compartilhado, e custo que o responsável aceite. Os limites comerciais e preços não foram pesquisados.

Se o custo dos serviços gerenciados for incompatível com o orçamento, a alternativa de menor infraestrutura externa é **uma VPS com containers separados para app e PostgreSQL**, proxy TLS e banco não publicado. Ela reduz dependência de plataforma e permite controle, mas transfere integralmente patching, firewall, backup, monitoramento e resposta operacional ao responsável. Isso não é automaticamente mais simples ou seguro.

**A arquitetura não está aprovada.** Hospedagem, domínio, orçamento, disponibilidade, volume de usuários e responsável por operações ainda precisam de decisão explícita. O CRM continua sem prontidão comprovada para produção.

## 2. Requisitos identificados

“Demonstrado” significa suportado pelo código ou por execução documentada; não significa automaticamente comprovado em produção.

| Área | Requisito demonstrado | Estado e decisão em aberto |
|---|---|---|
| Runtime | Next.js 16.4.3, React 19.3.1, Better Auth/adapter Drizzle 1.7.14, Drizzle ORM 0.45.4, `pg` 8.x; scripts `build`, `start`, lint e testes. Node 24.22.2 foi usado no Bazzite/Distrobox. A implementação usa `pg` e `node:crypto`, portanto precisa do runtime Node. | **Demonstrado localmente.** Versões concretas vêm do manifest/lock e histórico de execução; Node 24 é a escolha compatível com o ambiente validado. Política de patch do runtime depende do serviço. Edge-only não atende diretamente às dependências atuais. |
| Aplicação | Next.js App Router, monólito modular, Server Components e handlers/server actions. | **Implementado.** A arquitetura de execução/deploy é proposta, sem provedor escolhido. |
| Autenticação | Better Auth 1.7.14, adapter Drizzle/PostgreSQL, plugin Organization, `BETTER_AUTH_SECRET` com validação local de comprimento mínimo 32 e `BETTER_AUTH_URL` para `baseURL`/trusted origin. Signup público normal desabilitado; bootstrap inicial separado. | **Integrado no teste descartável.** Origem pública, secret manager, verificação de host/proxy e onboarding inicial de produção não definidos. |
| Sessões | Better Auth mantém sessão no adapter PostgreSQL; fluxo de criação/consulta/logout foi testado em PostgreSQL descartável. | **Persistência demonstrada localmente.** `Secure` depende de `NODE_ENV=production`; HTTPS e atributos de cookie em endpoint TLS não foram comprovados. |
| Banco | PostgreSQL 18 escolhido; `pg.Pool`; Drizzle ORM; migrations SQL versionadas; `DATABASE_URL`. | **Testado em instância descartável.** PostgreSQL de produção, conectividade, TLS e roles ainda não definidos. |
| Persistência | Usuários, organizações, dados do CRM e `audit_logs` são armazenados no PostgreSQL. A arquitetura local prevê volume persistente. | **Persistência de aplicação demonstrada no teste.** Sem decisão de serviço, volume, durabilidade, HA, retenção ou recuperação operacional. |
| Conexões | Pool local com `max: 10`, timeout de conexão 5 s e idle timeout 30 s. | **Configuração implementada.** Em escala, capacidade total potencial cresce com instâncias; dimensionar contra limite do DB antes de replicar. |
| Variáveis | `.env.example` lista `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`. Bootstrap inicial usa `CRM_OWNER_*` e `CRM_ORGANIZATION_*`. | **Configuração local documentada.** Fonte, escopo, rotação e acesso a segredos de deploy não definidos. As variáveis de bootstrap são de uso único e não devem ficar no runtime regular. |
| Build e ambiente | A rota Better Auth chama `getAuth()` no nível do módulo. `getAuth()` valida `BETTER_AUTH_SECRET` e, ao montar o adapter, `getDb()` cria pool e exige `DATABASE_URL`. O pool não precisa abrir conexão até uma consulta. | **Inferência estática forte:** build que avalie a rota provavelmente precisa de valores dessas variáveis mesmo sem consultar o banco. O build de produção ainda precisa confirmar esse comportamento; não há necessidade demonstrada de apontar para banco real durante build. |
| Migrations | `drizzle-kit migrate`; configuração local carrega env via `@next/env`; configuração de teste valida destino isolado. | **Implementado.** Migration deve ser etapa/job controlado separado do start web; credencial de migration e role de runtime separadas ainda não estão configuradas. |
| Serviços externos | Não há provider de e-mail configurado; convites deliberadamente lançam erro informando que dependem de serviço de e-mail. Fontes tipográficas são dependências do projeto. | **Nenhuma dependência externa de e-mail/object storage comprovada.** Não habilitar convite/reset que dependa de e-mail antes de escolher e testar serviço. |
| Armazenamento de arquivos | Não foi localizada funcionalidade de upload ou storage de objetos. | **Não aplicável ao MVP demonstrado.** Reavaliar se uploads forem adicionados. |
| Auditoria | Eventos de negócio em `audit_logs`, em transações dos fluxos cobertos; F001 positivo/rollback validado no PostgreSQL descartável. | **Evidência de integração disponível.** Tabela de auditoria não substitui retenção de logs técnicos e precisa de política de acesso/retention de dados quando o destino estiver definido. |
| Logs técnicos | `safeLogger` e adaptador Better Auth emitem JSON allowlistado em `console`; F005 integrada confirmou ausência de canários nos streams capturados. | **F005 encerrada no escopo do código/integração.** Plataforma, logs PostgreSQL, collector, ACL, retenção e redaction operacionais não validados. |
| Execução e testes | Typecheck/lint/unit/integration e Playwright estão configurados. Run 03/11: 103 unitários, 195 integrações, 35 skips M-01/I-01, E2E 46/47 mais execução isolada do visual. | **Validação histórica em Bazzite.** Não foi executada novamente nesta SEC-02A; gates operacionais ainda faltam. |

### Atenção sobre build sem segredos reais

O import da rota Better Auth pode exigir `BETTER_AUTH_SECRET` e `DATABASE_URL` durante `next build`, mesmo que nenhuma conexão seja aberta. A homologação deve confirmar a exigência em cópia temporária sem nenhum `.env*`, fornecendo um segredo descartável e uma URL sintética que não aponte a serviço ativo; impedir egress durante a fase de build se tecnicamente viável. Se build exigir somente parsing/configuração, isso não justifica entregar credenciais de produção ao builder. Se o serviço escolhido exige build sem tais variáveis, tratar eventual alteração de inicialização lazy como mudança de arquitetura futura, somente após reproduzir a falha e aprovar escopo.

## 3. Comparação de arquiteturas

Avaliação qualitativa e independente de fornecedor. Não contém preço, SLA ou capacidade comercial, que dependem de cotação e documentação do destino escolhido.

| Critério | 1 — VPS | 2 — Serviços gerenciados | 3 — Infraestrutura própria |
|---|---|---|---|
| Forma típica | Uma VPS com proxy reverso e containers separados para Next e PostgreSQL; app e DB podem começar no mesmo host, com rede interna. | Runtime Node/Next em plataforma de aplicação e PostgreSQL como serviço gerenciado, conectados por rede privada/TLS quando suportado. | Servidor físico/virtualização e rede sob administração direta; app, proxy e DB instalados/operados pelo responsável. |
| Complexidade inicial | Média: instalar/atualizar OS, Podman ou runtime, proxy, TLS, firewall, DB, backups e monitoramento. | Baixa a média: menos tarefas de sistema/DB; ainda exige configuração de app, rede, segredos, logs e deploy. Integrações diferem por fornecedor. | Alta: tudo da VPS mais hardware, energia/rede, redundância, capacidade, reposição e recuperação do local. |
| Segurança | Boa se endurecida e operada; erro de configuração concentra impacto no host único. | Responsabilidade compartilhada: provedor opera parte da plataforma; aplicação, IAM, configurações e dados continuam sob responsabilidade do projeto. Garantias precisam ser verificadas no contrato e na configuração. | Pode ser forte com operação madura; maior superfície e tarefas contínuas sob controle direto. Não é inerentemente mais seguro por estar “própria”. |
| Custo operacional qualitativo | Baixo custo de entrada provável, mas horas de operação e recuperação ficam com o responsável; custo de indisponibilidade potencial no host único. Sem preços verificados. | Pode reduzir esforço humano e incluir serviços operacionais; preço/uso mínimo e cobrança por tráfego/backup variam. Comparar após orçamento e carga definidos. | Alto custo fixo e variável de manutenção, energia, conectividade e redundância; não estimado. |
| Manutenção | Atualizações de OS, container base, Node, PostgreSQL, proxy e certificados ficam com operador. | Provedor mantém parte do sistema; projeto ainda atualiza dependências, app, schema e configurações. | Totalmente do operador, incluindo hardware/firmware, rede e software. |
| Escalabilidade | Vertical simples; mais hosts/replicas exige banco compartilhado, balanceador, rate limiter e gestão de release. | Pode facilitar escala de app/DB, mas comportamento real, limites e sessão devem ser verificados. Autoescalar app pode expor F002 (rate limit por processo). | Depende da capacidade adquirida e desenho de rede; expansão física tende a exigir mais planejamento. |
| Recuperação | Restauração depende de backup fora do host e procedimento testado; volume no mesmo host não é backup. | Snapshots/restore podem ser disponibilizados pelo serviço, mas retenção, região, RPO/RTO e restore efetivo precisam ser confirmados. | Exige backup externo/off-site, hardware alternativo e plano de recuperação implementados pelo operador. |
| Portabilidade | Alta com OCI/Podman, PostgreSQL padrão, SQL migration e variáveis documentadas. | Média: app pode ser portátil; networking, IAM, build e serviços de logs/DB criam dependência de plataforma. Usar PostgreSQL padrão e evitar SDKs específicos reduz lock-in. | Alta no software, condicionada a hardware e ferramentas próprias de cada local. |
| Dependência de fornecedor | Média (provedor da VPS, DNS, registrador e certificados). | Maior para rede, runtime e controles gerenciados; manter backup exportável e container padrão reduz, mas não elimina lock-in. | Menor dependência de cloud específica, mas depende de operadora, ISP, hardware e fornecedores locais. |
| Adequação ao CRM MVP | Viável se houver pessoa com tempo e competência para operar host, backups, TLS e incidentes. Alinha com Podman existente. | **Melhor equilíbrio operacional condicional** se a plataforma cumprir os requisitos e o custo for aceito; reduz administração de PostgreSQL e recuperação. | Não recomendado para MVP sem requisito de soberania/isolamento local e equipe operacional; custo de complexidade sem necessidade demonstrada. |

### Recomendação comparativa

Começar a análise de fornecedores pela alternativa 2, limitada a um runtime Node compatível e PostgreSQL gerenciado, sem serviços extras. Ela tende a transferir tarefas de sistema/DB que hoje não têm owner documentado. Verificar se permite single instance lógica, rede privada, segredos e evidência de restore. Se custos/termos ou dependência forem inadequados, usar alternativa 1 apenas após o responsável aceitar explicitamente patching, operação e backup. A alternativa 3 permanece condicionada a requisito de controle local que ainda não existe.

## 4. Arquitetura recomendada (proposta não aprovada)

### Componentes

```text
Navegador
   │ HTTPS (porta pública única)
   ▼
DNS + proxy/edge do destino ── TLS, redirect HTTP→HTTPS, HSTS
   │ origin privado / encaminhamento confiável
   ▼
Uma instância lógica da aplicação — Node 24, Next.js 16, Better Auth
   │ PostgreSQL protocol sobre rede privada e TLS quando remoto
   ▼
PostgreSQL gerenciado — persistência e backups configurados/testados

Aplicação ── stdout/stderr estruturado ──► collector do destino
Migration job separado ── role de migration ──► PostgreSQL
```

`HSTS` aparece no proxy/edge porque essa camada é a proposta de terminação TLS; uma única camada deve ser configurada como fonte autoritativa. Os headers do `next.config.ts` seguem na aplicação. A CSP permanece Report-Only até análise das violações em build/runtime de produção representativo.

### Decisões técnicas iniciais

1. **Hospedagem:** serviço de aplicação compatível com Next.js em runtime Node 24; aceitar OCI/Node sem acoplar lógica do CRM ao SDK do fornecedor. Provedor não escolhido.
2. **Quantidade inicial:** uma instância lógica da aplicação, sem balanceamento/replicas deliberadas. Confirmar se a plataforma não escala horizontalmente de forma automática; caso escale, resolver compartilhamento de rate limit e manter sessões/segredo/configuração comuns.
3. **Proxy/TLS:** edge gerenciado da hospedagem, se disponível, terminando TLS; senão, proxy reverso explícito. Manter app não público diretamente quando o desenho permitir.
4. **HTTPS:** domínio escolhido, certificado válido, redirect HTTP→HTTPS no edge. Cookies `Secure` pelo Better Auth no runtime com `NODE_ENV=production`. Validar headers e host/origin de ponta a ponta.
5. **HSTS:** configurar apenas no edge TLS após o domínio e o redirect serem verificados. Iniciar com política conservadora para o host; `includeSubDomains`/`preload` dependem de análise e decisão próprias. Não adicionar simultaneamente na app sem política de duplicidade definida.
6. **PostgreSQL:** serviço PostgreSQL compatível com versão de schema testada, não publicado à internet, acessível apenas por rede da app e migration job. Uma base lógica; avaliar capacidade de conexões considerando `max=10` por processo.
7. **Persistência:** storage durável provido pelo DB gerenciado e snapshots/backup configurados; se VPS, volume persistente fora do ciclo efêmero do container e backup externo. Nunca usar o filesystem efêmero da app para dados importantes.
8. **Segredos:** secret store/variáveis protegidas do destino; `BETTER_AUTH_SECRET` aleatório com comprimento exigido, `BETTER_AUTH_URL` HTTPS canônico e `DATABASE_URL` privada/TLS. Valores distintos por ambiente. Não colocar segredo no artefato nem no log/build log.
9. **Logs:** stdout/stderr para collector escolhido; definir redaction, acesso mínimo, retenção e expurgo. Logs PostgreSQL e edge são fontes separadas. `audit_logs` é trilha de negócio transacional e fica no DB.
10. **Backup/recuperação:** definir retenção e RPO/RTO a partir de uso real; provar restauração em homologação antes de dados de clientes. Snapshot anunciado não conta como restore testado.
11. **Atualizações/migrations:** build versionado e imutável; migration explícita em job separado com credencial de migration; aplicação usa role DML mínima. Rollback/compatibilidade de schema deve ser planejado antes de migration destrutiva. Bootstrap OWNER é operação de primeira instalação, não parte do start.
12. **Expansão:** primeiro dimensionar verticalmente aplicação/DB e pool; depois considerar réplicas. Multi-instance exige rate limiter compartilhado, origem IP confiável e configuração/secrets consistentes. Avaliar cache Next apenas se a funcionalidade passar a depender dele.

## 5. Matriz de responsabilidades técnicas

Papéis abaixo são funções de componente, não nomes de pessoas. Owner humano e contratos do provedor continuam a definir.

| Controle | Responsável técnico | Local de configuração | Evidência necessária |
|---|---|---|---|
| HTTPS | Proxy/edge ou reverse proxy definido pelo destino | Configuração de domínio/certificado/listener | Certificado válido, handshake e resposta HTTPS do hostname de homologação |
| HSTS | Mesmo proxy/edge que termina TLS (uma fonte autoritativa) | Política de response header no edge; alternativa app somente se edge não puder | Captura HTTPS sem duplicidade; escopo/idade revisados; subdomínios avaliados antes de ampliar |
| Cookies Secure | Better Auth/app, condicionado ao runtime `NODE_ENV=production`; operador configura ambiente e TLS | Better Auth `advanced.useSecureCookies` + runtime; edge não deve remover atributo | `Set-Cookie` sanitizado em HTTPS com `Secure`, HttpOnly, SameSite e Path; sem valor do cookie |
| Autenticação | Aplicação CRM/Better Auth | `src/lib/auth.ts`, origem/secret no runtime | Fluxos de login válido/inválido, signup desabilitado, trusted origin e erros em homologação |
| Sessões | Better Auth + PostgreSQL; aplicação valida contexto/authorization | Adapter PostgreSQL, schema `session`, configuração comum de instâncias | Cria/consulta/revoga; sessão funciona entre instâncias se houver replicas; expiração definida/verificada |
| Segredos | Secret manager do destino, administrado por owner operacional a definir | Configuração protegida do runtime/build; nunca no repo/artefato | Inventário de nomes, ACL, rotação, ausência em artifact/log; valor nunca registrado |
| Permissões PostgreSQL | DBA/serviço PostgreSQL e processo separado de migration | Roles/grants no DB; credenciais separadas do app | Consultas de privilégios efetivos; app sem superuser/DDL; teste DML e migration separado |
| Backups | Serviço PostgreSQL ou operador da VPS, com validação do responsável por dados | Política do DB/backup externo | Política/retention, relatório de backup e restore testado com dados sintéticos |
| Logs | Plataforma/collector; app emite eventos allowlistados | Configuração stdout/stderr, PostgreSQL e edge em sistemas separados | Inventário de sinks, canários sintéticos, redaction e ACL demonstradas |
| Retenção | Owner do collector/DB definido pelo projeto | Configuração de retenção/expurgo por fonte | Regra documentada e teste/evidência de expurgo; distinção de log técnico e auditoria de negócio |
| Monitoramento | Plataforma e operador da aplicação | Health checks, alertas e métricas do serviço | Alertas testados sem expor PII, health/readiness e processo de resposta documentados |

## 6. Modelo de segurança

### Rede

- Publicar apenas HTTPS pelo proxy/edge. O processo Next deve aceitar tráfego apenas do proxy/rede de app quando suportado; impedir acesso público direto ao listener de origem.
- PostgreSQL sem porta pública; permitir conexão apenas da aplicação e do job de migrations por rede privada/ACL. No caso de VPS, containers de app, proxy e DB em redes separadas; apenas proxy publica 80/443, e DB permanece na rede interna.
- Acesso administrativo por canal controlado (por exemplo, VPN/bastion ou console autenticado do provedor), com MFA e menor privilégio a confirmar na escolha. Não expor SSH/DB amplamente. A medida exata depende do destino.
- TLS externo obrigatório. App→DB deve usar TLS quando atravessar rede que não seja host/rede privada confiável; verificar certificado/sslmode da configuração efetiva. Hoje `pg.Pool` não define explicitamente `ssl`, então a decisão depende da URL/provider e falta prova.
- Forwarded headers devem ser escritos pelo proxy confiável e não aceitos de clientes externos sem normalização; isso afeta host/origin, redirects e IP usado em rate limit.

### Autenticação e sessões

- Usar `BETTER_AUTH_URL` HTTPS exato do ambiente para `baseURL` e `trustedOrigins`; evitar wildcard. A configuração atual tem default localhost para desenvolvimento, portanto produção precisa de override explícito.
- `NODE_ENV=production` é condição necessária para `Secure` pela configuração atual, mas requer captura HTTPS real. Confirmar HttpOnly, SameSite, Path e ausência de Domain amplo injustificado; o teste local anterior mostrou somente comportamento HTTP.
- Não confiar em UI para autorização. Better Auth resolve sessão no banco; aplicação verifica membership/papel e escopo organizacional server-side conforme os fluxos já implementados.
- Instância única simplifica rate limit em memória, embora restart zere contadores. Se a plataforma reiniciar ou distribuir para várias instâncias, o limite precisa ser aceito/alterado conscientemente. Sessões PostgreSQL podem ser lidas por outra instância se a conexão e segredo forem comuns; teste cross-instance somente se a topologia alvo usar replicas.
- Convites e reset por e-mail permanecem fora da capacidade demonstrada; não habilitar sem serviço de e-mail, configuração segura e teste dos fluxos.

### PostgreSQL e auditoria

- Separar usuário de migration (DDL conforme necessário) da identidade de runtime (DML mínimo em tabelas/sequências/funções necessárias). Não reutilizar superuser do provisionamento como `DATABASE_URL` da aplicação.
- Tratar segredo de banco em secret manager, restringir alcance de rede, exigir TLS quando remoto e rotacionar por procedimento testado. Não registrar URL nem valores de conexão.
- Persistir tabelas em serviço durável. Backup precisa de cópia recuperável fora do risco do host; medir restore em DB separado antes de confiar em snapshots.
- `audit_logs` permanece trilha de negócio vinculada a transações. Logs técnicos do PostgreSQL/Next/edge não substituem essa auditoria. Acesso de leitura e retenção dos dois tipos devem ser separados.

### Logs e resposta operacional

- Aplicação: `safeLogger` allowlist em stdout/stderr, sem objeto bruto/PII. Continuar testes com canários sintéticos no logger e Better Auth. F005 permanece encerrada dentro do escopo validado.
- Next/Node: inventariar eventos próprios do framework e do processo; controlar debug/verbosity de produção e recolher streams com permissões mínimas.
- PostgreSQL: revisar logs de erro/query/statement no serviço escolhido; desligar logging de parâmetros/dados sensíveis se não for requisito. O sink não herda sanitização de `safeLogger`.
- Edge/collector: mapear request logs e headers/cookies potencialmente registrados; remover Authorization/Cookie e payloads quando não necessários. Definir destinatários, ACL, retenção e alertas.
- Distinguir evento de auditoria transacional, telemetria operacional e logs de infraestrutura. Não enviar tokens, cookies, senhas, payload integral de CRM ou URL de conexão.

## 7. Estratégia de homologação no Bazzite

Não executar nesta etapa. Quando autorizada, usar uma cópia temporária e recursos efêmeros identificados; nenhum container/volume é criado por este documento.

### Isolamento e build

1. Criar cópia descartável excluindo `.env*`, `.git`, `node_modules`, `.next`, relatórios e dados. Não usar `drizzle.config.ts` ou bootstrap se sua carga automática de env não fizer parte do caso; migrations futuras usam config de teste que valida destino.
2. Iniciar cada processo com ambiente explicitamente construído e somente valores sintéticos: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL`, `NODE_ENV=production`; retirar `DATABASE_URL` herdada e validar destino antes de qualquer escrita. Não imprimir env.
3. Build com PostgreSQL descartável fechado/inacessível para confirmar se é necessário apenas criar Pool ou se o build realmente consulta DB. Se a build depender de conexão, registrar causa exata antes de qualquer alteração. Nunca fornecer segredo de produção ao builder.
4. Para app runtime, PostgreSQL rootless exclusivo, rede `internal`, armazenamento temporário (tmpfs/sem volume) e publicação apenas loopback quando necessário ao teste. O harness atual valida porta/DB/role fixos; conferir conflito de porta antes de executar e, se necessário, ajustar somente uma cópia descartável usando o mesmo guard. Confirmar container, DB, role, mounts, rede e vars sintéticas antes de migrations/escritas autorizadas em uma execução futura.
5. `.env.local` não entra na cópia; trabalhar fora do checkout e evitar comandos Next no diretório original para que carregamento automático de env não encontre arquivos locais sensíveis.

### HTTPS, autenticação e sessões

1. Proxy temporário termina TLS com CA local de teste/domínio de homologação; app não fica diretamente acessível fora da rede de teste. Gerar certificados/keys efêmeros fora do repositório e removê-los ao fim.
2. Iniciar build/start production-like; observar logs sanitizados e status. Medir HTTP→HTTPS, HSTS apenas no HTTPS, headers de documentos/API/erro/redirect/asset/CSV e preservar `private, no-store`.
3. Usar OWNER sintético via bootstrap isolado, credenciais sintéticas e cookies guardados apenas em memória do Playwright. Verificar login válido/inválido, sessão, logout, invalidation, origem válida/host rejeitado, atributos sem imprimir `Set-Cookie` completo.
4. Signup normal permanece desabilitado; não afrouxar para testar. Convites/reset ficam fora enquanto e-mail não está configurado.

### Banco, logs, auditoria e regressão

1. Preparar roles de migration e app sintéticas em banco descartável. Aplicar migrations somente nesse banco confirmado; testar DDL/DML permitido e negar DDL ao app. Coletar grants efetivos sem credenciais.
2. Executar cenários F001 de sucesso e rollback, F003 de contexto inválido/seleção explícita, M-01/I-01 e regressão funcional aplicável; fixtures sintéticas e cleanup restrito aos IDs da rodada.
3. Capturar stdout/stderr do Next/runner e logs só do container PostgreSQL criado para a rodada; inserir marcadores sintéticos em campos que devem ser descartados. Classificar resultados por sink; não inferir comportamento de collector gerenciado.
4. Se o destino selecionado for multi-instance, iniciar duas instâncias temporárias com o mesmo banco/configuração sintética atrás do proxy, testar login/sessão cross-instance, rate limit distribuído/restart e conexões. Se o destino for single-instance, não criar segunda instância sem necessidade.
5. Usar Playwright/Chromium para respostas HTTPS/cookies e regressão. Sanitizar artifacts para nunca guardar cookies/tokens; relatório conserva apenas atributos, status e contagens.
6. No encerramento, parar processos e remover somente container/rede/cópia/certificados comprovadamente criados para aquela rodada; nada persistente e nenhuma infraestrutura preexistente deve ser tocada.

O Build do Next.js pode criar o Pool durante import da rota sem abrir uma conexão. O teste deve distinguir “variável exigida para instanciar” de “banco contatado durante build”; a evidência atual é estática e não resolve esse comportamento dinâmico.

## 8. Gates de publicação

`H` = comprovável em homologação; `P` = exige também evidência da infraestrutura/configuração final de produção. Teste local não aprova automaticamente um gate `P`.

| ID | Controle exigido | Responsável técnico | Ambiente/procedimento | Evidência esperada | Aprovação | Reprovação | Dependências | Estado atual |
|---|---|---|---|---|---|---|---|---|
| G-01 | Arquitetura, proprietário de cada camada e topologia registrados | Responsável do projeto + operadores dos componentes | Revisão documental; **P** | Diagrama/as-built, limites, owners, número de instâncias, caminho de request e DB | Cada camada tem dono técnico e configuração alvo sem contradição | Proxy/DB/logs/backup sem owner ou topologia desconhecida | Escolha do alvo e responsabilidades | **Não verificado** |
| G-02 | Build/start release reproduzível sem arquivos env locais | Engenharia de aplicação | Cópia limpa no Distrobox, depois **H** | Logs sanitizados, commit/artifact id, env names necessários, startup/health | Build e start passam com variáveis sintéticas; nenhum segredo real no builder/artifact | Exige `.env.local`, banco principal/segredo real, ou inicia sem health confiável | Resolver necessidade de env estática e Node runtime | **Não verificado** |
| G-03 | HTTPS válido; HTTP redireciona; app não contorna edge | Proxy/edge | Proxy TLS temporário **H**; endpoint final **P** | Capturas sanitizadas de handshake/status/Location e rede | Certificado válido, redirect sem loop e caminho HTTP não alcança app desprotegida | Cert inválido, sem redirect, listener de origem público ou spoofed host chega à app | Domínio, TLS termination, proxy confiável | **Não verificado** |
| G-04 | HSTS emitido somente por camada escolhida | Proxy/edge | Wire HTTPS **H**; hostname final **P** | Header HSTS, política e contagem de emissores | Uma política coerente na resposta HTTPS e escopo autorizado | Ausência em endpoint final, HSTS apenas em HTTP, conflito/duplicação ou subdomínio não avaliado incluído | G-01/G-03 e decisão de domínio/subdomínios | **Não verificado** |
| G-05 | Cookies Better Auth protegidos | Engenharia de aplicação + runtime | Login Playwright via TLS **H**; **P** confirma config final | Atributos sanitizados do Set-Cookie e testes de sessão | `Secure`, `HttpOnly`, SameSite/Path conforme política, sem Domain amplo sem motivo; sessão e logout funcionam | `Secure` ausente em HTTPS, atributos relaxados ou cookie vazado em artifact/log | G-02/G-03, `NODE_ENV`, BETTER_AUTH_URL | **Parcial: atributos locais HTTP e fluxo de sessão integrados; sem HTTPS** |
| G-06 | Trusted origin e forwarded headers restritos | Proxy/edge + aplicação | Host válido/inválido por proxy **H**; **P** confirma regra do edge | Resultados de origins, host/forwarded malformados e logs redigidos | Só origem declarada e proxy confiável são aceitos; cliente não controla IP/host efetivo | Origem arbitrária aceita ou headers externos alteram host/IP confiáveis | DNS/host/proxy definido; impacto em F002 | **Parcial: origem configurada; sem teste através de proxy** |
| G-07 | Roles separadas e privilégio mínimo PostgreSQL | DB operator + aplicação | PostgreSQL descartável **H**; grants efetivos do DB final **P** | Consultas role/grants, teste DDL negado e operações necessárias aprovadas | Runtime sem superuser/DDL e com DML mínimo; migration role separada | Runtime pode administrar schema/DB sem necessidade ou falha de operação normal por grants imprecisos | Matriz de acesso das migrations e runtime | **Não verificado** |
| G-08 | Isolamento de rede e TLS app→DB | DB operator/plataforma | Rede Podman descartável **H**; ACL/TLS final **P** | Ports/listeners, regra de rede e prova de transporte TLS quando remoto | DB não público, conexão restrita ao app/migration e TLS validado no caminho remoto | DB publicamente acessível, rede excessiva ou TLS remoto ausente/quebrado | Arquitetura do host/DB e modo de conectividade | **Parcial: rede interna testada em execução anterior; sem alvo real/TLS remoto** |
| G-09 | Persistência e recuperação testadas | DB operator/serviço | Restore em DB descartável **H**; política/backup do serviço **P** | Evidência de backup, data sintética restaurada, tempo e checklist | Restore íntegro dentro de RPO/RTO acordados e backup protegido | Backup inexistente/inutilizável, restore não testado ou dados sem política | Decisão de disponibilidade, retenção e owner | **Não verificado; planejado antes do piloto** |
| G-10 | Segredos e variáveis de ambiente protegidos | Operador do destino + aplicação | Cópia sintética **H**; ACL/rotação do secret store **P** | Inventário de nomes, ACL redigida, rotação simulada, scan de artifacts/logs | Sem valor secreto no repo/artifact/log; secret store restrito; URLs por ambiente | Valor exposto/reutilizado, acesso amplo ou segredo de prod no build/teste | Provedor/secret manager e owners | **Parcial: nomes e `.env.local` local documentados; sem secret store** |
| G-11 | Logging redigido com ACL/retention verificáveis | Observabilidade/plataforma + aplicação/DB | Sinks locais **H**; collector real de homologação **P** | Canários ausentes nos sinks proibidos, política de acesso/retention por fonte | App/Next/PG/edge têm destinos, acesso, redaction e expurgo definidos; auditoria de negócio preservada | Canário sensível aparece sem controle ou sem owner/política em log operacional | Escolha de collector, fonte PostgreSQL/edge e retention | **Parcial: sinks F005 capturados; collector e controles externos desconhecidos** |
| G-12 | Rate limit coerente com topologia | Aplicação + operador do runtime | Single process ou duas instâncias temporárias **H**; **P** confirma escala/config | Sequência de respostas, restart e limite cross-instance se aplicável | Single-process explícito e risco aceito, ou limite compartilhado validado por réplica/IP confiável | Multi-instance sem estado compartilhado, restart torna limite ineficaz sem aceitação | G-01/G-06; decisão de escala | **Não verificado; condicionado à topologia** |
| G-13 | Migrações e bootstrap operados fora do web start | Aplicação + DB operator | Job separado em DB descartável **H**; **P** verifica pipeline | Identity/role da migration, log sem segredo, versão de schema | App não roda DDL no startup; migration executa via role/job controlados; bootstrap não repetido | Credencial superuser no runtime ou migration implícita sem controle | Role migration, release process, backup/compatibilidade | **Parcial: migrations/bootstrap existem; job/roles de produção ausentes** |
| G-14 | Auditoria transacional preservada | Aplicação/owner de dados | Integração PostgreSQL **H** e smoke do release | Estado antes/depois sintético, evento positivo/rollback | F001 positivo/rollback e eventos necessários permanecem consistentes; F005 canários continuam ausentes no app | Alteração privilegiada sem trilha, rollback falho ou canários nos sinks do app | Banco de homologação e teste existente | **Comprovado nos cenários SEC-01 de 03/11; sem prova de produção** |
| G-15 | Testes de release e limites de CSP/tenant documentados | Qualidade + segurança | CI/H com Chromium e DB descartável; **P** só smoke sem dados reais | Resultados separados por run, skips/falhas explicitados, violations CSP classificadas | Suite relevante aprovada; M-01/I-01 executados quando gate; CSP de Report-Only sem violações inexplicadas para eventual enforcement | Gate skipado sem justificativa, falha de auth/tenant, CSP enforcement antes de triagem | Build, browser, DB e artefato CSP de produção-like | **Parcial: suites existem; 35 skips e 1 timeout no run integral 03/11; CSP ainda Report-Only** |

Hoje, G-14 possui evidência integrada histórica conforme SEC-01, e parte de G-15 tem execução Bazzite documentada, mas estes não certificam a arquitetura-alvo ainda não escolhida. Os gates `P` só podem ser aprovados depois da configuração e do endpoint da homologação representarem o destino decidido; produção não será declarada por inferência local.

## 9. Decisões pendentes

| Decisão | Por que importa | Alternativas | Recomendação inicial condicional | Impacto em gates |
|---|---|---|---|---|
| Provedor/hospedagem | Define runtime, TLS, rede, backup, logs, cobrança e shared responsibility | App+DB gerenciados; VPS; servidor próprio | Comparar primeiro serviço gerenciado Node + PostgreSQL; usar VPS se orçamento e capacidade operacional forem confirmados | Define G-01 a G-13 e fontes de evidência |
| Orçamento operacional | Determina se custo de serviço gerenciado é sustentável e qual carga operacional pode ser assumida | Priorizar despesa monetária menor ou menor esforço operacional | Não escolher por preço sem cotação e custo de horas; comparar custo total qualitativamente | G-01/G-09/G-11 e seleção do destino |
| Domínio público | Necessário para `BETTER_AUTH_URL`, trusted origins, TLS, HSTS e cookies | Domínio próprio a definir ou subdomínio sob domínio institucional com autorização | Preferir domínio/subdomínio controlado pelo projeto; nome não definido | G-03 a G-06 |
| Usuários e crescimento | Impacta pool, instâncias, banco, storage e rate limiting | MVP pequeno; crescimento planejado; carga alta | Começar com uma instância lógica e medir; não inventar contagem | G-12, tamanho de DB e limites |
| Disponibilidade | Define necessidade de HA, RPO/RTO, failover e janela de manutenção | MVP com manutenção eventual; uptime acordado; alta disponibilidade | Para MVP sem SLA demonstrado, evitar HA prematura e documentar janela/limites após o responsável decidir | G-01/G-09/G-12 |
| Backups | Define janela, retenção e recuperação aceitável de dados comerciais | Snapshot gerenciado ou backup externo controlado; retenção a definir | Preferir mecanismo automatizado com cópia recuperável independente do host e restore testado | G-09, antes de dados reais |
| Operação de infraestrutura | VPS/servidor próprio exige patching/alerta/incident response contínuos | Owner interno; provedor gerencia parte; operação compartilhada | Só escolher autogerido se houver owner funcional; não inventar pessoa | G-01/G-03/G-08/G-09/G-11 |
| Destino/retention de logs | Define ACL, redaction, investigação e expurgo | Collector do serviço; stack autogerida | Começar com logs estruturados do provedor e acesso mínimo, após confirmar export/redaction e política | G-11 |
| Uma ou mais instâncias | Rate limiter F002 é por processo; pool total aumenta por instância | Uma instância inicial; multi-instance depois | Uma instância lógica inicial, salvo limite do destino; reavaliar se plataforma escalar automaticamente | G-12/G-06 |
| Região/localidade de dados | Afeta latência, contrato e requisitos de tratamento de dados | Região oferecida pelo destino a escolher | Decidir após requisitos legais/operacionais, sem presumir região | G-01/G-08/G-09 |

## 10. Riscos e limitações

- A recomendação gerenciada depende de capacidades concretas do fornecedor; não pesquisamos provedores, preços, SLAs, regiões, limites, logs, snapshots ou suporte a Node/Next nesta avaliação.
- App gerenciada pode escalar ou executar build em ambiente separado automaticamente. Isso precisa ser verificado: Better Auth é instanciado no import da rota e exige variáveis; o rate limit é por processo.
- Uma VPS single-host é simples e portátil, mas mantém aplicação, banco e disponibilidade concentrados; container não elimina necessidade de firewall, patching, backup externo e restore.
- RLS não foi introduzida. O modelo atual usa filtros de tenant/authorization de aplicação e constraints; avaliar camada de DB apenas se houver requisito técnico, desenho de contexto de conexão e evidência de benefício.
- HSTS depende do domínio e TLS; `Secure` depende do runtime e do wire. Configurar ambos antes da escolha da camada pode criar duplicidade ou política irreversível em subdomínios.
- Restore, secrets ACL, PostgreSQL grants, TLS de DB, collector e retenção são todos não comprovados. Ausência de artefato no repo não prova vulnerabilidade na futura infraestrutura.
- A investigação é documental/estática. Não houve execução, build, network probe, test runner ou busca de provedor. Nenhum “pass” operacional novo foi produzido.

## 11. Próxima execução recomendada

### SEC-02B — Aprovação do alvo e homologação descartável

1. O responsável escolhe (ou adia explicitamente) VPS versus serviços gerenciados, orçamento aceitável, domínio de homologação, disponibilidade, quantidade inicial de usuários e owner operacional. A proposta deste documento não substitui essa decisão.
2. Após a escolha, registrar o diagrama real: origem do request, TLS/HSTS owner, rede da aplicação/DB, forma de secrets, migrations, logs e backup.
3. Executar em cópia limpa e recursos efêmeros Bazzite apenas os gates `H`: build/start com valores sintéticos e sem `.env*`, PostgreSQL tmpfs rootless, roles runtime/migration, proxy HTTPS local, cookies/HSTS/headers e Playwright.
4. Separar evidência local de homologação. Gates do fornecedor (`P`) precisam de ambiente de homologação provisionado e configuração observável; não acessar produção nesta etapa.
5. Só propor mudança arquitetural se uma validação reproduzir lacuna concreta; qualquer implementação fica em escopo posterior e depende de autorização própria.

Até as decisões de hospedagem/domínio/responsabilidade serem tomadas, pode-se preparar o roteiro/test harness sem iniciar infraestrutura. Não há alteração de aplicação ou deploy incluído na SEC-02A.

## Fontes do projeto

- [SEC-02 readiness](SEC-02-readiness-assessment.md) e [SEC-01 consolidada](SEC-01-consolidated-status.md).
- [Arquitetura](../architecture.md), [modelo de segurança](../security-model.md), [modelo do banco](../database-model.md), [ADR-0001](../decisions/ADR-0001-stack-e-identificadores.md), [estratégia de testes](../test-strategy.md).
- Código e configuração: `package.json`, `next.config.ts`, `src/proxy.ts`, `src/lib/auth.ts`, `src/db/index.ts`, `drizzle.config.ts`, `drizzle.test.config.ts`, `scripts/bootstrap-owner.ts`, `src/lib/safe-logger.ts`, `src/modules/team/member-role-service.ts` e migrations.

