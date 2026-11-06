# SEC-01B — Prioridades propostas para SEC-01C

Nenhuma correção de produção foi aplicada na SEC-01B.

1. **F001 — auditoria de alteração de papel (P2, reproduzido):** a implementação transacional e as regressões estão preparadas em SEC-01C.1; executar no Bazzite a falha sintética, fluxo positivo, RBAC, regressão E2E e preflights antes de marcar corrigido. O teste deve comprovar rollback do papel e integridade das fixtures/tenants paralelos.
2. **F003 — contexto ativo (P3, reproduzido):** definir contrato fail-closed para active ID inválido ou membership removida, com seleção explícita de workspace. Preservar sessões multi-org válidas e autorização baseada em membership atual; não há evidência de bypass cross-tenant.
3. **F002 — rate limiting (P2 condicional, teste pendente):** primeiro reexecutar os quatro requests após o ajuste do harness. Obter topologia antes de selecionar storage; se múltiplas instâncias, avaliar storage compartilhado e confiança de IP no proxy. Sem Redis automático.
4. **F005 — logs (P3):** verificar o logger real com canário. Se o objeto serializado inclui campos não permitidos, redigir/normalizar exceções na fronteira API e testar redaction, mantendo correlação diagnóstica.
5. **F004 — headers (P3/infra):** headers ausentes foram observados no servidor HTTP local; identificar owner da camada HTTP e medir em HTTPS/edge autorizado antes de escolher a camada de correção. Testar CSP em modo report-only e fluxos Next/Better Auth antes de enforcement.
6. **Autorização/tenant residual:** após regressão dos testes existentes, adicionar IDs negativos apenas às operações ainda sem cobertura; manter OWNER/M-01/I-01 e as queries existentes.

SEC-01C deve executar uma alteração isolada por vez, com aprovação e regressão específica. Uma vulnerabilidade P0/P1 reproduzível suspenderia o restante dos testes que possam ter impacto e exigiria triagem imediata; nenhum resultado desta execução mostrou tal caso.
