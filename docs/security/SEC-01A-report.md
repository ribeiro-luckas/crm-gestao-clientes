# SEC-01A — Relatório executivo

**Status:** diagnóstico estático concluído no código-fonte disponível; verificações dinâmicas e de implantação não executadas nesta etapa.
**Data:** 2026-11-02
**Baseline:** OWASP ASVS 5.0.0, nível 1; controles selecionados de nível 2 para SaaS multi-tenant. Isto não é certificação nem declaração de conformidade.

## Resumo executivo

A revisão encontrou controles de autorização no servidor em Server Actions e exportações, escopo organizacional aplicado às consultas comerciais examinadas, validação de payload com Zod em mutações e FKs compostas que mantêm relações de clientes, oportunidades, tarefas e assignments dentro da organização. Foram encontrados testes negativos para exportação sem sessão/MEMBER, RBAC, IDs entre tenants e invariantes OWNER/M-01/I-01. Esses sinais são positivos, mas não substituem execução atual, revisão exaustiva nem teste adversarial.

Há **dois achados confirmados de desenho/configuração com impacto condicionado**: (1) a alteração de papel é persistida via Better Auth e seu registro de auditoria é gravado em uma operação posterior, sem atomicidade; uma falha da segunda operação deixa a mudança válida sem trilha correspondente; (2) Better Auth 1.7.14 habilita rate limiting em produção, mas, sem storage configurado, usa memória do processo, de modo que limites não são compartilhados entre réplicas e reinícios. A topologia implantada não foi verificada.

Há uma **ambiguidade de contexto de workspace**: `workspace.ts` escolhe a primeira membership quando `activeOrganizationId` não encontra membership atual. O código ainda restringe a escolha às memberships daquele usuário, portanto não foi demonstrado acesso fora das organizações autorizadas. Recomenda-se validar o comportamento com sessões multi-organização e considerar falha fechada quando uma organização ativa explícita estiver obsoleta.

Não foi confirmado P0/P1, acesso cruzado entre tenants, bypass de RBAC, SQL injection, XSS armazenado/refletido ou vazamento CSV. A revisão foi estática e não prova sua ausência. A configuração efetiva de HTTPS, cookies, headers, CORS/proxy, logs de plataforma e privilégios PostgreSQL não foi observada. O `next.config.ts` não define headers de segurança, mas um proxy/edge pode fazê-lo; isso permanece pendente.

## Escopo analisado

- Aplicação Next.js 16.4.3 / React 19.3.1; Better Auth 1.7.14; Drizzle ORM 0.45.4; PostgreSQL client `pg` 8.23.1; TypeScript 5.9.3; Playwright 1.64.1; axe-core Playwright 4.14.0; Zod 4.6.7 (versões locais observadas por `npm ls --depth=0`). Versão do servidor PostgreSQL não consultada.
- Server Actions e páginas autenticadas em `src/modules/*`, `src/app/(app)/*`; Route Handlers de Better Auth e CSV; configuração, schemas, migrations e fixtures/testes listados em `SEC-01A-attack-surface.md` e `SEC-01A-test-coverage.md`.
- Dependências: `package.json`, lockfile presente e árvore local. Nenhum `npm audit` foi executado.
- O ambiente `.env.local`, qualquer credencial, produção, `crm-postgres` e qualquer banco foram deliberadamente excluídos. Não foram iniciados servidor, Chromium, E2E ou conexão PostgreSQL.

## Achados principais

| ID | Prioridade / status | Resumo | Ação imediata |
|---|---|---|---|
| SEC-01-F001 | P2 / confirmado, impacto condicionado | Mudança de papel pode persistir antes de falhar a gravação de auditoria | Tornar mudança e registro recuperáveis/consistentes; testar falha após operação Better Auth |
| SEC-01-F002 | P2 / configuração confirmada, risco condicionado | Rate limiter Better Auth usa storage em memória por processo sem configuração explícita | Confirmar topologia; em múltiplas réplicas usar storage compartilhado e validar IP de proxy |
| SEC-01-F003 | P3 / comportamento observado, contexto pendente | Workspace inválido/ausente cai silenciosamente na primeira membership | Testar usuário multi-org e sessão removida; preferir erro explícito em contexto obsoleto |
| SEC-01-F004 | P3 / lacuna do repositório, implantação não avaliada | `next.config.ts` não configura headers HTTP de endurecimento | Validar resposta pública no ambiente de teste/deploy e documentar camada responsável |
| SEC-01-F005 | P3 / sink confirmado, conteúdo não comprovado | Handler registra objeto bruto de erro no log do servidor | Validar serialização do driver; sanitizar mantendo campos diagnósticos allowlist |

