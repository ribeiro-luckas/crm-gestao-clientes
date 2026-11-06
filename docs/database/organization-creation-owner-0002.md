# Migration 0002: OWNER obrigatório na criação de organização

## Estado

A migration `0002_organization_creation_owner_required.sql` está preparada e registrada no journal Drizzle, mas ainda **não foi aplicada**. A invariante de criação não deve ser considerada ativa até a aplicação e a validação no PostgreSQL isolado.

## Regra e interação com 0001

A 0002 instala um constraint trigger `AFTER INSERT` em `public.organization`, `DEFERRABLE INITIALLY DEFERRED`. No fim da transação, a função:

1. Reutiliza `public.crm_lock_owner_guard_rows(ARRAY[NEW.id])`, o ponto de serialização por organização de 0001.
2. Ignora somente o caso em que a organização já não existe no estado final da transação, como no cleanup transacional de uma fixture.
3. Exige uma linha em `public.member` cujo papel contenha o token `owner`, usando `public.crm_role_has_owner` e a mesma interpretação de lista separada por vírgulas de 0001.
4. Falha com SQLSTATE `23514` e constraint `organization_requires_owner` se a organização continua existindo sem OWNER.

O preflight da migration também bloqueia `public.organization` e `public.member` em `SHARE ROW EXCLUSIVE` antes de contar organizações sem OWNER. Isso fecha a janela entre o diagnóstico e a instalação do trigger. Resultados do preflight bloqueiam o rollout; não se criam OWNERs nem se removem organizações automaticamente.

As referências às tabelas/funções são qualificadas em `public`. A função de trigger usa `SECURITY DEFINER`, `search_path = pg_catalog, pg_temp`, e revoga `EXECUTE` de `PUBLIC`; ela é chamada pelo binding do trigger, não pela aplicação. Ela reutiliza as funções internas instaladas em 0001, sem criar bypass ou alterar suas permissões. Por isso, a role que aplica 0002 deve ser a mesma role proprietária das funções privadas de 0001 (ou possuir explicitamente os privilégios necessários sem concedê-los à role da aplicação); confirme essa identidade antes do rollout.

## MVCC e concorrência

O protocolo reaproveita a linha `organization_owner_guard`. Os triggers imediatos de 0001 adquirem essa linha nas mutações de memberships OWNER e mantêm o lock até o fim da transação. A verificação diferida da 0002 usa o mesmo helper antes de ler o estado final. Em `READ COMMITTED`, a consulta executada depois de esperar pelo lock deve observar o estado confirmado mais recente; conflito sobre a guarda em `REPEATABLE READ`/`SERIALIZABLE` pode causar erro de serialização, que é falha segura, mas precisa ser validado no PostgreSQL 18. Os testes preparados exercitam `READ COMMITTED`; não comprovam todos os schedules ou níveis de isolamento.

O INSERT de `organization` cria sua linha de guarda por trigger de 0001. A membership OWNER inserida na mesma transação participa do mesmo protocolo. Um INSERT de organização sem OWNER não pode ser “resgatado” por uma transação posterior: seu commit deve falhar e a FK da tentativa posterior não encontrará a organização. A criação e a exclusão da própria organização na mesma transação é aceita porque a verificação diferida constata que o registro já não existe; a proteção de DELETE/UPDATE de membership de 0001 permanece ativa.

## Preflight somente leitura

O arquivo [`../sql/organization-owner-preflight.sql`](../sql/organization-owner-preflight.sql) deve retornar zero linhas antes da aplicação. A query considera papéis contendo o token `owner`, sem diferenciar maiúsculas/minúsculas e ignorando espaços. Se retornar qualquer organização, revisar e sanear por uma decisão operacional explícita; nunca criar OWNER automaticamente.

## Procedimento futuro: somente `crm_test_isolated`

