-- Read-only rollout gate. It must return zero rows before migrations 0001/0002.
-- An OWNER token is case-insensitive and comma-delimited, matching Better Auth's
-- representation for a membership with one or more roles.
SELECT
  o.id AS organization_id,
  o.name AS organization_name,
  count(m.id) FILTER (
    WHERE EXISTS (
      SELECT 1
      FROM unnest(string_to_array(coalesce(m.role, ''), ',')) AS role_token(value)
      WHERE lower(btrim(role_token.value)) = 'owner'
    )
  ) AS owner_memberships
  FROM public.organization AS o
LEFT JOIN public.member AS m ON m.organization_id = o.id
GROUP BY o.id, o.name
HAVING count(m.id) FILTER (
  WHERE EXISTS (
    SELECT 1
    FROM unnest(string_to_array(coalesce(m.role, ''), ',')) AS role_token(value)
    WHERE lower(btrim(role_token.value)) = 'owner'
  )
) = 0
ORDER BY o.id;