Detalhes, referências e cenários estão em `SEC-01A-findings.md`.

## Estado geral e prioridade

**Risco residual: moderado e ainda não quantificado**, principalmente por ausência de evidência dinâmica e de implantação, não por vulnerabilidade crítica confirmada. A revisão do código sugere uma boa base de autorização tenant-scoped e constraints relacionais. O primeiro trabalho deve fechar a trilha de auditoria de papel e confirmar rate limit/headers no desenho de implantação; depois, testar sessões multi-org, chamadas diretas a actions, CSRF/origin, falhas e concorrência em ambiente isolado.

Não iniciar produção antes de: validar segredo e URL de Better Auth, TLS/cookies efetivos, headers, rate limiting distribuído, permissões mínimas do usuário de banco, restore/backup, logs, e regressão SEC-01B. Esta lista é pré-condição de avaliação, não declaração de bloqueio baseada em configuração de produção observada.

## Referências usadas

- [OWASP ASVS 5.0.0](https://asvs.owasp.org/) — publicado como versão estável em 30 maio 2025; requisitos citados com versão explícita.
- [OWASP Web Security Testing Guide 4.2](https://owasp.org/www-project-web-security-testing-guide/) — metodologia; a própria OWASP recomenda links de conteúdo versionados.
- [Next.js 16 — Mutating Data](https://nextjs.org/docs/app/getting-started/mutating-data) e [Authentication](https://nextjs.org/docs/app/guides/authentication) — Server Functions são chamadas de rede e devem autorizar cada mutação.
- [Better Auth — opções de rate limit](https://better-auth.com/docs/reference/options) e [Security](https://better-auth.com/docs/reference/security) — referência consultada; defaults relevantes também foram conferidos no pacote instalado 1.7.14, não inferidos de docs beta.
- [Drizzle ORM — SQL template](https://orm.drizzle.team/docs/sql) e [PostgreSQL 18 — Row Security Policies](https://www.postgresql.org/docs/18/ddl-rowsecurity.html). A versão do PostgreSQL implantado não foi verificada; a documentação de RLS é usada apenas para o princípio de defesa em profundidade.

## Limitações e evidência

Os resultados históricos informados pelo solicitante (43/43 E2E, 5/5 auditoria visual, 32 varreduras axe sem violações, 91 unitários, M-01/I-01 sem inconsistências) não foram reexecutados e não são resultados desta auditoria. As validações executadas agora estão registradas na entrega, após elaboração dos documentos. Veja matriz de áreas pendentes em `SEC-01A-test-coverage.md`.

## Validações SEC-01A executadas

- `npm run typecheck` — aprovado (exit 0).
- `npm run lint` — aprovado (exit 0).
- `npm test` — aprovado: 15 arquivos, 91 testes (Vitest unitário). Foi exibido aviso de compatibilidade futura do config loader Vite, sem falhas.
- `git diff --check` — exit 0, com limitação: checkout informa os arquivos do projeto como não rastreados; o comando não valida esses novos arquivos.
- Verificação manual de whitespace/newline executada nos seis Markdown novos em `docs/security/` — aprovada após remover trailing whitespace.

## Acompanhamento F004 — SEC-01C.3 (2026-11-02)

Após este diagnóstico, headers básicos foram declarados em `next.config.ts` e a candidata CSP nonce passou a ser enviada em Report-Only via `proxy.ts`. Essa alteração no repositório não equivale a validação da resposta HTTP: typecheck, lint e 96 testes unitários passaram, mas Playwright/Chromium e o PostgreSQL isolado não estavam disponíveis para a spec que mede o wire. HSTS e cookie Secure sob HTTPS permanecem sem evidência de implantação. O status atual é **implementação local parcial, validação dinâmica pendente**; ver `SEC-01C-F004-remediation.md`.
- `TEST_DATABASE_URL` ausente; `distrobox` e Chromium não encontrados neste executor. Nenhum teste de integração/PostgreSQL, Playwright/E2E ou teste dinâmico foi executado. `.env.local` não foi aberto.
- Auditoria de dependências (`npm audit`) não executada: o ambiente Distrobox autorizado não está disponível e a execução do npm no executor atual não foi usada para consultar fonte externa. Nenhuma versão foi alterada.
