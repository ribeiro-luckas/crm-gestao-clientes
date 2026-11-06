-- Run only after the I-01 preflight is clear and any explicitly approved
-- remediation has completed. New/updated task rows are already checked by 0005.
ALTER TABLE public.tasks
  VALIDATE CONSTRAINT tasks_deal_client_consistency_fk;
