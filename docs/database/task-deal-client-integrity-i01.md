# I-01 — Integridade tarefa, oportunidade e cliente

## Diagnóstico verificado no código

`deals.client_id` é `uuid NOT NULL`. Uma oportunidade sempre aponta para um cliente. `tasks.client_id` e `tasks.deal_id` são UUIDs opcionais; o formulário expõe “Sem cliente associado” e “Sem oportunidade associada”. A action aceita tarefa sem vínculos, só com cliente, só com oportunidade ou com ambos. Quando ambos são enviados, a action compara `clientId` com o `clientId` atual da oportunidade e rejeita divergência.

O banco tinha `tasks_client_same_org_fk` e `tasks_deal_same_org_fk`, que comprovam separadamente que cada alvo pertence à organização da tarefa. Não havia uma chave que comprovasse que os dois alvos representam o mesmo cliente. Assim, no teste I-01, a inserção direta de uma tarefa com o cliente A1 e a oportunidade O2 do cliente A2 satisfaz as duas FKs de tenant e é aceita; a Server Action rejeita essa combinação antes do INSERT. A falha está na ausência da regra relacional no banco, especialmente para SQL direto, integrações e concorrência.

`updateDeal` permite trocar o cliente de uma oportunidade e hoje não atualiza tarefas associadas. Tarefas não têm ação de edição dos vínculos. `setTaskStatus` altera somente estado. Arquivamento é lógico por `deleted_at`; não há exclusão física comum de cliente, oportunidade ou tarefa. As validações de criação exigem alvos ativos na aplicação, enquanto as FKs atuais (e a nova) tratam integridade sem distinguir `deleted_at`.

### Estados de NULL confirmados

| Tarefa | Comportamento atual | Regra preparada |
|---|---|---|
| Sem cliente e sem oportunidade | Permitido pelo formulário e pela action | Continua permitido |
| Cliente, sem oportunidade | Permitido | A FK atual verifica cliente na mesma organização |
| Oportunidade, sem cliente explícito | Permitido pelo formulário e pela action | Continua permitido por `MATCH SIMPLE`; a FK atual verifica oportunidade na mesma organização |
| Cliente e oportunidade | Permitido somente quando ambos apontam ao mesmo cliente | A nova FK composta exige igualdade |

O cliente de uma oportunidade não é opcional. A política aprovada é `ON UPDATE RESTRICT`: não há propagação automática para tarefas. Se existir tarefa com `deal_id` e `client_id` explícitos apontando ao par atual, a troca do cliente da oportunidade falha imediatamente com SQLSTATE `23001` e constraint `tasks_deal_client_consistency_fk`. Isso vale para tarefas ativas e arquivadas. A instrução não altera parcialmente o deal nem as tarefas.

INSERT/UPDATE de tarefa que apresente um par explícito divergente é rejeitado como violação de FK (SQLSTATE `23503`, constraint `tasks_deal_client_consistency_fk`). A violação de `RESTRICT` no lado referenciado, como a troca do cliente do deal, usa SQLSTATE `23001`; não tratar ambos os casos como o mesmo SQLSTATE.

Uma tarefa com `deal_id` preenchido e `client_id IS NULL` continua opcionalmente vinculada apenas à oportunidade por `MATCH SIMPLE`. Ela não bloqueia a troca de cliente, e seu `client_id` permanece NULL; o banco não o preenche implicitamente. Tarefa sem oportunidade ou sem ambos os vínculos também permanece permitida conforme as FKs existentes.

## Alternativas avaliadas

