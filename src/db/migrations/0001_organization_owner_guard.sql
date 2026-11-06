-- Keep every committed, existing organization associated with at least one
-- OWNER. The application preflight remains useful for a friendly response;
-- these triggers are the transactional enforcement boundary.

-- The Drizzle PostgreSQL migrator runs each migration in one transaction.
-- Block membership/organization writes from preflight through trigger install.
LOCK TABLE public.organization, public.member IN SHARE ROW EXCLUSIVE MODE;

DO $$
DECLARE
  ownerless_ids text;
  ownerless_total bigint;
BEGIN
  WITH ownerless AS (
    SELECT o.id
      FROM public.organization AS o
     WHERE NOT EXISTS (
       SELECT 1
         FROM public.member AS m
         CROSS JOIN LATERAL unnest(string_to_array(coalesce(m.role, ''), ',')) AS role_token(value)
        WHERE m.organization_id = o.id
          AND lower(btrim(role_token.value)) = 'owner'
     )
  )
  SELECT count(*), (SELECT string_agg(sample.id, ', ' ORDER BY sample.id)
                      FROM (SELECT id FROM ownerless ORDER BY id LIMIT 20) AS sample)
    INTO ownerless_total, ownerless_ids
    FROM ownerless;

  IF ownerless_total > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'organization_requires_owner',
      MESSAGE = 'Migration blocked: existing organizations without OWNER memberships must be reviewed before rollout.',
      DETAIL = format('Count: %s. Sample organization IDs: %s', ownerless_total, ownerless_ids);
  END IF;
END;
$$;

CREATE TABLE public.organization_owner_guard (
  organization_id text PRIMARY KEY,
  revision bigint NOT NULL DEFAULT 0
);

INSERT INTO public.organization_owner_guard (organization_id)
SELECT id FROM public.organization ORDER BY id;

CREATE FUNCTION public.crm_role_has_owner(role_value text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM unnest(string_to_array(coalesce(role_value, ''), ',')) AS role_token(value)
     WHERE lower(btrim(role_token.value)) = 'owner'
  );
$$;

