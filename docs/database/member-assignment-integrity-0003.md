# M-01 — Integridade de atribuições comerciais

## Constraints

The schema model declares:

| Constraint | Referencing columns | Referenced columns | Actions |
| --- | --- | --- | --- |
| `clients_owner_member_assignment_fk` | `clients(organization_id, owner_user_id)` | `member(organization_id, user_id)` | MATCH SIMPLE, DELETE RESTRICT, UPDATE RESTRICT |
| `deals_owner_member_assignment_fk` | `deals(organization_id, owner_user_id)` | `member(organization_id, user_id)` | MATCH SIMPLE, DELETE RESTRICT, UPDATE RESTRICT |
| `tasks_assignee_member_assignment_fk` | `tasks(organization_id, assignee_user_id)` | `member(organization_id, user_id)` | MATCH SIMPLE, DELETE RESTRICT, UPDATE RESTRICT |

The existing `member_org_user_uidx` supports the referenced key. Each assignment column remains nullable. With MATCH SIMPLE, a NULL assignment does not require a membership row. Organization IDs remain non-NULL, so a non-NULL user ID must have a membership in that same organization.

The initial migration used unnamed inline references from each assignment column to `user(id)`, with `ON DELETE SET NULL` and default `ON UPDATE NO ACTION`. On a database created from 0000, PostgreSQL's conventional names are `clients_owner_user_id_fkey`, `deals_owner_user_id_fkey`, and `tasks_assignee_user_id_fkey`; migration 0003 does not rely on those names. It identifies each old FK through `pg_constraint` by local and referenced attribute numbers, referenced relation, MATCH SIMPLE, delete action, and update action, requires exactly one match, then drops its catalog-resolved name. PostgreSQL catalogs encode those properties in `conkey`, `confkey`, `confmatchtype`, `confdeltype`, and `confupdtype`. [PostgreSQL 18 `pg_constraint`](https://www.postgresql.org/docs/18/catalog-pg-constraint.html).

The current schema has no durable ledger mapping past membership removals to organization and user IDs. The preflight can identify a user with no current membership, but cannot prove whether that membership was removed previously or never existed. It reports that distinction as `membership_missing_or_removed` for manual review.

## Rollout sequence

1. Take and verify the normal backup and confirm the intended database identity using the deployment process.
2. Run the read-only preflight in [member-assignment-integrity-preflight.sql](../sql/member-assignment-integrity-preflight.sql), including its row-level output. It includes archived rows. Review every finding; this script never changes data. If it reports any invalid row, stop before applying migrations and obtain an explicit, tenant-scoped remediation decision.
3. Important: the installed Drizzle ORM 0.45.4 migrator implementation (`node_modules/drizzle-orm/pg-core/dialect.js`, `PgDialect.migrate`) executes the loop over all pending migrations inside one `session.transaction`; it inserts each history row inside that loop. With 0003 and 0004 both pending in the current journal, one `drizzle-kit migrate` call runs them in the same transaction. If 0004 validation fails, PostgreSQL rolls back 0003's DDL and both history inserts too. The legacy FKs remain; none of the new FKs persist as `NOT VALID`.
4. With both entries pending, run the migrator only after preflight findings are cleared. If a bad row raced with preflight, the combined migration fails atomically. Rerun preflight, obtain an explicit remediation decision, remediate with scoped reviewed SQL, then rerun the normal migrator. Do not execute migration SQL or `VALIDATE CONSTRAINT` manually; after rollback, both entries remain pending, so the standard runner retries the batch.
5. If an operational window between enforcement and validation is required, publish in two deployment waves: wave A contains/registers only 0003 in its journal and runs the normal migrator; after its transaction commits, wave B adds/registers 0004 and runs the migrator again. Then a 0004 failure rolls back only its own transaction, preserves 0003 and new-write enforcement, and the normal migrator can retry 0004 after remediation without replaying 0003. The current checked-in journal has both entries, so it does **not** implement this staged mode; prepare the wave-A artifact/journal explicitly before deployment.
6. Confirm applied migration history and that all three catalog constraints have `convalidated = true`, then deploy/verify the application version whose Drizzle schema contains the three named composite keys.

Separate SQL files alone do not guarantee separate transactions in this Drizzle version. In the current one-call/two-pending case, locks acquired by 0003 remain held through 0004 validation, so the main benefit of `NOT VALID` is realized only if 0003 is committed in a separate deployment invocation.

## Locks and operational impact

Adding each FK takes a SHARE ROW EXCLUSIVE lock on the referencing and referenced relations. Dropping a constraint requires a strong lock on the referencing table. Migration 0003 holds these locks until its transaction commits, briefly blocking writes (and potentially other DDL) on `clients`, `deals`, `tasks`, and `member`; it does not scan the referencing rows when adding the constraints as NOT VALID. Plan a low-traffic window, watch lock waits, and set the operational statement/lock timeout using the deployment runner. Do not split the statements of 0003 across transactions.

