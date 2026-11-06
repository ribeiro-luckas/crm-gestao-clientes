# SEC-02B.1 — Homologação técnica isolada

**Data:** 03/11/2026  
**Projeto:** CRM Gestão de Clientes  
**Decisão:** homologação local concluída parcialmente; publicação continua não autorizada.

## 1. Resumo executivo

A homologação foi executada no Bazzite 44, em cópia temporária sem `.env*`, contra um PostgreSQL novo em rede interna do Podman e por uma terminação HTTPS local. Não houve acesso a produção, bancos existentes ou credenciais reais. O build de produção concluiu sem PostgreSQL disponível, e a aplicação iniciou depois com valores sintéticos distintos dos valores de build.

Build, autenticação por Better Auth, sessão, TLS local, HSTS, atributos do cookie, isolamento PostgreSQL e privilégios mínimos tiveram evidência em homologação. Typecheck, ESLint, 103 testes unitários e uma execução integral de integração (195 aprovados, 35 skipped) passaram. Fluxos E2E de autenticação, CRM, sessão e multi-organização foram exercitados no Chromium. A suíte HTTPS teve uma violação CSP Report-Only de `script-src`/`eval`, ainda sem causa classificada; a execução de 21 testes teve 18 aprovados e 3 reprovados, dos quais dois passaram em rerun focalizado após corrigir somente a ambiguidade do seletor de teste.

Há dois impedimentos relevantes para os gates: (1) um sink nativo do Better Call/Next registrou a instrução SQL e o erro de permissão durante uma falha sintética; os canários de email e senha não apareceram, mas a saída não passa pelo `safeLogger`; e (2) a CSP Report-Only reportou `eval`. O primeiro é evidência nova de cobertura incompleta dos sinks e exige uma reavaliação estreita do residual associado à F005. Não foi demonstrado vazamento de senha, token, cookie ou segredo. O segundo impede classificar G-15 como aprovado e exige triagem antes de qualquer enforcement de CSP.

Os controles externos continuam sem validação: arquitetura/provedor, domínio público, TLS real, ACL e retenção de logs, secret manager, backup/restauração e topologia de produção. Esta homologação não equivale a homologação do provedor nem torna o CRM pronto para publicação.

## 2. Ambiente e isolamento

| Item | Evidência |
|---|---|
| Host | Bazzite 44, Linux x86_64, Podman rootless |
| Execução Node | Distrobox `laboratorio-node` e container de app `node:24-bookworm`, Node.js 24.22.2 |
| Banco | PostgreSQL 18.6, container novo `sec02b1-pg`, banco `crm_homologation` |
| Navegador | Playwright com Chromium operacional; E2E HTTPS executados |
| Cópia | `/tmp/sec-02b1-20261103`, modo restrito, sem `.env*`, `.git`, outputs de build/cache ou dados locais |
| Rede | Rede Podman nova `sec02b1-homolog-20261103`, `internal=true`; PostgreSQL sem porta publicada e sem volume; dados em armazenamento temporário do container |
| Exposição local | Proxy e túnel vinculados somente a `127.0.0.1`; Next.js acessível pelo proxy dentro da rede. Nenhuma porta foi publicada em interface pública |
| Certificados | CA/certificado sintéticos locais, validados pelo cliente de teste; não instalados no sistema |
| Serviços externos | Build executado com rede desabilitada; fluxos de runtime usaram somente rede interna/local |

A cópia foi produzida a partir do projeto e teve guardas e identificadores dos testes adaptados somente para o banco temporário (`127.0.0.1:15433/crm_homologation`, papel `crm_test_runner`). Houve também espera entre logins E2E para respeitar o rate limit ativo e ajuste de seletor para distinguir a mensagem de erro do anúncio de rota do Next.js. Nenhuma dessas adaptações foi copiada ao repositório original. Os endpoints de teste e senhas usados eram sintéticos.

### Build, variáveis e artefatos

