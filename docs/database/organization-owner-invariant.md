# Invariante de OWNER por organização

## Proposta preparada

A migração `0001_organization_owner_guard.sql` serializa alterações destrutivas de papel/membership por organização e valida, no fim da transação, que toda organização ainda existente retenha ao menos uma membership OWNER. O preflight preventivo das rotas Better Auth continua útil para uma resposta amigável; não é a barreira de integridade.

O papel é texto, como exige o schema Better Auth. A detecção reconhece o token `owner` em uma lista separada por vírgulas, sem diferenciar maiúsculas/minúsculas e ignorando espaços, em linha com o uso de `split(",")` no Better Auth 1.7.14 e na aplicação.

## Serialização e MVCC

`organization_owner_guard` mantém uma linha de serialização para cada organização. Triggers `AFTER STATEMENT` em INSERT, DELETE e UPDATE de `member` incrementam essa linha para OWNERs inseridos/removidos e para qualquer UPDATE envolvendo uma membership OWNER. Em UPDATE de um OWNER entre organizações, os IDs antigo e novo são bloqueados. Uma instrução que atinge mais de uma organização bloqueia as linhas em ordem crescente de ID. A atualização mantém o row lock até o fim da transação. A captura por transition tables não correlaciona linhas via PK, então continua correta até se um DML direto também alterar `member.id`.

As funções que leem ou escrevem a guarda são `SECURITY DEFINER` com `search_path` fixo (`pg_catalog, pg_temp`), mantendo `pg_temp` explicitamente no fim. Todas as tabelas e funções do CRM são qualificadas como `public.*`, então a execução não depende de `public` estar no `search_path` nem de presumir seus grants de `CREATE`. O usuário da aplicação não precisa de acesso direto à tabela interna.

Nenhuma função interna precisa ser chamada diretamente pela aplicação. A migração revoga `EXECUTE` de `PUBLIC` depois de criar os triggers; PostgreSQL exige esse privilégio para criar o trigger, e a invocação posterior é feita pelo binding do trigger. A role que aplica a migração deve ser proprietária das tabelas existentes ou ter os privilégios de leitura necessários em `public.organization`/`public.member`; ela também passa a ser proprietária das funções e da guarda interna.

