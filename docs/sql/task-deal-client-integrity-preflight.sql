-- I-01 preflight. Read-only diagnostic: no DML, DDL, temp objects, or remediation.
BEGIN TRANSACTION READ ONLY;

SELECT current_database() AS database_name,
       current_user AS database_user,
       inet_server_addr() AS server_address,
       inet_server_port() AS server_port;

WITH links AS (
  SELECT t.id AS task_id,
         t.organization_id AS task_organization_id,
         t.client_id AS task_client_id,
         t.deal_id AS task_deal_id,
         t.deleted_at AS task_deleted_at,
         tc.id AS task_client_found_id,
         tc.organization_id AS task_client_organization_id,
         tc.deleted_at AS task_client_deleted_at,
         d.id AS deal_found_id,
         d.organization_id AS deal_organization_id,
         d.client_id AS deal_client_id,
         d.deleted_at AS deal_deleted_at,
         dc.id AS deal_client_found_id,
         dc.organization_id AS deal_client_organization_id,
         dc.deleted_at AS deal_client_deleted_at
    FROM public.tasks AS t
    LEFT JOIN public.clients AS tc ON tc.id = t.client_id
    LEFT JOIN public.deals AS d ON d.id = t.deal_id
    LEFT JOIN public.clients AS dc ON dc.id = d.client_id
), issues AS (
  SELECT links.*,
         issue.issue_code
    FROM links
    CROSS JOIN LATERAL (VALUES
      ('TASK_CLIENT_MISSING'::text, task_client_id IS NOT NULL AND task_client_found_id IS NULL),
      ('TASK_DEAL_MISSING', task_deal_id IS NOT NULL AND deal_found_id IS NULL),
      ('TASK_CLIENT_ORGANIZATION_MISMATCH', task_client_found_id IS NOT NULL AND task_client_organization_id IS DISTINCT FROM task_organization_id),
      ('TASK_DEAL_ORGANIZATION_MISMATCH', deal_found_id IS NOT NULL AND deal_organization_id IS DISTINCT FROM task_organization_id),
      ('DEAL_CLIENT_MISSING', deal_found_id IS NOT NULL AND deal_client_found_id IS NULL),
      ('DEAL_CLIENT_ORGANIZATION_MISMATCH', deal_client_found_id IS NOT NULL AND deal_client_organization_id IS DISTINCT FROM deal_organization_id),
      ('TASK_CLIENT_DIFFERS_FROM_DEAL_CLIENT', task_client_id IS NOT NULL AND deal_found_id IS NOT NULL AND task_client_id IS DISTINCT FROM deal_client_id)
    ) AS issue(issue_code, is_invalid)
   WHERE issue.is_invalid
), issue_codes(issue_code) AS (
  VALUES
    ('TASK_CLIENT_MISSING'::text),
    ('TASK_DEAL_MISSING'),
    ('TASK_CLIENT_ORGANIZATION_MISMATCH'),
    ('TASK_DEAL_ORGANIZATION_MISMATCH'),
    ('DEAL_CLIENT_MISSING'),
    ('DEAL_CLIENT_ORGANIZATION_MISMATCH'),
    ('TASK_CLIENT_DIFFERS_FROM_DEAL_CLIENT')
)
SELECT issue_codes.issue_code,
       count(issues.task_id) AS inconsistent_relationship_count,
       count(DISTINCT issues.task_id) AS affected_task_count
  FROM issue_codes
  LEFT JOIN issues USING (issue_code)
 GROUP BY issue_codes.issue_code
UNION ALL
SELECT 'TOTAL_AFFECTED_TASKS', count(*), count(*)
  FROM (SELECT DISTINCT task_id FROM issues) AS affected
ORDER BY issue_code;