O build usou ambiente de variáveis controlado, sem herdar `DATABASE_URL`, Better Auth ou arquivos locais. `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` e `DATABASE_URL` sintéticas foram fornecidas com marcadores próprios do build. O comando `npm run build` terminou com código 0 em rede isolada, sem PostgreSQL disponível; nenhum acesso TCP foi observado nos cenários instrumentados. Isso confirma que, nesta configuração, build requer os valores para coleta da rota Better Auth, mas não uma conexão operacional com o PostgreSQL.

Typecheck e ESLint também concluíram com código 0. A análise de `.next/static` e `.next/server` não encontrou os marcadores sintéticos de segredo, URL do banco ou origem do build. A análise cobriu artefatos cliente e servidor; não é evidência de ACL/rotação de secret manager nem validação de um artefato de provedor. Na inicialização, valores sintéticos de runtime diferentes foram usados; login integrado e sessão confirmaram uso do runtime e do banco descartável.

## 3. Runtime, HTTPS e headers

O servidor Next.js iniciou a partir do build de produção dentro de container Node separado. A aplicação conectou ao banco temporário usando TLS PostgreSQL com `sslmode=verify-full` e a CA sintética. `pg_stat_ssl` confirmou TLS 1.3 na conexão observada. O início e as rotas necessárias responderam sem depender de configuração local.

O proxy descartável terminou TLS e foi o único responsável por HTTPS, redirecionamento HTTP e HSTS. O certificado foi validado para o endereço local. A requisição HTTP foi redirecionada com status 308 para HTTPS. HSTS apareceu somente na resposta HTTPS, uma vez, como `max-age=3600`; não foram usados `preload` ou `includeSubDomains`. A aplicação não adicionou um segundo HSTS. Headers de segurança observados incluíram `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, Referrer-Policy e CSP Report-Only; `X-Powered-By` não foi emitido.

O proxy estabeleceu os headers encaminhados canônicos e removeu valores `Forwarded`/`X-Forwarded-*` enviados pelo cliente. O teste com host e forwarding falsificados não os tornou a origem efetiva da aplicação. Isso valida o proxy temporário e sua configuração, não um futuro edge/provedor.

## 4. Autenticação, sessões e cookies

Resultados do E2E de autenticação integrado via HTTPS local:

| Fluxo | Resultado |
|---|---|
| Origem não confiável | HTTP 403 |
| Credenciais sintéticas inválidas | HTTP 401 |
| Cadastro/bootstrap e login sintéticos | Aprovados no banco descartável |
| Login válido e criação da sessão | HTTP 200 |
| Consulta autenticada da sessão | HTTP 200 |
| Acesso sem sessão a página privada | Redirecionamento para login |
| Logout | HTTP 200; sessão posterior nula/inválida |
| Limite de tentativas | O rate limit real respondeu 429 na primeira execução E2E, após tentativas concentradas; a suíte foi rerodada com intervalo superior à janela configurada, sem desabilitar o controle |

Os atributos foram examinados sem registrar o valor do cookie: `__Secure-better-auth.session_token`, `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, sem `Domain` amplo e com `Max-Age`. Nenhum valor de cookie/token foi incluído no relatório. Esses resultados são específicos da origem HTTPS e dos valores de homologação; não provam comportamento de domínio público/proxy real.

## 5. PostgreSQL e auditoria transacional

O banco foi criado exclusivamente para esta execução. Antes das migrations, identidade do container, banco, rede interna, armazenamento temporário e variáveis sintéticas foram verificados. Nenhuma migration foi executada contra banco existente. As migrations foram executadas separadamente da aplicação, com papel `crm_migration` sem superuser, `CREATEDB` ou `CREATEROLE`.

