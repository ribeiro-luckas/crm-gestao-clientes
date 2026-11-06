# SEC-01A — Plano de remediação proposto

Nenhuma ação abaixo foi implementada na SEC-01A.

## Ordem sugerida

| Ordem | Prioridade | Item | Dependências | Complexidade | Evidência de aceite |
|---|---|---|---|---|---|
| 1 | P2 | F001: consistência/reconciliação entre alteração de papel e audit log | definir garantia de evento e estratégia de falha/retry | média/alta devido a duas camadas Better Auth/Drizzle | teste injeta falha após papel persistido; mudança nunca fica sem evento ou registro recuperável; auditoria contém ator/org/from/to |
| 2 | P2 condicional | F002: limiter distribuído para runtime multi-replica | confirmação de topologia, proxy e storage disponível | baixa/média, depende de infra | request em instância diferente compartilha contador; 429, IP e limites coerentes; restart não zera abuso efetivo |
| 3 | P3 | F003: sessão com active workspace inválido | decisão de UX e compatibilidade de sessions | média | cenário multi-org não escolhe implicitamente tenant diferente; remoção/revogação imediatamente impede nova ação |
| 4 | P3 / implementação local aguardando validação | F004: headers HTTP | executar spec de headers no Bazzite; identificar ingress/edge e HTTPS antes de HSTS | headers básicos localmente declarados; CSP permanece Report-Only e exige revisão de violações; média para enforcement | respostas locais confirmam headers em HTML/API/assets/CSV, CSP nonce por documento e cache privado preservado; respostas HTTPS autorizadas confirmam HSTS/cookies antes de qualquer status de produção |
| 5 | P2 de validação | ampliar autorização BOLA/IDOR e concorrência | URL/DB isolados verificados pela configuração existente | média | testes negativos por cada action/detail/CSV, session stale, membership removida e corrida |
| 6 | P3 | ampliar CSV/input/dependency checks | decidir suporte Excel/LibreOffice e Distrobox scanner | baixa/média | casos Unicode/control chars em parsers de planilha; audit de dependências triado por reachability |
| 7 | P3 | F005: reduzir logging de exceções não sanitizadas | escolher campos diagnósticos e retenção | baixa | canário sintético não aparece no sink/response; logs continuam correlacionáveis e úteis |

## SEC-01B proposta — validação dinâmica em ambiente isolado

1. Antes de executar, validar em memória (sem imprimir URL) que `TEST_DATABASE_URL` usa `127.0.0.1:5433`, banco `crm_test_isolated`, usuário `crm_test_admin`, protocolo PostgreSQL e senha não vazia; remover risco de `DATABASE_URL` fallback. Não tocar no contêiner `crm-postgres`, `.env.local` ou serviço externo.
2. Executar apenas testes E2E/integration já existentes autorizados e adicionar casos negativos sintéticos para BOLA, actions diretas, multi-org, sessão removida/revogada, CSRF/origin e falha de auditoria. Cleanup limitado às fixtures da organização e confirmada por IDs.
3. Capturar headers e cookies da aplicação de teste. Realizar fuzz limitado de inputs usando payloads sintéticos; não executar brute force/scan externo.
4. Revalidar testes de invariantes OWNER/M-01/I-01 e investigar erro histórico `The destination stream errored while writing data` com stack sanitizado e causalidade.

## SEC-01C proposta — correções controladas

Após aprovação do plano, corrigir um achado por PR/commit isolado, com testes de regressão e revisão de impacto. Sequência: F001; F002 se deployment distribuído; F003; F004 na camada proprietária. Reexecutar typecheck/lint/unit, testes isolados e regressão; atualizar findings para corrigidos somente após evidência real. Migrações só numa etapa própria autorizada e com plano de backup/rollout.

### Acompanhamento F001 — SEC-01C.1

A fronteira transacional e os testes de regressão de F001 foram implementados. O executor local aprovou typecheck, lint e 92 testes unitários; a integração com PostgreSQL isolado, regressão E2E completa e preflights ainda não foram executados. Manter F001 confirmado até essa validação dinâmica.

## Risco antes de produção

Antes de publicação, exigir evidência da configuração efetiva de Better Auth/TLS/cookies/rate limit, headers, DB least-privilege, observabilidade e backup/restore. Não há informação de infraestrutura suficiente neste repositório para avaliar o risco operacional de produção. A ausência dessa evidência permanece requisito em aberto, não confirmação de configuração insegura.
