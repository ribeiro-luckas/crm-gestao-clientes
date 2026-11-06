-- Run after the M-01 preflight reports zero invalid rows and any approved
-- remediation has been completed. Each validation scans existing rows while
-- the NOT VALID FK continues enforcing concurrent writes.
ALTER TABLE public.clients
  VALIDATE CONSTRAINT clients_owner_member_assignment_fk;
--> statement-breakpoint

ALTER TABLE public.deals
  VALIDATE CONSTRAINT deals_owner_member_assignment_fk;
--> statement-breakpoint

ALTER TABLE public.tasks
  VALIDATE CONSTRAINT tasks_assignee_member_assignment_fk;
