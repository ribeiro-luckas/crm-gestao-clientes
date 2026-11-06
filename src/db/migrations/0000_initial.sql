CREATE TABLE "user" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "email_verified" boolean DEFAULT false NOT NULL,
  "image" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "user_email_uidx" ON "user" USING btree ("email");

CREATE TABLE "session" (
  "id" text PRIMARY KEY NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "token" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "active_organization_id" text
);
CREATE UNIQUE INDEX "session_token_uidx" ON "session" USING btree ("token");
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");

CREATE TABLE "account" (
  "id" text PRIMARY KEY NOT NULL,
  "account_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "access_token" text,
  "refresh_token" text,
  "id_token" text,
  "access_token_expires_at" timestamp with time zone,
  "refresh_token_expires_at" timestamp with time zone,
  "scope" text,
  "password" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");

CREATE TABLE "verification" (
  "id" text PRIMARY KEY NOT NULL,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");

CREATE TABLE "organization" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "logo" text,
  "metadata" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "organization_slug_uidx" ON "organization" USING btree ("slug");

CREATE TABLE "member" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE cascade,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "role" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "member_org_user_uidx" ON "member" USING btree ("organization_id", "user_id");
CREATE INDEX "member_user_idx" ON "member" USING btree ("user_id");

CREATE TABLE "invitation" (
  "id" text PRIMARY KEY NOT NULL,
  "email" text NOT NULL,
  "inviter_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE cascade,
  "role" text,
  "status" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "invitation_org_idx" ON "invitation" USING btree ("organization_id");

CREATE TYPE "client_kind" AS ENUM ('person', 'company');
CREATE TYPE "client_status" AS ENUM ('active', 'prospect', 'inactive');
CREATE TYPE "deal_stage" AS ENUM ('new_lead', 'qualification', 'proposal', 'negotiation', 'won', 'lost');
CREATE TYPE "task_priority" AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE "task_status" AS ENUM ('todo', 'in_progress', 'done', 'canceled');
CREATE TYPE "activity_type" AS ENUM ('call', 'meeting', 'email', 'note', 'follow_up');

CREATE TABLE "clients" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE restrict,
  "kind" "client_kind" NOT NULL,
  "name" text NOT NULL,
  "email" text,
  "phone" text,
  "status" "client_status" DEFAULT 'prospect' NOT NULL,
  "source" text,
  "owner_user_id" text REFERENCES "user"("id") ON DELETE set null,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  CONSTRAINT "clients_name_nonempty" CHECK (length(trim("name")) > 0)
);
CREATE UNIQUE INDEX "clients_org_id_uidx" ON "clients" USING btree ("organization_id", "id");
CREATE INDEX "clients_org_status_name_idx" ON "clients" USING btree ("organization_id", "status", "name");
CREATE INDEX "clients_org_owner_idx" ON "clients" USING btree ("organization_id", "owner_user_id");

CREATE TABLE "contacts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE restrict,
  "company_client_id" uuid NOT NULL,
  "name" text NOT NULL,
  "title" text,
  "email" text,
  "phone" text,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  CONSTRAINT "contacts_company_same_org_fk" FOREIGN KEY ("organization_id", "company_client_id") REFERENCES "clients"("organization_id", "id") ON DELETE restrict,
  CONSTRAINT "contacts_name_nonempty" CHECK (length(trim("name")) > 0)
);
CREATE INDEX "contacts_org_company_name_idx" ON "contacts" USING btree ("organization_id", "company_client_id", "name");

CREATE TABLE "deals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE restrict,
  "client_id" uuid NOT NULL,
  "title" text NOT NULL,
  "stage" "deal_stage" DEFAULT 'new_lead' NOT NULL,
  "amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
  "currency" text DEFAULT 'BRL' NOT NULL,
  "owner_user_id" text REFERENCES "user"("id") ON DELETE set null,
  "expected_close_at" date,
  "loss_reason" text,
  "closed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  CONSTRAINT "deals_client_same_org_fk" FOREIGN KEY ("organization_id", "client_id") REFERENCES "clients"("organization_id", "id") ON DELETE restrict,
  CONSTRAINT "deals_title_nonempty" CHECK (length(trim("title")) > 0),
  CONSTRAINT "deals_amount_nonnegative" CHECK ("amount" >= 0),
  CONSTRAINT "deals_currency_brl" CHECK ("currency" = 'BRL'),
  CONSTRAINT "deals_loss_reason_required" CHECK ("stage" <> 'lost' OR length(trim(coalesce("loss_reason", ''))) > 0),
  CONSTRAINT "deals_closed_at_required" CHECK ("stage" NOT IN ('won', 'lost') OR "closed_at" IS NOT NULL)
);
CREATE UNIQUE INDEX "deals_org_id_uidx" ON "deals" USING btree ("organization_id", "id");
CREATE INDEX "deals_org_stage_due_idx" ON "deals" USING btree ("organization_id", "stage", "expected_close_at");
CREATE INDEX "deals_org_owner_stage_idx" ON "deals" USING btree ("organization_id", "owner_user_id", "stage");
CREATE INDEX "deals_org_closed_idx" ON "deals" USING btree ("organization_id", "closed_at");

