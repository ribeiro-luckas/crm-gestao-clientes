-- Support an exact composite FK target. The leading (organization_id, id)
-- unique index is not a PostgreSQL candidate key for a three-column FK.
CREATE UNIQUE INDEX deals_org_id_client_id_uidx
  ON public.deals USING btree (organization_id, id, client_id);
--> statement-breakpoint

-- Child-side index supports FK checks when referenced deal-client keys are
-- restricted, including references held by soft-archived tasks.
CREATE INDEX tasks_org_deal_client_idx
  ON public.tasks USING btree (organization_id, deal_id, client_id);
--> statement-breakpoint

-- MATCH SIMPLE intentionally permits a task to reference only a deal (NULL
-- client_id). When both optional task references are present, they must name
-- the same client. Existing same-organization FKs remain in force.
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_deal_client_consistency_fk
  FOREIGN KEY (organization_id, deal_id, client_id)
  REFERENCES public.deals (organization_id, id, client_id)
  MATCH SIMPLE
  ON DELETE RESTRICT
  ON UPDATE RESTRICT
  NOT VALID;
