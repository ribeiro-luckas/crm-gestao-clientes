-- Make the existing OWNER invariant apply to newly created organizations.
-- The deferred check permits organization and first OWNER inserts in one
-- transaction, while rejecting an ownerless organization at commit.

-- Match migration 0001's preflight lock: no organization/member DML may pass
-- between the read-only rollout gate and installation of this trigger.
LOCK TABLE public.organization, public.member IN SHARE ROW EXCLUSIVE MODE;
--> statement-breakpoint

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
        WHERE m.organization_id = o.id
          AND EXISTS (
            SELECT 1
              FROM unnest(string_to_array(coalesce(m.role, ''), ',')) AS role_token(value)
             WHERE lower(btrim(role_token.value)) = 'owner'
          )
     )
  )
  SELECT count(*), (
      SELECT string_agg(sample.id, ', ' ORDER BY sample.id)
        FROM (SELECT id FROM ownerless ORDER BY id LIMIT 20) AS sample
    )
    INTO ownerless_total, ownerless_ids
    FROM ownerless;

  IF ownerless_total > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'organization_requires_owner',
      MESSAGE = 'Migration blocked: existing organizations without OWNER memberships require explicit review.',
      DETAIL = format('Count: %s. Sample organization IDs: %s', ownerless_total, ownerless_ids);
  END IF;
END;
$$;
--> statement-breakpoint

CREATE FUNCTION public.crm_assert_new_organization_has_owner()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  -- Share the per-organization serialization point with migration 0001's
  -- membership INSERT/DELETE/UPDATE triggers. The helper skips organizations
  -- already deleted in this transaction, which keeps scoped fixture cleanup valid.
  PERFORM public.crm_lock_owner_guard_rows(ARRAY[NEW.id]);

  IF NOT EXISTS (
    SELECT 1 FROM public.organization AS o WHERE o.id = NEW.id
  ) THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.member AS m
     WHERE m.organization_id = NEW.id
       AND public.crm_role_has_owner(m.role)
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'organization_requires_owner',
      MESSAGE = 'An organization must have at least one OWNER membership when its creation transaction commits.';
  END IF;

  RETURN NULL;
END;
$$;
--> statement-breakpoint

CREATE CONSTRAINT TRIGGER organization_owner_required_after_insert
AFTER INSERT ON public.organization
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.crm_assert_new_organization_has_owner();
--> statement-breakpoint

-- The function is invoked only through its trigger binding, never directly by
-- the application role. Its SECURITY DEFINER owner can call the private
-- serialization helper and inspect the two auth tables.
REVOKE ALL ON FUNCTION public.crm_assert_new_organization_has_owner() FROM PUBLIC;
