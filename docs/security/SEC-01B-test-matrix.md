# SEC-01B — Matriz de testes

| Teste / ID | Achado | Estado inicial | Operação | Resultado que o teste verifica | Ambiente / cleanup |
|---|---|---|---|---|---|
| `sec-01b-audit-workspace.test.ts` / F001 rollback | `SEC-01-F001` | OWNER sintético + membro alvo `member`; tenant B paralelo e snapshot | OWNER usa Server Action; proxy da fixture falha somente `tx.insert(audit_logs)` | Novo esperado: ação falha, papel continua `member`, nenhuma auditoria, OWNER/peer/B intactos; **implementado; tentativa bloqueada no setup pelo helper antes das fixtures** |
| `sec-01b-audit-workspace.test.ts` / F001 positivo | `SEC-01-F001` | Mesma fixture sintética | OWNER altera via Server Action | Papel `admin` e um evento correto com ator, organização e `from`/`to`; **implementado; não executado porque setup foi bloqueado** |
| `team-role-rbac.test.ts` / F001 HTTP | `SEC-01-F001` | OWNER, ADMIN, MEMBER e alvos sintéticos | Request HTTP real por rota Better Auth | OWNER autorizado persiste papel + auditoria; negativas existentes seguem sem alteração; **assert de auditoria adicionado; tentativa bloqueada no setup pelo helper** |
| `sec-01b-audit-workspace.test.ts` / F003 | `SEC-01-F003` | Usuário OWNER em A, membership MEMBER sintética em B, C sem sua membership | Troca `activeOrganizationId`, chama helper API real, remove somente membership adicional de B, faz sign-out e chama Server Action | Em execução Bazzite informada, A/B autorizadas conforme role; C/ID desconhecido/removida caem para A; cliente salvo em A; sessão revogada rejeitada | Vitest integration + PostgreSQL isolado; três fixtures sintéticas; cleanup por fixture; **1/1 passou na execução informada** |
| `sec-01b-rate-limit.test.ts` / F002 | `SEC-01-F002` | Instância Better Auth em `NODE_ENV=production`, storage default | Quatro requests sequenciais de sign-in com IP da faixa documental e emails `.invalid` aleatórios | Espera `401, 401, 401, 429`; a tentativa anterior falhou antes dos requests. Depois, o teste ativa `CRM_TEST_MODE=1` após validação do helper e antes de importar a rota real | Vitest integration + PostgreSQL isolado; sem usuários/credenciais reais; **reexecução pós-fix pendente**; não testa multi-réplica |
| `sec-01b-security-headers.spec.ts` / F004 | `SEC-01-F004` | Fixture OWNER sintética | GET/navegação de login, dashboard e seleção de workspace; sign-in e sessão JSON; assets CSS/JS; CSV; redirect privado; limpa cookies; export sem sessão | Baseline histórico: **1/1 passou** na execução Bazzite informada. Spec atualizada para headers básicos, CSP em HTML, nonce, redirects, assets e cache; **não executada após a alteração** | Playwright Chromium, webServer local e DB isolado; diagnósticos não armazenam nonce, cookie value ou query string |
| `tests/unit/security/content-security-policy.test.ts` / F004 | `SEC-01-F004` | Nonces e origens sintéticas | Constrói CSP para dev/test e produção | 2 testes verificam nonce, diretivas e ausência de `unsafe-inline`; produção sem `unsafe-eval` | Vitest unitário; sem rede, DB ou dependências adicionais |
| `sec-01b-logging.test.ts` / F005 | `SEC-01-F005` | Error com marcador artificial | Chama `workspaceApiErrorResponse` e espiona console | **Aprovado** anteriormente e incluído na suíte unitária atual: 500 genérico sem marcador no body; objeto passado ao sink console | Vitest unitário; sem DB |

## Cobertura anterior não duplicada

`multitenant-isolation.test.ts` já cobre IDs de outros tenants em `updateClient`, `updateDeal`, `setTaskStatus`, criação de contato/atividade/tarefa e FKs. `multitenant-security.spec.ts` cobre export owner/admin vs tenant B, MEMBER/anônimo, busca/dashboard. `team-role-rbac.test.ts` cobre alteração real por HTTP para OWNER e recusa de ADMIN/MEMBER/self/OWNER. A regressão atual desses testes continua pendente por indisponibilidade do banco.

## Interpretação

F001, F003 e F004 tiveram resultados dinâmicos Bazzite informados em SEC-01B; F001 foi reproduzido naquela versão anterior do código. A tentativa atual de três suítes de integração parou no setup do helper: destino PostgreSQL não confirmado, 3 suítes falharam antes dos corpos de teste e 11 casos foram skipped. A regressão transacional F001 e o caminho HTTP ainda aguardam ambiente autorizado. F002 também aguarda execução após o harness. Os 44/44 E2E e 32 varreduras axe são históricos informados pelo usuário, não foram repetidos neste turno. O teste F005 comprova o encaminhamento do objeto sintético ao método `console.error`, mas não a serialização final, destino, controle de acesso ou retenção do agregador.

### Acompanhamento SEC-01C.3 — F004

A spec foi fortalecida e o teste unitário CSP foi acrescentado, mas ambos ainda não foram executados em Bazzite neste acompanhamento. `npm run typecheck`, `npm run lint` e `npm test` passaram localmente (96 testes unitários/17 arquivos). A mudança de produção configura headers básicos e CSP Report-Only; a resposta HTTP efetiva ainda carece de captura. Ver `SEC-01C-F004-remediation.md`.

## Lacunas explícitas

- F003: os novos casos preparam sessão autenticada, logout/revogação, membership removida e active organization válida/inválida/não associada. Expiração e renovação de sessão ainda não têm cenário SEC-01B próprio.
- Testes negativos existentes de RBAC e IDs multi-tenant foram inventariados, mas não reexecutados devido ao bloqueio do PostgreSQL. Os cenários de mudança de papel, remoção, transferência de OWNER e exportação permanecem sem nova evidência dinâmica nesta execução.
- A spec de headers observa o servidor local HTTP; HSTS, cookies Secure em HTTPS e configuração de proxy/edge continuam fora de seu alcance.