Migration 0004 scans existing referencing rows. When run in a separate invocation after 0003 commits, PostgreSQL uses a SHARE UPDATE EXCLUSIVE lock for validation, allowing ordinary reads and writes to continue; concurrent writes are already checked by the NOT VALID FK. Validation can still consume I/O, so observe database load. If both migrations run in the same migrator transaction, stronger locks acquired by 0003 remain held through the scan.

## Delete, leave, and membership movement

Deleting a membership that is referenced by any client, deal, or task now fails with SQLSTATE `23503` and the corresponding named constraint. Archived rows retain their assignments and also block deletion. There is no implicit SET NULL. The membership removal/leave flow must first perform a valid transfer or explicit unassignment in the same organization. Deleting a user cascades to memberships in Better Auth's schema, so any assigned membership can now block the entire user deletion too; session/account cascades do not override this restriction.

Updating a membership's `organization_id` or `user_id` while assignments reference its old key fails with RESTRICT. An organization transfer must first reassign/unassign all commercial references, then move membership. Existing activity and audit actor FKs still point to `user(id)` with RESTRICT and are unchanged; the new constraints do not delete or rewrite historical activity/audit rows.

## HTTP error handling proposal

The auth route wrapper currently maps only the exact last-OWNER invariant (`organization_requires_owner`) on `leave` and `remove-member`. Existing application hooks reject known assigned-member removals earlier, but a concurrent assignment, a direct Better Auth operation, or another database client can reach the new FK. Better Auth may then return its generic server error for SQLSTATE 23503. A follow-up HTTP change should capture only the three exact M-01 constraint names, only within the leave/remove-member request context, and return HTTP 409 with a stable assignment-conflict code. It must preserve the existing OWNER mapping and must not map arbitrary 23503 errors. This proposal is deliberately separate from this schema/migration preparation.

## Drizzle representation

Drizzle 0.45.4 models the named composite FKs and RESTRICT actions. PostgreSQL's MATCH SIMPLE is the default and is implicit in Drizzle's emitted schema, so the SQL migration spells it out for review. Drizzle has no schema-level representation of a NOT VALID state. During the intermediate 0003 state, the schema describes the intended fully validated end state; catalog validation state differs until 0004. After 0004, the relation definition and schema model align. Do not use schema push/generation to reconcile the intermediate state.

## Status, retry, and recovery

Applied Drizzle migrations are recorded in `drizzle.__drizzle_migrations`. To inspect the registered history:

```sql
SELECT id, hash, created_at
  FROM drizzle.__drizzle_migrations
 ORDER BY created_at;
```

To find an unvalidated FK, inspect `pg_constraint.convalidated`:

```sql
SELECT conrelid::regclass AS table_name, conname, convalidated
  FROM pg_catalog.pg_constraint
 WHERE conname IN (
   'clients_owner_member_assignment_fk',
   'deals_owner_member_assignment_fk',
   'tasks_assignee_member_assignment_fk'
 )
 ORDER BY conname;
```

After the combined 0003+0004 transaction fails, expect neither migration entry nor any of the three new constraints; do not try to validate a missing constraint. Rerun preflight, obtain approval for data remediation, then rerun the normal migrator, which applies the pending pair. In a two-wave deployment, 0003 is already in history and its constraints remain. A failed 0004 leaves its history row absent and its constraints with `convalidated = false`; after approved remediation, rerun the migrator to apply only pending 0004. Never update the migration-history table by hand.

If backup recovery is necessary, restore the verified backup to a separate isolated PostgreSQL target first, validate application and data there, then use the approved restore/cutover process. Do not restore over the source database as an ad-hoc response to a failed migration.

## Reversal

Do not reverse by restoring the old ON DELETE SET NULL behavior without first reviewing all assignments and reconfirming the vulnerability risk. A technical rollback, if explicitly approved, must be one transaction that restores one FK to `user(id)` with ON DELETE SET NULL for each entity before dropping the corresponding composite FK. Resolve exact catalog names rather than guessing. Rolling back after enforcement has prevented cross-tenant assignments is structurally safe, but it weakens tenant integrity and reintroduces M-01; it is not the default recovery path.

## Isolated PostgreSQL verification commands

Only run these later against the dedicated test database. Use a fresh, explicitly scoped isolated URL; do not source `.env.local`. These are documented commands, not executed as part of this preparation.

```sh
TEST_DATABASE_URL='postgresql://crm_test_admin:<isolated-secret>@127.0.0.1:5433/crm_test_isolated' \
  npx drizzle-kit migrate --config=drizzle.test.config.ts

RUN_MEMBER_ASSIGNMENT_INTEGRITY_TESTS=1 \
TEST_DATABASE_URL='postgresql://crm_test_admin:<isolated-secret>@127.0.0.1:5433/crm_test_isolated' \
  npx vitest run --config=vitest.integration.config.ts tests/integration/member-assignment-integrity.test.ts
```

Migration 0003/0004 are not applied in this preparation. The integration suite refuses to run unless explicitly enabled and verifies all three constraints are installed and validated before any case executes.