Triggers de constraint `DEFERRABLE INITIALLY DEFERRED` verificam o estado final após o lock. A função verificadora é `VOLATILE`: em READ COMMITTED, as consultas que ela executa recebem snapshot atualizado depois de esperar pelo lock. Em REPEATABLE READ/SERIALIZABLE, conflito concorrente na atualização da linha guard deve abortar a transação com erro de serialização em vez de prosseguir com uma contagem baseada em snapshot antigo; esta semântica ainda precisa ser exercitada no PostgreSQL 18 isolado. [PostgreSQL: volatilidade de funções](https://www.postgresql.org/docs/current/xfunc-volatility.html), [PostgreSQL 18: isolamento de transações](https://www.postgresql.org/docs/18/transaction-iso.html)

O erro de invariante é SQLSTATE `23514`, constraint `organization_requires_owner`. A falta inesperada da linha de guarda causa `organization_owner_guard_required`, também em `23514`, falhando fechado. Deadlocks entre locks das linhas guard são reduzidos pela ordem lexical. O DML adquire locks nas linhas `member` antes de chegar ao trigger de statement; operações multi-organização em ordens de linha opostas ainda podem gerar deadlock PostgreSQL (`40P01`). Nesse caso o PostgreSQL aborta uma transação sem violar a invariante; chamadas da aplicação deverão tratar o resultado como conflito/retry seguro, não como sucesso.

## Criação e exclusão de organizações

O Better Auth 1.7.14 cria a organização e a membership OWNER em operações sequenciais; a configuração atual do adapter Drizzle não oferece transação real (`transaction` fica desabilitada por padrão). Por isso, a migration 0001 não valida INSERT da organização no commit: fazê-lo bloquearia a criação existente entre os dois inserts. Ela cria a linha guard em `AFTER INSERT`, e a inserção posterior da membership OWNER completa o fluxo. Isoladamente, a 0001 cobre remoções, rebaixamentos e mudança de organização de OWNERs, mas não exige OWNER ao fim da transação de criação. A migration 0002 preparada em [`organization-creation-owner-0002.md`](organization-creation-owner-0002.md) acrescenta essa verificação para criação atômica; ainda precisa ser aplicada e validada no PostgreSQL isolado.

Excluir a organização inteira é diferente de retirar isoladamente seu último OWNER. Um trigger remove sua linha guard quando a organização é apagada; verificações diferidas ignoram apenas organizações que não existem mais no estado final. Assim, cleanup transacional de uma fixture pode apagar registros comerciais dependentes e depois a organização, enquanto um DELETE de memberships que deixe a organização viva é rejeitado. Não há flag, variável de sessão ou bypass genérico.

## Preflight e rollout

1. Antes da migração, executar somente `docs/sql/organization-owner-preflight.sql`. A consulta deve retornar zero linhas. Se houver resultados, bloquear o rollout e decidir o saneamento manualmente; não criar OWNERs automaticamente.
2. Aplicar a migração somente ao PostgreSQL isolado, com `TEST_DATABASE_URL` já disponibilizada no ambiente Distrobox e validada pelo config:

   ```bash
   distrobox enter laboratorio-node -- bash -lc 'cd ~/Ambiente/Projetos/crm-gestao-clientes && npm exec -- drizzle-kit migrate --config=drizzle.test.config.ts'
   ```

   O comando não foi executado nesta preparação. Não use `drizzle.config.ts`, `DATABASE_URL` ou `db:push` para esta validação.
3. Executar primeiro `npm run test:integration -- tests/integration/organization-last-owner-concurrency.test.ts`, depois a suíte completa de integração. Confirmar o estado persistido, SQLSTATE nos testes diretos e ausência de resíduos.

## Reversão

Não reverter automaticamente uma migração aplicada. No banco isolado, após interromper escritores e confirmar que nenhuma validação depende dela, a reversão estrutural é:

```sql
DROP TRIGGER IF EXISTS member_owner_required_after_update ON public.member;
DROP TRIGGER IF EXISTS member_owner_required_after_delete ON public.member;
DROP TRIGGER IF EXISTS member_owner_guard_before_truncate ON public.member;
DROP TRIGGER IF EXISTS member_owner_guard_after_update ON public.member;
DROP TRIGGER IF EXISTS member_owner_guard_after_insert ON public.member;
DROP TRIGGER IF EXISTS member_owner_guard_after_delete ON public.member;
DROP TRIGGER IF EXISTS organization_owner_guard_after_delete ON public.organization;
DROP TRIGGER IF EXISTS organization_owner_guard_after_insert ON public.organization;
DROP FUNCTION IF EXISTS public.crm_assert_organization_has_owner();
DROP FUNCTION IF EXISTS public.crm_reject_member_truncate();
DROP FUNCTION IF EXISTS public.crm_lock_owner_guard_after_member_update();
DROP FUNCTION IF EXISTS public.crm_lock_owner_guard_after_member_insert();
DROP FUNCTION IF EXISTS public.crm_lock_owner_guard_after_member_delete();
DROP FUNCTION IF EXISTS public.crm_lock_owner_guard_rows(text[]);
DROP FUNCTION IF EXISTS public.crm_remove_owner_guard_for_organization();
DROP FUNCTION IF EXISTS public.crm_ensure_owner_guard_for_organization();
DROP FUNCTION IF EXISTS public.crm_role_has_owner(text);
DROP TABLE IF EXISTS public.organization_owner_guard;
```

Isso remove a proteção transacional. Em ambiente real, preferir restaurar backup/snapshot validado e só reverter com janela de manutenção e decisão explícita. A remoção da migração do journal não faz parte desta instrução nem deve ser feita em bancos compartilhados.

## Pendências antes de declarar a correção

- Aplicar a migração no banco isolado apenas após o preflight.
- Fazer os três cenários HTTP concorrentes passarem com ao menos um OWNER persistido.
- Cobrir DELETE e UPDATE de papel por DML direto, remoção permitida quando sobra OWNER, movimento de OWNER entre organizações e serialização sob READ COMMITTED e REPEATABLE READ.
- Mapear, em uma etapa posterior, `23514` para resposta HTTP de conflito sem converter erros internos em sucesso.
- Aplicar e validar a migration 0002 preparada, incluindo criação atômica e concorrência sob os níveis de isolamento usados.
