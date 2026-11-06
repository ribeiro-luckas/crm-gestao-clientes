import { sql } from "drizzle-orm";
import { check, date, foreignKey, index, numeric, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { member, organization, user } from "./auth";

const instant = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const clientKind = pgEnum("client_kind", ["person", "company"]);
export const clientStatus = pgEnum("client_status", ["active", "prospect", "inactive"]);
export const dealStage = pgEnum("deal_stage", ["new_lead", "qualification", "proposal", "negotiation", "won", "lost"]);
export const taskPriority = pgEnum("task_priority", ["low", "normal", "high", "urgent"]);
export const taskStatus = pgEnum("task_status", ["todo", "in_progress", "done", "canceled"]);
export const activityType = pgEnum("activity_type", ["call", "meeting", "email", "note", "follow_up"]);

export const clients = pgTable("clients", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "restrict" }),
  kind: clientKind("kind").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  status: clientStatus("status").notNull().default("prospect"),
  source: text("source"),
  ownerUserId: text("owner_user_id"),
  notes: text("notes"),
  createdAt: instant("created_at").notNull().defaultNow(),
  updatedAt: instant("updated_at").notNull().defaultNow(),
  deletedAt: instant("deleted_at"),
}, (table) => [
  uniqueIndex("clients_org_id_uidx").on(table.organizationId, table.id),
  foreignKey({ columns: [table.organizationId, table.ownerUserId], foreignColumns: [member.organizationId, member.userId], name: "clients_owner_member_assignment_fk" }).onDelete("restrict").onUpdate("restrict"),
  index("clients_org_status_name_idx").on(table.organizationId, table.status, table.name),
  index("clients_org_owner_idx").on(table.organizationId, table.ownerUserId),
  check("clients_name_nonempty", sql`length(trim(${table.name})) > 0`),
]);

export const contacts = pgTable("contacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "restrict" }),
  companyClientId: uuid("company_client_id").notNull(),
  name: text("name").notNull(),
  title: text("title"),
  email: text("email"),
  phone: text("phone"),
  notes: text("notes"),
  createdAt: instant("created_at").notNull().defaultNow(),
  updatedAt: instant("updated_at").notNull().defaultNow(),
  deletedAt: instant("deleted_at"),
}, (table) => [
  foreignKey({ columns: [table.organizationId, table.companyClientId], foreignColumns: [clients.organizationId, clients.id], name: "contacts_company_same_org_fk" }).onDelete("restrict"),
  index("contacts_org_company_name_idx").on(table.organizationId, table.companyClientId, table.name),
  check("contacts_name_nonempty", sql`length(trim(${table.name})) > 0`),
]);