O papel de runtime `crm_app_runtime` não é superuser, não pode criar objetos no schema `public`, não tem `CREATE`/`TEMP` no banco nem uso do schema de migrations; recebeu os grants DML necessários nas 14 tabelas de runtime. O papel de testes foi separado do runtime e recebeu `pg_monitor` somente no cluster efêmero para diagnósticos das suítes. Uma operação negativa de DDL retornou `permission denied`, conforme esperado. As operações necessárias da aplicação, incluindo autenticação, funcionaram com o papel restrito. Grants efetivos foram consultados na instância descartável; o papel de bootstrap não foi usado pelo processo normal da aplicação.

A execução integral de integração passou em **195 testes**; as suítes de auditoria incluíram persistência de eventos e rollback transacional. A F001 permaneceu confirmada no escopo já documentado: sucesso grava o evento junto da mudança, e falha/rollback não deixa evento falso nem alterações parciais. O banco temporário foi descartável e não havia volume persistente; backup/restauração não foi validado.

## 6. Logs, canários e sinks

Foram capturados stdout/stderr do processo Next.js e dos containers temporários de aplicação/proxy e PostgreSQL, além da saída dos testes. A busca por marcadores sintéticos de build, runtime, email e senha retornou zero ocorrências nos streams examinados. Nomes/valores de segredos, cookies e tokens não foram registrados neste relatório. Os logs PostgreSQL apresentaram mensagens de erros esperadas de cenários negativos das suítes e dados exclusivamente sintéticos; PostgreSQL é um sink separado do `safeLogger`.

Uma falha controlada de runtime foi produzida apenas no banco SEC-02B.1: revogou-se temporariamente `SELECT` de `crm_app_runtime` sobre `public.user`, enviou-se uma autenticação com canários sintéticos e o privilégio foi restaurado pelo mecanismo de saída do comando. A consulta posterior confirmou o grant restaurado. A resposta foi HTTP 500. O stderr do Next/Better Call incluiu a forma da consulta SQL e `permission denied for table user`, fora do adaptador de logging configurado. O scanner não encontrou o canário de email nem de senha nesse stream. O runner Vitest também emitiu cinco eventos `SERVER_ERROR`/`DrizzleQueryError` durante testes de falhas esperadas, contendo SQL e parâmetros sintéticos.

**Interpretação:** a evidência confirma um sink nativo não interceptado e conteúdo técnico de erro fora da allowlist do logger da aplicação. Ela não comprova exposição de segredo, credencial, cookie ou dado real. Como a F005 anterior encerrou a mitigação do logger controlado pela aplicação e explicitou que sinks próprios de frameworks poderiam permanecer fora de cobertura, o código de `safeLogger` não foi alterado e o histórico SEC-01C foi preservado. O sink observado em runtime é evidência nova: requer triagem estreita para decidir se a configuração/versão do framework pode suprimir ou redigir essa saída e se os parâmetros são emitidos em outros erros. Até essa triagem e definição do collector/ACL/retenção, G-11 não está aprovado e o encerramento operacional da cobertura de logs permanece limitado.

## 7. Regressão automatizada

Resultados separados por execução:

| Execução/verificação | Resultado | Observação |
|---|---:|---|
| `npm run typecheck` | Aprovado, código 0 | Cópia temporária, ambiente controlado |
| `npm run lint` | Aprovado, código 0 | Sem apontamentos |
| Unitários | **103 aprovados** | 17 arquivos; worker limitado para o host de homologação |
| Integração — execução integral final | **195 aprovados, 35 skipped** | 18 arquivos passaram; 2 suítes gated foram skipped |
| Integrações focalizadas após adaptação de identidade do DB | **43/43 aprovadas** | Três arquivos que antes tinham diagnóstico de lock hard-coded para outro banco/usuário |
| E2E HTTPS de autenticação | **1/1 aprovado** | Execução própria do fluxo integrado Better Auth/PostgreSQL |
| E2E de CRM, multi-organização, papéis e headers | **18 aprovados, 3 reprovados em 21** | Dois reprovados por seletor `role=alert` ambíguo passaram em rerun focalizado 2/2 após mudar apenas o seletor no harness; um CSP Report-Only permaneceu reprovado |
| CSP Report-Only | **Reprovado para o gate** | Chromium reportou `script-src` violado por `eval`, categoria `same-origin-next-path`; causa ainda não classificada. Como a política é Report-Only, o browser não bloqueou o recurso |