| Critério | FK composta | FK + CHECK | Trigger PostgreSQL |
|---|---|---|---|
| Integridade | Compara organização, oportunidade e cliente sob os locks referenciais do PostgreSQL | `CHECK` não pode consultar outra tabela; sozinho não comprova igualdade | Pode consultar as três linhas, mas precisa implementar serialização corretamente |
| Suporte a NULL | `MATCH SIMPLE` pula a verificação se `deal_id` ou `client_id` for NULL; FKs atuais cobrem tenant para cada relação presente | Ainda depende da FK composta e da semântica de NULL | Deve reproduzir manualmente os estados opcionais |
| Concorrência | RI nativa serializa chave referenciada e referência; RESTRICT rejeita atualização conflitante | Não resolve a comparação cross-table | SELECT sem lock adequado tem corrida; locks adicionais elevam complexidade/deadlocks |
| Complexidade | Um índice único candidato, índice filho e FK | Adiciona regra, sem substituir a comparação cross-table | Funções, triggers, ordem de locks, comportamento diferido e manutenção |
| Manutenção | Declarativa e visível no catálogo/Drizzle | Parcialmente declarativa | Procedural e mais difícil de auditar |
| Impacto operacional | Scan para índice único e validação posterior da FK | Similar, sem benefício suficiente | Lock/validação dependem da implementação |
| Compatibilidade | Drizzle 0.45.4 representa FK nomeada, `MATCH SIMPLE` (padrão) e ações; SQL fixa `MATCH SIMPLE` explicitamente | Não há `CHECK` útil que compare tabelas | Drizzle não modela a lógica do trigger no schema |

Estratégia preparada: índice único `(organization_id, id, client_id)` em `deals`, índice de busca `(organization_id, deal_id, client_id)` em `tasks` e FK nomeada tripla com `MATCH SIMPLE`, `ON DELETE RESTRICT`, `ON UPDATE RESTRICT`, inicialmente `NOT VALID`. A unique `(organization_id,id)` existente não substitui o índice único triplo exigido pelo PostgreSQL para a chave referenciada. As FKs de tenant atuais permanecem: elas cobrem task com `deal_id` e `client_id` opcionais separadamente.

Não é necessário `CHECK` cross-table nem trigger. A consistência ativa/arquivada é igual porque `deleted_at` não integra a chave e a nova FK verifica também linhas arquivadas. A regra de não criar novos vínculos com registros arquivados continua sendo uma validação da aplicação, como hoje.

## Concorrência e atualizações

- INSERT/UPDATE de tarefa com ambos os vínculos não pode confirmar um par divergente. A FK aponta para `(organization_id,id,client_id)` e usa locks de RI do PostgreSQL; uma troca concorrente de cliente da oportunidade serializa com a validação da referência.
- `UPDATE deals.client_id` é rejeitado se uma tarefa dependente tiver `client_id` explícito; PostgreSQL retorna `23001` com `tasks_deal_client_consistency_fk`. Nenhum `tasks.client_id` é propagado automaticamente. A regra também inclui tarefas arquivadas, pois `deleted_at` não participa da FK.
- Para trocar o cliente com tarefas explícitas, uma transação deve reconciliar cada dependência sob `RESTRICT` imediato: (1) definir `tasks.client_id = NULL` para as tarefas vinculadas ao deal, (2) alterar `deals.client_id`, (3) restaurar `tasks.client_id` para o novo cliente, ou deixar NULL quando essa for a associação desejada. Cada instrução precisa respeitar as FKs no momento em que executa; trocar primeiro o deal ou tentar alterar ambos os lados numa ordem inválida falha. A transação mantém a reconciliação atômica.
- A action `setTaskStatus` lê o vínculo, bloqueia a oportunidade primeiro e bloqueia a tarefa depois. A ordem deal → task evita o ciclo em que a mudança da chave do deal retém o pai e a verificação `RESTRICT` espera uma linha task, enquanto a action retém task e espera o deal. A action revalida o vínculo depois do lock e falha fechada se mudou em paralelo.
- A FK antiga de tarefa para oportunidade continua restringindo exclusão física também para tarefas com `client_id NULL`. Arquivamento lógico não remove a referência e não desativa a integridade.
- As actions `createTask` e `updateDeal` já bloqueiam linhas-alvo e validam organização. Essas verificações permanecem úteis para resposta de domínio; as FKs passam a ser a garantia final para acesso direto e corridas.
- O banco aceita tarefas somente com oportunidade por regra atual explícita. Se o produto decidir que toda tarefa com oportunidade deve materializar também `client_id`, a solução deverá incluir uma regra adicional e uma migração de dados previamente aprovada; não foi inferida nem preparada aqui.

## Preflight e rollout preparado