export const deals = pgTable("deals", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "restrict" }),
  clientId: uuid("client_id").notNull(),
  title: text("title").notNull(),
  stage: dealStage("stage").notNull().default("new_lead"),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull().default("0.00"),
  currency: text("currency").notNull().default("BRL"),
  ownerUserId: text("owner_user_id"),
  expectedCloseAt: date("expected_close_at", { mode: "string" }),
  lossReason: text("loss_reason"),
  closedAt: instant("closed_at"),
  createdAt: instant("created_at").notNull().defaultNow(),
  updatedAt: instant("updated_at").notNull().defaultNow(),
  deletedAt: instant("deleted_at"),
}, (table) => [
  foreignKey({ columns: [table.organizationId, table.clientId], foreignColumns: [clients.organizationId, clients.id], name: "deals_client_same_org_fk" }).onDelete("restrict"),
  foreignKey({ columns: [table.organizationId, table.ownerUserId], foreignColumns: [member.organizationId, member.userId], name: "deals_owner_member_assignment_fk" }).onDelete("restrict").onUpdate("restrict"),
  uniqueIndex("deals_org_id_uidx").on(table.organizationId, table.id),
  uniqueIndex("deals_org_id_client_id_uidx").on(table.organizationId, table.id, table.clientId),
  index("deals_org_stage_due_idx").on(table.organizationId, table.stage, table.expectedCloseAt),
  index("deals_org_owner_stage_idx").on(table.organizationId, table.ownerUserId, table.stage),
  index("deals_org_closed_idx").on(table.organizationId, table.closedAt),
  check("deals_title_nonempty", sql`length(trim(${table.title})) > 0`),
  check("deals_amount_nonnegative", sql`${table.amount} >= 0`),
  check("deals_currency_brl", sql`${table.currency} = 'BRL'`),
  check("deals_loss_reason_required", sql`${table.stage} <> 'lost' or length(trim(coalesce(${table.lossReason}, ''))) > 0`),
  check("deals_closed_at_required", sql`${table.stage} not in ('won', 'lost') or ${table.closedAt} is not null`),
]);

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "restrict" }),
  title: text("title").notNull(),
  description: text("description"),
  priority: taskPriority("priority").notNull().default("normal"),
  status: taskStatus("status").notNull().default("todo"),
  dueAt: instant("due_at").notNull(),
  assigneeUserId: text("assignee_user_id"),
  clientId: uuid("client_id"),
  dealId: uuid("deal_id"),
  createdAt: instant("created_at").notNull().defaultNow(),
  updatedAt: instant("updated_at").notNull().defaultNow(),
  deletedAt: instant("deleted_at"),
}, (table) => [
  foreignKey({ columns: [table.organizationId, table.clientId], foreignColumns: [clients.organizationId, clients.id], name: "tasks_client_same_org_fk" }).onDelete("restrict"),
  foreignKey({ columns: [table.organizationId, table.dealId], foreignColumns: [deals.organizationId, deals.id], name: "tasks_deal_same_org_fk" }).onDelete("restrict"),
  foreignKey({ columns: [table.organizationId, table.dealId, table.clientId], foreignColumns: [deals.organizationId, deals.id, deals.clientId], name: "tasks_deal_client_consistency_fk" }).onDelete("restrict").onUpdate("restrict"),
  foreignKey({ columns: [table.organizationId, table.assigneeUserId], foreignColumns: [member.organizationId, member.userId], name: "tasks_assignee_member_assignment_fk" }).onDelete("restrict").onUpdate("restrict"),
  uniqueIndex("tasks_org_id_uidx").on(table.organizationId, table.id),
  index("tasks_org_deal_client_idx").on(table.organizationId, table.dealId, table.clientId),
  index("tasks_org_status_due_idx").on(table.organizationId, table.status, table.dueAt),
  index("tasks_org_assignee_due_idx").on(table.organizationId, table.assigneeUserId, table.dueAt),
  check("tasks_title_nonempty", sql`length(trim(${table.title})) > 0`),
]);

export const activities = pgTable("activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "restrict" }),
  type: activityType("type").notNull(),
  subject: text("subject").notNull(),
  body: text("body"),
  occurredAt: instant("occurred_at").notNull().defaultNow(),
  actorUserId: text("actor_user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  clientId: uuid("client_id"),
  dealId: uuid("deal_id"),
  taskId: uuid("task_id"),
  createdAt: instant("created_at").notNull().defaultNow(),
}, (table) => [
  foreignKey({ columns: [table.organizationId, table.clientId], foreignColumns: [clients.organizationId, clients.id], name: "activities_client_same_org_fk" }).onDelete("restrict"),
  foreignKey({ columns: [table.organizationId, table.dealId], foreignColumns: [deals.organizationId, deals.id], name: "activities_deal_same_org_fk" }).onDelete("restrict"),
  foreignKey({ columns: [table.organizationId, table.taskId], foreignColumns: [tasks.organizationId, tasks.id], name: "activities_task_same_org_fk" }).onDelete("restrict"),
  index("activities_org_occurred_idx").on(table.organizationId, table.occurredAt),
  check("activities_subject_nonempty", sql`length(trim(${table.subject})) > 0`),
  check("activities_has_parent", sql`${table.clientId} is not null or ${table.dealId} is not null or ${table.taskId} is not null`),
]);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "restrict" }),
  actorUserId: text("actor_user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  details: text("details"),
  createdAt: instant("created_at").notNull().defaultNow(),
}, (table) => [
  index("audit_org_created_idx").on(table.organizationId, table.createdAt),
  index("audit_org_entity_idx").on(table.organizationId, table.entityType, table.entityId),
]);
