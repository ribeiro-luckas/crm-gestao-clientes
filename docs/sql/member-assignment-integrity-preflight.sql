-- Read-only M-01 preflight. Includes active and archived rows.
-- Run against the target only after verifying the connection identity.
-- This query never changes or automatically unassigns data.
-- The current schema does not retain a durable organization_id/user_id
-- membership-removal ledger. Therefore membership_missing_or_removed means
-- no membership exists now; SQL cannot prove whether it was never created or
-- was removed in the past.
WITH assignments AS (
  SELECT 'clients'::text AS entity, c.id::text AS record_id,
         c.organization_id, c.owner_user_id AS assigned_user_id, c.deleted_at
    FROM public.clients AS c
   WHERE c.owner_user_id IS NOT NULL
  UNION ALL
  SELECT 'deals', d.id::text, d.organization_id, d.owner_user_id, d.deleted_at
    FROM public.deals AS d
   WHERE d.owner_user_id IS NOT NULL
  UNION ALL
  SELECT 'tasks', t.id::text, t.organization_id, t.assignee_user_id, t.deleted_at
    FROM public.tasks AS t
   WHERE t.assignee_user_id IS NOT NULL
), classified AS (
  SELECT a.*,
         (u.id IS NOT NULL) AS user_exists,
         (same_org.user_id IS NOT NULL) AS has_same_org_membership,
         coalesce(other_org.other_org_count, 0) AS other_org_membership_count,
         other_org.other_org_ids,
         CASE
           WHEN u.id IS NULL THEN 'user_missing'
           WHEN same_org.user_id IS NOT NULL THEN 'valid'
           WHEN coalesce(other_org.other_org_count, 0) > 0 THEN 'user_only_in_other_organization'
           ELSE 'membership_missing_or_removed'
         END AS diagnosis
    FROM assignments AS a
    LEFT JOIN public."user" AS u ON u.id = a.assigned_user_id
    LEFT JOIN public.member AS same_org
      ON same_org.organization_id = a.organization_id
     AND same_org.user_id = a.assigned_user_id
    LEFT JOIN LATERAL (
      SELECT count(*)::integer AS other_org_count,
             array_agg(m.organization_id ORDER BY m.organization_id) AS other_org_ids
        FROM public.member AS m
       WHERE m.user_id = a.assigned_user_id
         AND m.organization_id <> a.organization_id
    ) AS other_org ON true
)
SELECT diagnosis, entity, count(*)::bigint AS record_count,
       count(*) FILTER (WHERE deleted_at IS NULL)::bigint AS active_count,
       count(*) FILTER (WHERE deleted_at IS NOT NULL)::bigint AS archived_count
  FROM classified
 WHERE diagnosis <> 'valid'
 GROUP BY diagnosis, entity
 ORDER BY diagnosis, entity;

-- Row-level diagnostic identifiers. Keep output in the restricted change
-- record; IDs and tenant IDs are operational data.
WITH assignments AS (
  SELECT 'clients'::text AS entity, c.id::text AS record_id,
         c.organization_id, c.owner_user_id AS assigned_user_id, c.deleted_at
    FROM public.clients AS c
   WHERE c.owner_user_id IS NOT NULL
  UNION ALL
  SELECT 'deals', d.id::text, d.organization_id, d.owner_user_id, d.deleted_at
    FROM public.deals AS d
   WHERE d.owner_user_id IS NOT NULL
  UNION ALL
  SELECT 'tasks', t.id::text, t.organization_id, t.assignee_user_id, t.deleted_at
    FROM public.tasks AS t
   WHERE t.assignee_user_id IS NOT NULL
), classified AS (
  SELECT a.*,
         (u.id IS NOT NULL) AS user_exists,
         (same_org.user_id IS NOT NULL) AS has_same_org_membership,
         coalesce(other_org.other_org_count, 0) AS other_org_membership_count,
         other_org.other_org_ids,
         CASE
           WHEN u.id IS NULL THEN 'user_missing'
           WHEN same_org.user_id IS NOT NULL THEN 'valid'
           WHEN coalesce(other_org.other_org_count, 0) > 0 THEN 'user_only_in_other_organization'
           ELSE 'membership_missing_or_removed'
         END AS diagnosis
    FROM assignments AS a
    LEFT JOIN public."user" AS u ON u.id = a.assigned_user_id
    LEFT JOIN public.member AS same_org
      ON same_org.organization_id = a.organization_id
     AND same_org.user_id = a.assigned_user_id
    LEFT JOIN LATERAL (
      SELECT count(*)::integer AS other_org_count,
             array_agg(m.organization_id ORDER BY m.organization_id) AS other_org_ids
        FROM public.member AS m
       WHERE m.user_id = a.assigned_user_id
         AND m.organization_id <> a.organization_id
    ) AS other_org ON true
)
SELECT entity, record_id, organization_id, assigned_user_id, deleted_at,
       diagnosis, user_exists, has_same_org_membership,
       other_org_membership_count, other_org_ids
  FROM classified
 WHERE diagnosis <> 'valid'
 ORDER BY entity, organization_id, record_id;
