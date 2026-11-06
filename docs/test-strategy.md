# Estratégia de testes e aceite

## Camadas

- **Vitest unitário:** schemas Zod, regras de transição, motivo de perda, cálculos, permissões e normalização CSV.
- **Integração PostgreSQL:** migrations, FKs compostas, unicidade, soft delete, agregações, isolamento entre organizações e transações, sempre em DB descartável de teste.
- **Playwright E2E:** login/logout, rotas privadas, isolamento multi-tenant, clientes/oportunidades/tarefas, RBAC, proteção de membership, transferência de responsabilidades, busca/dashboard e exportação CSV. Matriz atualizada em `docs/e2e-audit.md`; cobertura de contatos, atividades, fluxos completos do Kanban, arquivamento/recuperação, filtros/paginação e responsividade ainda requer confirmação/casos E2E dedicados.
- **axe-core:** rotas e estados nos dois temas com meta WCAG 2.2 AA; complementar com teclado e leitor de tela manual.
- **Qualidade:** lint, TypeScript, build, migrations, auditoria de dependências e secrets.

## Aceitação

1. Cadastro público fechado; OWNER inicial e convites controlados.
2. Usuário A não lê/altera/vincula/agrega/exporta registros do tenant B, inclusive com UUID conhecido.
3. Papéis são aplicados também em actions/APIs do servidor.
4. Pessoa/empresa e contatos são cadastráveis; contato não pode pertencer a cliente pessoa física.
5. Deal cobre todas as etapas; perdido sem motivo é rejeitado; ganho/perda grava data e atualiza métricas.
6. Dinheiro mantém decimal exato em BRL; pipeline inclui somente aberto e não soma outras moedas.
7. Tarefa atrasada exclui concluída/cancelada; agenda ordena compromissos em America/Recife.
8. Busca/filtros/paginação/exportação preservam escopo organizacional; CSV neutraliza fórmulas.
9. Histórico é cronológico e auditoria não contém segredos nem PII desnecessária.
10. Fluxos operáveis por teclado, foco visível, mensagens anunciadas e sem violações axe conhecidas.
11. Reflow desktop/tablet/mobile e reduced-motion verificados.
12. Backup de teste restaura em ambiente descartável e confere dados essenciais.

Specs E2E existentes e preparadas devem ser executadas somente com `TEST_DATABASE_URL` validada para o banco isolado. A configuração inicia o servidor Next em modo `CRM_TEST_MODE` e as fixtures removem somente registros identificados da própria organização. Não use `DATABASE_URL` como origem do alvo de teste.