Na execução E2E inicial, antes de espaciar os logins, o limite real de autenticação causou respostas 429 e testes escritos para HTTP de desenvolvimento esperavam ausência de HSTS/cookie `Secure`. Esses resultados foram registrados, não escondidos; a execução posterior usou HTTPS e atributos da topologia SEC-02B.1 e respeitou a janela do rate limit. Os 35 skipped pertencem às suítes gated M-01/I-01 documentadas e não foram ativadas nesta etapa; portanto esses cenários continuam sem validação nesta execução.

## 8. Matriz dos 15 gates SEC-02A

“Aprovado em homologação” significa apenas evidência local no ambiente temporário descrito. Gate dependente do destino real permanece condicionado à escolha e à validação da infraestrutura.

| ID | Gate | Resultado SEC-02B.1 | Evidência e limite |
|---|---|---|---|
| G-01 | Arquitetura, responsabilidades e topologia | **Pendente de decisão/infraestrutura real** | Topologia temporária registrada; provedor, domínio, owners e número de instâncias de produção seguem sem aprovação. |
| G-02 | Build/start sem env local | **Aprovado em homologação** | Build sem PostgreSQL e sem `.env*`; início com valores runtime distintos. Não representa o pipeline final. |
| G-03 | HTTPS, redirect e proteção da origem | **Aprovado em homologação** | TLS local validado, HTTP 308 e Next atrás do proxy interno; domínio, edge e listener do futuro destino pendentes. |
| G-04 | HSTS em uma única camada | **Aprovado em homologação** | HSTS somente HTTPS, uma política `max-age=3600`; sem preload/subdomínios. Hostname e política final pendentes. |
| G-05 | Cookies e sessões Better Auth | **Aprovado em homologação** | `Secure`, `HttpOnly`, Lax, Path `/`, sem Domain amplo; login, sessão, logout/invalidação. Provedor e domínio real pendentes. |
| G-06 | Trusted origins e forwarded headers | **Aprovado em homologação** | Origem não confiável negada; proxy descartou headers encaminhados falsificados. Regra/configuração do edge final pendente. |
| G-07 | Roles PostgreSQL e privilégio mínimo | **Aprovado em homologação** | Papéis de migration/runtime/teste separados; DDL negado para runtime e DML necessário aprovado. Requer conferência de grants no DB real. |
| G-08 | Isolamento de rede e TLS app→DB | **Aprovado em homologação** | Rede interna sem exposição pública, sem volume; TLS 1.3 e `verify-full` com CA local. ACL e endpoint do serviço final pendentes. |
| G-09 | Persistência, backup e recuperação | **Pendente de infraestrutura real** | A instância foi deliberadamente efêmera, sem volume/backup; nenhuma restauração ou RPO/RTO foi testada. |
| G-10 | Segredos e variáveis | **Parcialmente validado** | Build/runtime com marcadores distintos; marcadores ausentes em artefatos e logs examinados. ACL, rotação e secret manager reais não existem nesta homologação. |
| G-11 | Redaction, ACL e retenção dos logs | **Reprovado em homologação / operacional pendente** | Canários ausentes, mas sink Next/Better Call emitiu SQL e erro bruto; teste runner também mostrou SQL/parâmetros sintéticos. Collector, acesso e retenção não definidos. |
| G-12 | Rate limit conforme topologia | **Parcialmente validado** | Limite foi observado e respeitado em uma instância. Compartilhamento entre réplicas, restart e proxy final não foram testados; escala continua por decidir. |
| G-13 | Migrations/bootstrap fora do web start | **Parcialmente validado** | Migration separada e papel dedicado no banco descartável; pipeline/release/backup e bootstrap no destino real pendentes. |
| G-14 | Auditoria transacional | **Aprovado em homologação** | Integração positiva e rollback F001 na execução final; sem dados ou banco de produção. |
| G-15 | Testes de release, CSP e tenant | **Reprovado em homologação** | Autenticação/tenant exercitados; CSP Report-Only registrou `eval`; 35 testes gated skipped e dois seletores foram corrigidos apenas no harness e aprovados em rerun. |