CREATE FUNCTION public.crm_ensure_owner_guard_for_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  INSERT INTO public.organization_owner_guard (organization_id)
  VALUES (NEW.id)
  ON CONFLICT (organization_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER organization_owner_guard_after_insert
AFTER INSERT ON public.organization
FOR EACH ROW
EXECUTE FUNCTION public.crm_ensure_owner_guard_for_organization();

CREATE FUNCTION public.crm_remove_owner_guard_for_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  DELETE FROM public.organization_owner_guard WHERE organization_id = OLD.id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER organization_owner_guard_after_delete
AFTER DELETE ON public.organization
FOR EACH ROW
EXECUTE FUNCTION public.crm_remove_owner_guard_for_organization();

CREATE FUNCTION public.crm_lock_owner_guard_rows(organization_ids text[])
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  target_organization_id text;
BEGIN
  -- A stable lexical lock order avoids guard-row deadlocks for multi-org DML.
  FOR target_organization_id IN
    SELECT DISTINCT candidate.organization_id
      FROM unnest(coalesce(organization_ids, ARRAY[]::text[])) AS candidate(organization_id)
     WHERE candidate.organization_id IS NOT NULL
       AND EXISTS (SELECT 1 FROM public.organization AS o WHERE o.id = candidate.organization_id)
     ORDER BY candidate.organization_id
  LOOP
    UPDATE public.organization_owner_guard
       SET revision = revision + 1
     WHERE organization_id = target_organization_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'organization_owner_guard_required',
        MESSAGE = 'OWNER integrity guard is missing for an existing organization.';
    END IF;
  END LOOP;
END;
$$;

CREATE FUNCTION public.crm_lock_owner_guard_after_member_delete()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  affected_organizations text[];
BEGIN
  SELECT array_agg(DISTINCT old_member.organization_id ORDER BY old_member.organization_id)
    INTO affected_organizations
    FROM old_members AS old_member
   WHERE public.crm_role_has_owner(old_member.role);

  PERFORM public.crm_lock_owner_guard_rows(affected_organizations);
  RETURN NULL;
END;
$$;

CREATE TRIGGER member_owner_guard_after_delete
AFTER DELETE ON public.member
REFERENCING OLD TABLE AS old_members
FOR EACH STATEMENT
EXECUTE FUNCTION public.crm_lock_owner_guard_after_member_delete();

CREATE FUNCTION public.crm_lock_owner_guard_after_member_insert()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  affected_organizations text[];
BEGIN
  SELECT array_agg(DISTINCT new_member.organization_id ORDER BY new_member.organization_id)
    INTO affected_organizations
    FROM new_members AS new_member
   WHERE public.crm_role_has_owner(new_member.role);

  PERFORM public.crm_lock_owner_guard_rows(affected_organizations);
  RETURN NULL;
END;
$$;

CREATE TRIGGER member_owner_guard_after_insert
AFTER INSERT ON public.member
REFERENCING NEW TABLE AS new_members
FOR EACH STATEMENT
EXECUTE FUNCTION public.crm_lock_owner_guard_after_member_insert();

CREATE FUNCTION public.crm_lock_owner_guard_after_member_update()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  affected_organizations text[];
BEGIN
  SELECT array_agg(affected.organization_id ORDER BY affected.organization_id)
    INTO affected_organizations
    FROM (
      SELECT old_member.organization_id
        FROM old_members AS old_member
       WHERE public.crm_role_has_owner(old_member.role)
      UNION
      SELECT new_member.organization_id
        FROM new_members AS new_member
       WHERE public.crm_role_has_owner(new_member.role)
    ) AS affected;

  PERFORM public.crm_lock_owner_guard_rows(affected_organizations);
  RETURN NULL;
END;
$$;

CREATE TRIGGER member_owner_guard_after_update
AFTER UPDATE ON public.member
REFERENCING OLD TABLE AS old_members NEW TABLE AS new_members
FOR EACH STATEMENT
EXECUTE FUNCTION public.crm_lock_owner_guard_after_member_update();

CREATE FUNCTION public.crm_reject_member_truncate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.organization) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'organization_requires_owner',
      MESSAGE = 'TRUNCATE of memberships is not allowed while organizations exist.';
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER member_owner_guard_before_truncate
BEFORE TRUNCATE ON public.member
FOR EACH STATEMENT
EXECUTE FUNCTION public.crm_reject_member_truncate();

CREATE FUNCTION public.crm_assert_organization_has_owner()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  affected_organization_id text;
  owner_was_removed boolean := false;
BEGIN
  IF TG_OP = 'DELETE' THEN
    affected_organization_id := OLD.organization_id;
    owner_was_removed := public.crm_role_has_owner(OLD.role);
  ELSE
    affected_organization_id := OLD.organization_id;
    owner_was_removed := public.crm_role_has_owner(OLD.role)
      AND (
        OLD.organization_id IS DISTINCT FROM NEW.organization_id
        OR NOT public.crm_role_has_owner(NEW.role)
      );
  END IF;

  IF NOT owner_was_removed THEN
    RETURN NULL;
  END IF;

  -- Deleting an entire organization is distinct from leaving an existing
  -- organization without an OWNER. This also permits scoped fixture cleanup.
  IF NOT EXISTS (SELECT 1 FROM public.organization WHERE id = affected_organization_id) THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.member AS m
     WHERE m.organization_id = affected_organization_id
       AND public.crm_role_has_owner(m.role)
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'organization_requires_owner',
      MESSAGE = 'An existing organization must retain at least one OWNER membership.';
  END IF;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER member_owner_required_after_delete
AFTER DELETE ON public.member
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.crm_assert_organization_has_owner();

CREATE CONSTRAINT TRIGGER member_owner_required_after_update
AFTER UPDATE ON public.member
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.crm_assert_organization_has_owner();

-- No application code calls these functions. Triggers retain their bindings,
-- while ad-hoc SECURITY DEFINER execution is not granted to PUBLIC.
REVOKE ALL ON FUNCTION public.crm_ensure_owner_guard_for_organization() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.crm_remove_owner_guard_for_organization() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.crm_lock_owner_guard_rows(text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.crm_lock_owner_guard_after_member_delete() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.crm_lock_owner_guard_after_member_insert() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.crm_lock_owner_guard_after_member_update() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.crm_reject_member_truncate() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.crm_assert_organization_has_owner() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.crm_role_has_owner(text) FROM PUBLIC;