WITH links AS (
  SELECT t.id AS task_id,
         t.organization_id AS task_organization_id,
         t.client_id AS task_client_id,
         t.deal_id AS task_deal_id,
         t.deleted_at AS task_deleted_at,
         tc.id AS task_client_found_id,
         tc.organization_id AS task_client_organization_id,
         tc.deleted_at AS task_client_deleted_at,
         d.id AS deal_found_id,
         d.organization_id AS deal_organization_id,
         d.client_id AS deal_client_id,
         d.deleted_at AS deal_deleted_at,
         dc.id AS deal_client_found_id,
         dc.organization_id AS deal_client_organization_id,
         dc.deleted_at AS deal_client_deleted_at
    FROM public.tasks AS t
    LEFT JOIN public.clients AS tc ON tc.id = t.client_id
    LEFT JOIN public.deals AS d ON d.id = t.deal_id
    LEFT JOIN public.clients AS dc ON dc.id = d.client_id
), issues AS (
  SELECT links.*,
         issue.issue_code
    FROM links
    CROSS JOIN LATERAL (VALUES
      ('TASK_CLIENT_MISSING'::text, task_client_id IS NOT NULL AND task_client_found_id IS NULL),
      ('TASK_DEAL_MISSING', task_deal_id IS NOT NULL AND deal_found_id IS NULL),
      ('TASK_CLIENT_ORGANIZATION_MISMATCH', task_client_found_id IS NOT NULL AND task_client_organization_id IS DISTINCT FROM task_organization_id),
      ('TASK_DEAL_ORGANIZATION_MISMATCH', deal_found_id IS NOT NULL AND deal_organization_id IS DISTINCT FROM task_organization_id),
      ('DEAL_CLIENT_MISSING', deal_found_id IS NOT NULL AND deal_client_found_id IS NULL),
      ('DEAL_CLIENT_ORGANIZATION_MISMATCH', deal_client_found_id IS NOT NULL AND deal_client_organization_id IS DISTINCT FROM deal_organization_id),
      ('TASK_CLIENT_DIFFERS_FROM_DEAL_CLIENT', task_client_id IS NOT NULL AND deal_found_id IS NOT NULL AND task_client_id IS DISTINCT FROM deal_client_id)
    ) AS issue(issue_code, is_invalid)
   WHERE issue.is_invalid
)
SELECT issue_code,
       task_id,
       task_organization_id,
       task_client_id,
       task_client_organization_id,
       task_deal_id,
       deal_organization_id,
       deal_client_id,
       deal_client_organization_id,
       task_deleted_at,
       task_client_deleted_at,
       deal_deleted_at,
       deal_client_deleted_at
  FROM issues
 ORDER BY issue_code, task_organization_id, task_id;

-- Independently check every opportunity's required client association, even
-- when no task currently references that opportunity.
WITH deal_links AS (
  SELECT d.id AS deal_id,
         d.organization_id AS deal_organization_id,
         d.client_id,
         d.deleted_at AS deal_deleted_at,
         c.id AS client_found_id,
         c.organization_id AS client_organization_id,
         c.deleted_at AS client_deleted_at
    FROM public.deals AS d
    LEFT JOIN public.clients AS c ON c.id = d.client_id
)
SELECT count(*) FILTER (WHERE client_found_id IS NULL) AS missing_client_count,
       count(*) FILTER (WHERE client_found_id IS NOT NULL AND client_organization_id IS DISTINCT FROM deal_organization_id) AS cross_organization_count
  FROM deal_links;

WITH deal_links AS (
  SELECT d.id AS deal_id,
         d.organization_id AS deal_organization_id,
         d.client_id,
         d.deleted_at AS deal_deleted_at,
         c.id AS client_found_id,
         c.organization_id AS client_organization_id,
         c.deleted_at AS client_deleted_at
    FROM public.deals AS d
    LEFT JOIN public.clients AS c ON c.id = d.client_id
)
SELECT deal_id,
       deal_organization_id,
       client_id,
       client_organization_id,
       deal_deleted_at,
       client_deleted_at
  FROM deal_links
 WHERE client_found_id IS NULL
    OR client_organization_id IS DISTINCT FROM deal_organization_id
 ORDER BY deal_organization_id, deal_id;

-- Report intentional optional states separately; the current task form/action
-- permits all three and they are not classified as inconsistencies by I-01.
SELECT count(*) FILTER (WHERE client_id IS NULL AND deal_id IS NULL) AS no_client_no_deal,
       count(*) FILTER (WHERE client_id IS NOT NULL AND deal_id IS NULL) AS client_only,
       count(*) FILTER (WHERE client_id IS NULL AND deal_id IS NOT NULL) AS deal_only,
       count(*) FILTER (WHERE client_id IS NOT NULL AND deal_id IS NOT NULL) AS client_and_deal
  FROM public.tasks;

COMMIT;