Execute estes passos somente no Distrobox `laboratorio-node`, depois de disponibilizar `TEST_DATABASE_URL` nesse ambiente. Não copie a URL para logs ou comandos registrados. O `drizzle.test.config.ts` valida host `127.0.0.1`, porta `5433`, database `crm_test_isolated` e usuário `crm_test_admin`; não use `drizzle.config.ts`, `.env.local`, `DATABASE_URL` ou `db:push`.

1. Confira que `TEST_DATABASE_URL` está definida sem imprimir seu valor.
2. Faça backup custom-format do banco isolado:

   ```bash
   distrobox enter laboratorio-node -- bash -lc 'cd ~/Ambiente/Projetos/crm-gestao-clientes && test -n "${TEST_DATABASE_URL:-}" && pg_dump --format=custom --no-owner --file=/tmp/crm_test_isolated-before-0002.dump "$TEST_DATABASE_URL"'
   ```

3. Execute o preflight e confirme que não há linhas:

   ```bash
   distrobox enter laboratorio-node -- bash -lc 'cd ~/Ambiente/Projetos/crm-gestao-clientes && psql "$TEST_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f docs/sql/organization-owner-preflight.sql'
   ```

4. Aplique somente a próxima migration Drizzle usando a configuração isolada:

   ```bash
   distrobox enter laboratorio-node -- bash -lc 'cd ~/Ambiente/Projetos/crm-gestao-clientes && npm exec -- drizzle-kit migrate -- --config=drizzle.test.config.ts'
   ```

5. Verifique o trigger, seu estado diferido e a função:

   ```sql
   SELECT c.relname AS table_name, t.tgname, t.tgdeferrable, t.tginitdeferred, t.tgenabled,
          p.proname AS function_name, p.prosecdef
     FROM pg_trigger AS t
     JOIN pg_class AS c ON c.oid = t.tgrelid
     JOIN pg_proc AS p ON p.oid = t.tgfoid
    WHERE c.relnamespace = 'public'::regnamespace
      AND t.tgname = 'organization_owner_required_after_insert'
      AND NOT t.tgisinternal;
   ```

   Deve existir uma linha em `organization`, com `tgdeferrable = true`, `tginitdeferred = true`, `tgenabled = 'O'` e função `prosecdef = true`. Consulte também `drizzle.__drizzle_migrations` e confirme o hash/registro de `0002_organization_creation_owner_required` sem editar o journal manualmente.

6. Execute primeiro os testes específicos e depois a regressão PostgreSQL:

   ```bash
   distrobox enter laboratorio-node -- npm run test:integration -- tests/integration/organization-creation-owner-invariant.test.ts
   distrobox enter laboratorio-node -- npm run test:integration -- tests/integration/organization-last-owner-concurrency.test.ts
   distrobox enter laboratorio-node -- npm run test:integration
   ```

## Diagnóstico e reversão controlada

- `23514 / organization_requires_owner`: verificar se a fixture ou o fluxo cria organização e OWNER na mesma transação; verificar resultados do preflight. Não contornar o trigger.
- `23514 / organization_owner_guard_required`: há organização sem linha da guarda; parar o rollout e investigar a consistência de 0001.
- `40P01` ou `40001`: registrar a operação e o nível de isolamento, confirmar rollback integral, e investigar ordem de locks/retry; não tratar como sucesso.
- Timeout nos testes: verificar sessões, `pg_blocking_pids`, `wait_event_type` e transações abertas usando conexão de monitoramento independente; não aumentar timeouts para mascarar lock waits.

Para reversão do banco isolado, a opção preferida é restaurar o backup validado em um `crm_test_isolated` descartável ou reconstruído. A remoção manual do trigger/função enquanto o registro da migration permanece no journal produz um estado divergente; não apague entradas do journal como rotina de rollback. Em ambiente compartilhado, prefira uma migration corretiva para frente e decisão operacional explícita. A reversão da 0002 nunca deve remover os triggers ou a tabela de guarda da 0001.