## 9. Falhas, riscos e decisões pendentes

1. **CSP:** investigar a origem do uso de `eval` no recurso same-origin do Next.js, confirmar se é artefato/configuração esperada do build e classificar o impacto. Não habilitar CSP enforced antes dessa triagem e de nova execução do teste.
2. **Sink nativo de erro:** avaliar a saída `SERVER_ERROR` de Better Call/Next sob erro de banco, incluindo se versões/configurações suportadas permitem redaction; executar teste de regressão que confirme ausência de SQL/parâmetros não permitidos. Não há evidência de canário de credencial no log observado. Preservar o status histórico da F005 e tratar esta evidência como follow-up estreito, sem reescrever a remediação já aprovada.
3. **M-01/I-01:** os 35 casos gated foram skipped e não são aprovados por esta homologação. Decidir se são gate do release escolhido e executá-los no próximo ciclo se aplicáveis.
4. **Infraestrutura real:** escolher provedor e domínio, definir operador por camada, política de HSTS, trusted proxy, secret manager, rede, ACL do PostgreSQL, logs e estratégia de backup/restauração antes de testes dependentes do destino.
5. **Operação:** definir retenção e acesso por fonte de log, política de restauração e disponibilidade/RPO/RTO; testar configuração real sem usar dados de produção.

Não foram identificados nesta execução defeitos novos nas funcionalidades de autenticação, sessão, papéis, isolamento multi-organização ou auditoria transacional fora da reprovação CSP e do sink técnico descritos. Não se infere daí aprovação de controles operacionais externos.

## 10. Arquivos e recursos

- **Arquivo novo no repositório:** este relatório.
- **Código, dependências e configuração do projeto original:** não modificados.
- **Documentos históricos SEC-01/SEC-02A/SEC-02B.0:** preservados sem edição.
- **Cópia, logs brutos, certificados, scripts e resultados temporários:** mantidos sob `/tmp/sec-02b1-20261103` até a validação final e depois removidos.
- **Containers criados para esta rodada:** `sec02b1-app` e `sec02b1-pg`, ambos descartáveis e removidos após captura das evidências.
- **Rede criada:** `sec02b1-homolog-20261103`, removida ao encerrar.
- **Volumes:** nenhum volume PostgreSQL preexistente reutilizado ou criado.
- **Infraestrutura anterior:** preservada; nenhum container ou banco preexistente foi alterado.
- **Encerramento:** o container da aplicação não terminou dentro dos 10 segundos de SIGTERM e o Podman recorreu a SIGKILL; o container PostgreSQL também foi encerrado. Ambos eram containers `--rm`, depois confirmados ausentes. A rede e a cópia temporária foram removidas; as portas locais de proxy/túnel ficaram sem listener.

## 11. Próximo passo recomendado

Antes de nova implementação, executar uma triagem curta dos dois resultados reprovados: origem da violação CSP e alcance do sink nativo Better Call/Next. Em paralelo, o responsável pelo projeto deve aprovar o destino e as responsabilidades operacionais. Depois, repetir somente os gates que dependem dessas decisões no ambiente temporário que represente o destino, incluir backup/restore e logs/ACL/retention, e executar os 35 cenários M-01/I-01 caso confirmados como gates de publicação. Publicação permanece bloqueada até os gates de infraestrutura real e G-11/G-15 terem evidências suficientes.