Executar `docs/sql/task-deal-client-integrity-preflight.sql` antes de 0005. O script inicia transação `READ ONLY`, fornece resumo por categoria, linhas para diagnóstico e contagens separadas dos estados opcionais. Inclui tarefas ativas e arquivadas e diagnósticos de tenant/opportunity/client. Qualquer inconsistência deve pausar o rollout; o script não sugere nem realiza saneamento.

0005 cria os índices e instala a FK `NOT VALID`. PostgreSQL verifica novos INSERTs/UPDATEs depois da instalação, sem varrer a tabela antiga. Linhas antigas inconsistentes continuam no banco e podem fazer alterações em suas chaves falharem; por isso o preflight é um gate antes da instalação. 0006 executa `VALIDATE CONSTRAINT` após o preflight continuar limpo.

O migrador PostgreSQL instalado lê todas as migrations pendentes e as executa dentro de uma única transação. Portanto, para separar instalação de validação e aproveitar a janela entre elas, a implantação deve ser feita em duas ondas de artefato: onda A registra/aplica somente 0005; depois do commit, repetir o preflight e observar as escritas; onda B inclui 0006 no journal e executa a validação. O journal de desenvolvimento já lista ambas, mas não se deve executar 0005 e 0006 juntas se a janela operacional de enforcement separado for requisito.

### Locks e impacto

- O índice único triplo em `deals` e o índice filho em `tasks` são construídos sem `CONCURRENTLY`, pois o migrador usa uma transação. A criação normal de índices obtém lock que pode bloquear escritas nas tabelas durante a construção; medir volume e escolher janela de baixo tráfego.
- `ADD FOREIGN KEY ... NOT VALID` adquire locks DDL em `tasks` e `deals`, mas não varre as linhas preexistentes. Escritas concorrentes são bloqueadas brevemente e, após instalação, validadas contra a nova FK.
- `VALIDATE CONSTRAINT` varre as tarefas existentes e usa locks menos restritivos que a criação da FK, permitindo DML ordinário; ainda consome I/O e deve ser monitorado.
- `ON UPDATE RESTRICT` não propaga nem altera tarefas. O endpoint atual de `updateDeal` pode receber erro do banco se houver dependências explícitas; qualquer fluxo de produto para reconciliar várias tarefas deverá ser explícito e transacional, com validação e auditoria, antes de ser oferecido.
- As tarefas arquivadas também precisam ser reconciliadas ou permanecer com `client_id NULL`; não podem ser ignoradas para permitir a troca do deal.
- RI nativa serializa validação de referência e alteração da chave do deal. Uma inserção concorrente com o par antigo aguarda a atualização concorrente e falha se ela confirmar primeiro; se a referência confirmar primeiro, a atualização do deal falha por `RESTRICT`. Ambas as ordens preservam a integridade. Deadlocks possíveis com outras rotinas são resolvidos pelo PostgreSQL abortando uma transação; actions relacionadas devem manter ordem de locks consistente.
- Não há remoção nem alteração das FKs M-01, da proteção OWNER ou das FKs atuais de tenant.

### Falha e recuperação

- Falha em 0005 dentro da transação: índices, FK e histórico dessa migração são revertidos juntos. Diagnosticar o erro; não aplicar comandos parciais manualmente.
- 0005 confirmado e 0006 falha: 0005 permanece registrada e a FK segue `NOT VALID`, protegendo novas alterações. Reexecutar preflight; qualquer saneamento requer plano e autorização explícitos. Depois, rodar o migrador normal para aplicar somente 0006 pendente. Nunca reaplicar 0005 manualmente nem editar `drizzle.__drizzle_migrations`.
- Se uma reversão for aprovada, restaurar estado operacional por migração revisada e backup verificado. Dropar a FK/índices reabre I-01. Prefira correção para frente. Testar qualquer restauração em um banco isolado separado antes de substituir o banco-alvo.

## Verificação futura

Após a onda B, confirmar no catálogo `convalidated = true` para `tasks_deal_client_consistency_fk`, presença dos dois índices preparados e entrada das migrations 0005/0006 em `drizzle.__drizzle_migrations`. Executar a suíte gated `tests/integration/task-deal-client-integrity.test.ts`, depois toda a regressão PostgreSQL. Nesta etapa os testes foram apenas preparados; nenhuma conexão ou migration foi executada.

