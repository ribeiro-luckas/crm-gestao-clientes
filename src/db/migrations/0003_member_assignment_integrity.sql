-- Install tenant-scoped commercial assignment FKs without scanning existing
-- rows. New/updated assignments are checked immediately; historical rows are
-- checked later by 0004_member_assignment_integrity_validate.sql.
--
-- All changes are one Drizzle migration transaction: no point exists at which
-- the old user(id) FKs have been removed before all replacement FKs exist.
ALTER TABLE public.clients
  ADD CONSTRAINT clients_owner_member_assignment_fk
  FOREIGN KEY (organization_id, owner_user_id)
  REFERENCES public.member (organization_id, user_id)
  MATCH SIMPLE ON DELETE RESTRICT ON UPDATE RESTRICT NOT VALID;
--> statement-breakpoint

ALTER TABLE public.deals
  ADD CONSTRAINT deals_owner_member_assignment_fk
  FOREIGN KEY (organization_id, owner_user_id)
  REFERENCES public.member (organization_id, user_id)
  MATCH SIMPLE ON DELETE RESTRICT ON UPDATE RESTRICT NOT VALID;
--> statement-breakpoint

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_assignee_member_assignment_fk
  FOREIGN KEY (organization_id, assignee_user_id)
  REFERENCES public.member (organization_id, user_id)
  MATCH SIMPLE ON DELETE RESTRICT ON UPDATE RESTRICT NOT VALID;
--> statement-breakpoint

-- The original migration left these inline REFERENCES unnamed. Resolve their
-- actual names and verify target columns, MATCH SIMPLE, ON DELETE SET NULL,
-- and default ON UPDATE NO ACTION through the catalog; do not depend on
-- PostgreSQL or Drizzle's generated-name convention.
DO $$
DECLARE
  target record;
  target_attnum smallint;
  user_id_attnum smallint;
  matching_constraints integer;
  old_constraint record;
BEGIN
  SELECT a.attnum
    INTO user_id_attnum
    FROM pg_catalog.pg_attribute AS a
   WHERE a.attrelid = 'public.user'::regclass
     AND a.attname = 'id'
     AND NOT a.attisdropped;

  IF user_id_attnum IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Expected public.user(id) for the legacy assignment FKs.';
  END IF;

  FOR target IN
    SELECT *
      FROM (VALUES
        ('clients'::text, 'owner_user_id'::text),
        ('deals'::text, 'owner_user_id'::text),
        ('tasks'::text, 'assignee_user_id'::text)
      ) AS targets(table_name, column_name)
  LOOP
    SELECT a.attnum
      INTO target_attnum
      FROM pg_catalog.pg_attribute AS a
     WHERE a.attrelid = format('public.%I', target.table_name)::regclass
       AND a.attname = target.column_name
       AND NOT a.attisdropped;

    SELECT count(*)
      INTO matching_constraints
      FROM pg_catalog.pg_constraint AS c
     WHERE c.conrelid = format('public.%I', target.table_name)::regclass
       AND c.contype = 'f'
       AND c.confrelid = 'public.user'::regclass
       AND c.conkey = ARRAY[target_attnum]::smallint[]
       AND c.confkey = ARRAY[user_id_attnum]::smallint[]
       AND c.confmatchtype = 's'
       AND c.confdeltype = 'n'
       AND c.confupdtype = 'a';

    IF matching_constraints <> 1 THEN
      RAISE EXCEPTION USING
        ERRCODE = '55000',
        MESSAGE = format(
          'Expected exactly one legacy user FK for public.%I.%I; found %s.',
          target.table_name, target.column_name, matching_constraints
        );
    END IF;

    FOR old_constraint IN
      SELECT c.conname
        FROM pg_catalog.pg_constraint AS c
       WHERE c.conrelid = format('public.%I', target.table_name)::regclass
         AND c.contype = 'f'
         AND c.confrelid = 'public.user'::regclass
         AND c.conkey = ARRAY[target_attnum]::smallint[]
         AND c.confkey = ARRAY[user_id_attnum]::smallint[]
         AND c.confmatchtype = 's'
         AND c.confdeltype = 'n'
         AND c.confupdtype = 'a'
    LOOP
      EXECUTE format(
        'ALTER TABLE public.%I DROP CONSTRAINT %I',
        target.table_name, old_constraint.conname
      );
    END LOOP;
  END LOOP;
END;
$$;
