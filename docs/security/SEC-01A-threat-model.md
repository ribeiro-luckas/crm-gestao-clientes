# SEC-01A — Modelo de ameaças

## Limites e escopo

Sistema SaaS CRM com Next.js Server Components/Actions, Better Auth, PostgreSQL e dados segregados por `organization_id`. Navegador, payloads, URL, cookies recebidos, e-mail e identificadores são não confiáveis. O banco e o processo do servidor são limites de confiança; deployment/proxy, gestão de segredos e privilégios do DB não foram observados.

## Ativos

1. Credenciais, tokens/cookies e sessões.
2. Dados de clientes: nome, e-mail, telefone, notas e contatos.
3. Oportunidades, valores, forecast, tarefas, atividades e histórico.
4. Membership, papel OWNER/ADMIN/MEMBER, atribuições e identidade de workspace.
5. Logs de auditoria e constraints de titularidade/relacionamentos.
6. Configuração/segredo Better Auth, URL de banco e integridade/availability do PostgreSQL.
7. CSV exportado e respostas privadas servidas ao navegador.

## Atores

| Ator | Capacidade/ameaça principal |
|---|---|
| Visitante | tenta rota privada, login, enumeration e abuse de auth |
| MEMBER | manipula IDs/payloads, tenta exportação/admin, associa entidade de outro tenant |
| ADMIN | tenta operação exclusiva OWNER, alterar membership ou atingir outros workspaces |
| OWNER | ator privilegiado legítimo; erro/comprometimento afeta workspace e sua trilha |
| Usuário multi-org | sessão ativa antiga, troca de workspace, papel desigual entre orgs |
| Membro removido / sessão revogada/expirada | tenta reutilizar cookies, sessão cacheada ou ação previamente aberta |
| Cliente HTTP direto | invoca Server Action/API sem interface, falsifica payload/headers, repete requests e explora corrida |
| Atacante com credencial válida | abuso de export, busca, assignment, acesso lateral; exfiltra dados permitidos ao ator |

## Fronteiras e fluxos

```text
Navegador não confiável
  ├─ HTTP/Next Server Actions ─> autenticação Better Auth ─> workspace/membership DB
  ├─ /api/auth/* ──────────────> Better Auth + wrappers privilegiados
  └─ /api/export/*.csv ────────> session + role + tenant query ─> CSV privado
                                      │
                                      └─ Drizzle / node-postgres ─> PostgreSQL
```

Dados da sessão estabelecem user ID; membership/role atual consultados no servidor determinam tenant e autorização em `workspace.ts`. Inputs controlados pelo cliente incluem resource IDs, organization/member IDs, role, filtros, query e dados de formulários. A action não deve confiar em role ou organization enviados pelo browser.

## Cenários de ameaça e estado da evidência

| Cenário | Controle observado | Estado SEC-01A / próximo teste |
|---|---|---|
| MEMBER altera role chamando endpoint diretamente | wrapper Route Handler e Better Auth; OWNER exigido; testes 403 | implementação/testes existentes revisados; repetir em SEC-01B com payloads inválidos e CSRF/origin |
| Usuário de org A troca UUID por ID conhecido de org B | predicates org em queries/actions, join composto, FKs tenant-scoped; integration/E2E A vs B | código forte, coverage parcial; negative tests por cada action/ID ainda necessários |
| Sessão continua válida depois de membership removida | workspace relê membership em cada request; auth session DB-backed pelo adapter | provável rejeição das rotas de app; testar revogação/remoção, actions já abertas e API auth real |
| Usuário multi-org usa activeOrganizationId inválido | fallback à primeira membership do ator | comportamento confirmado, risco de contexto; F003; testar role diferente e requests em todo endpoint |
| OWNER altera papel, mas auditoria não é gravada | audit feito após Better Auth sem transação conjunta | F001 confirmado como lacuna; injetar falha e decidir durabilidade |
| Credential stuffing distribuído | Better Auth limiter habilitado por default em produção; memória por processo | F002 condicional à topologia; verificar proxies, replicas, real IP, lockout thresholds |
| Fórmula CSV executa ao abrir planilha | todos campos quoted e prefixos ASCII de fórmula escapados | código/testes unitários mitigam; testar Excel/LibreOffice e unicode/line breaks em ambiente sintético |
| CSRF em ações/Route Handlers | Better Auth usa proteção de origem; Server Actions Next POST com origin checking documentado; CSV GET autorizado mas registra auditoria | não houve tráfego dinâmico; revisar custom endpoint, trusted origins e proxy na SEC-01B |
| SQL injection por filtros | Drizzle query builders, sem `sql.raw` em src runtime localizado | análise estática não indicou concat SQL; testes fuzz de query/filtros permanecem |
| XSS via conteúdo CRM | React padrão escapa valores; nenhum `dangerouslySetInnerHTML`/`eval` encontrado | sem exploit confirmado; renderização rica/CSV/browser contexts exigem teste |
| Ataque a owner invariant / assignments inconsistentes | migrations com triggers e FKs M-01/I-01; integração de concorrência existente | resultados históricos não reexecutados; testar adversarial em DB isolado na SEC-01B |
| Exposição via cache/browser/proxy | CSV `private, no-store`; API errors same; layouts dinâmicos | resposta HTML e CDN não observados; verificar headers e cache autenticado |
| Clickjacking/CSP/referrer/TLS | nenhuma header policy no Next config | proxy desconhecido, F004; captura autorizada necessária |
| Abuso de export como DoS | page size máx 5000 e query 120 chars; rate global Better Auth não protege CSV explicitamente | testar concorrência, custo de query e limites de edge; não confirmado |

## Trust assumptions que precisam de validação

- `BETTER_AUTH_URL` em deploy é URL HTTPS canônica e lista trusted origin mínima; localhost fallback não chega em produção.
- `NODE_ENV=production` está correto para Secure cookies/rate limit.
- Proxy configura forwarded headers/IP de forma confiável e remove cabeçalhos enviados pelo cliente.
- `DATABASE_URL` usa usuário least-privilege; servidor não é owner/superuser/BYPASSRLS desnecessariamente.
- TLS, CSP, HSTS, frame protection, logs e backups são geridos por infraestrutura identificada.
- Só ambientes descartáveis carregam `CRM_TEST_MODE`; helper e Playwright testam URL exata antes de conexão.