Comandos para uso futuro, somente depois de validar `TEST_DATABASE_URL` para `crm_test_isolated` em `127.0.0.1:5433`. O primeiro comando valida o endpoint sem imprimir usuário/senha. Pare se falhar:

```sh
node -e 'const u=new URL(process.env.TEST_DATABASE_URL??"");if(!["postgres:","postgresql:"].includes(u.protocol)||u.hostname!=="127.0.0.1"||u.port!=="5433"||decodeURIComponent(u.pathname.slice(1))!=="crm_test_isolated"||decodeURIComponent(u.username)!=="crm_test_admin"||!u.password)process.exit(1);console.log("TEST_DATABASE_URL aponta para o destino isolado autorizado")'

# 1. Executar preflight, somente leitura.
env -u DATABASE_URL psql "$TEST_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f docs/sql/task-deal-client-integrity-preflight.sql

# 2. Inspecionar constraints e validação.
env -u DATABASE_URL psql "$TEST_DATABASE_URL" -X -v ON_ERROR_STOP=1 -c "SELECT conrelid::regclass AS table_name, conname, contype, convalidated, pg_get_constraintdef(oid) AS definition FROM pg_catalog.pg_constraint WHERE conname IN ('tasks_client_same_org_fk','tasks_deal_same_org_fk','deals_client_same_org_fk','tasks_deal_client_consistency_fk','clients_owner_member_assignment_fk','deals_owner_member_assignment_fk','tasks_assignee_member_assignment_fk') ORDER BY table_name, conname;"

# Inspecionar índices que suportam a nova FK.
env -u DATABASE_URL psql "$TEST_DATABASE_URL" -X -v ON_ERROR_STOP=1 -c "SELECT schemaname, tablename, indexname, indexdef FROM pg_catalog.pg_indexes WHERE schemaname='public' AND indexname IN ('deals_org_id_uidx','deals_org_id_client_id_uidx','tasks_org_deal_client_idx') ORDER BY tablename, indexname;"

# 3. Criar e listar backup customizado; escolha um caminho local seguro.
pg_dump --format=custom --file=/caminho/seguro/crm_test_isolated-before-i01.dump "$TEST_DATABASE_URL"
pg_restore --list /caminho/seguro/crm_test_isolated-before-i01.dump

# 4. Revisar o SQL e o journal antes de compor o artefato de implantação.
sed -n '1,220p' src/db/migrations/0005_task_deal_client_consistency.sql
sed -n '1,120p' src/db/migrations/0006_task_deal_client_consistency_validate.sql
cat src/db/migrations/meta/_journal.json

# 5. Somente após autorização: onda A usa artefato/journal que termina em 0005.
env -u DATABASE_URL npx drizzle-kit migrate --config=drizzle.test.config.ts

# Repetir o preflight e conferir convalidated=false antes da onda B.
env -u DATABASE_URL psql "$TEST_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f docs/sql/task-deal-client-integrity-preflight.sql

# Onda B inclui 0006 no journal; só prosseguir com preflight sem inconsistências.
env -u DATABASE_URL npx drizzle-kit migrate --config=drizzle.test.config.ts

# 6. Teste PostgreSQL específico depois de 0006 estar validada.
env -u DATABASE_URL RUN_TASK_DEAL_CLIENT_INTEGRITY_TESTS=1 npm run test:integration -- tests/integration/task-deal-client-integrity.test.ts

# 7. Regressão PostgreSQL completa, incluindo suites gated como I-01.
env -u DATABASE_URL RUN_TASK_DEAL_CLIENT_INTEGRITY_TESTS=1 RUN_MEMBER_ASSIGNMENT_INTEGRITY_TESTS=1 npm run test:integration
```

Os comandos acima são instruções futuras e não foram executados. Use `env -u DATABASE_URL` no executor se essa variável estiver definida; `drizzle.test.config.ts` exige `TEST_DATABASE_URL` no host/porta/banco/usuário isolados e compara o alvo com `DATABASE_URL` se presente.