CREATE TABLE "tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE restrict,
  "title" text NOT NULL,
  "description" text,
  "priority" "task_priority" DEFAULT 'normal' NOT NULL,
  "status" "task_status" DEFAULT 'todo' NOT NULL,
  "due_at" timestamp with time zone NOT NULL,
  "assignee_user_id" text REFERENCES "user"("id") ON DELETE set null,
  "client_id" uuid,
  "deal_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  CONSTRAINT "tasks_client_same_org_fk" FOREIGN KEY ("organization_id", "client_id") REFERENCES "clients"("organization_id", "id") ON DELETE restrict,
  CONSTRAINT "tasks_deal_same_org_fk" FOREIGN KEY ("organization_id", "deal_id") REFERENCES "deals"("organization_id", "id") ON DELETE restrict,
  CONSTRAINT "tasks_title_nonempty" CHECK (length(trim("title")) > 0)
);
CREATE UNIQUE INDEX "tasks_org_id_uidx" ON "tasks" USING btree ("organization_id", "id");
CREATE INDEX "tasks_org_status_due_idx" ON "tasks" USING btree ("organization_id", "status", "due_at");
CREATE INDEX "tasks_org_assignee_due_idx" ON "tasks" USING btree ("organization_id", "assignee_user_id", "due_at");

CREATE TABLE "activities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE restrict,
  "type" "activity_type" NOT NULL,
  "subject" text NOT NULL,
  "body" text,
  "occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
  "actor_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE restrict,
  "client_id" uuid,
  "deal_id" uuid,
  "task_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "activities_client_same_org_fk" FOREIGN KEY ("organization_id", "client_id") REFERENCES "clients"("organization_id", "id") ON DELETE restrict,
  CONSTRAINT "activities_deal_same_org_fk" FOREIGN KEY ("organization_id", "deal_id") REFERENCES "deals"("organization_id", "id") ON DELETE restrict,
  CONSTRAINT "activities_task_same_org_fk" FOREIGN KEY ("organization_id", "task_id") REFERENCES "tasks"("organization_id", "id") ON DELETE restrict,
  CONSTRAINT "activities_subject_nonempty" CHECK (length(trim("subject")) > 0),
  CONSTRAINT "activities_has_parent" CHECK ("client_id" IS NOT NULL OR "deal_id" IS NOT NULL OR "task_id" IS NOT NULL)
);
CREATE INDEX "activities_org_occurred_idx" ON "activities" USING btree ("organization_id", "occurred_at");

CREATE TABLE "audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE restrict,
  "actor_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE restrict,
  "action" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" text NOT NULL,
  "details" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "audit_org_created_idx" ON "audit_logs" USING btree ("organization_id", "created_at");
CREATE INDEX "audit_org_entity_idx" ON "audit_logs" USING btree ("organization_id", "entity_type", "entity_id");
