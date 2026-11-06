import { sql } from "drizzle-orm";
import { bigint, boolean, index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

const instant = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: instant("created_at").notNull().defaultNow(),
  updatedAt: instant("updated_at").notNull().defaultNow(),
}, (table) => [uniqueIndex("user_email_uidx").on(table.email)]);

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: instant("expires_at").notNull(),
  token: text("token").notNull(),
  createdAt: instant("created_at").notNull().defaultNow(),
  updatedAt: instant("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  activeOrganizationId: text("active_organization_id"),
}, (table) => [uniqueIndex("session_token_uidx").on(table.token), index("session_user_idx").on(table.userId)]);

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: instant("access_token_expires_at"),
  refreshTokenExpiresAt: instant("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: instant("created_at").notNull().defaultNow(),
  updatedAt: instant("updated_at").notNull().defaultNow(),
}, (table) => [index("account_user_idx").on(table.userId)]);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: instant("expires_at").notNull(),
  createdAt: instant("created_at").notNull().defaultNow(),
  updatedAt: instant("updated_at").notNull().defaultNow(),
}, (table) => [index("verification_identifier_idx").on(table.identifier)]);

export const organization = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  logo: text("logo"),
  metadata: text("metadata"),
  createdAt: instant("created_at").notNull().defaultNow(),
}, (table) => [uniqueIndex("organization_slug_uidx").on(table.slug)]);

export const member = pgTable("member", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  createdAt: instant("created_at").notNull().defaultNow(),
}, (table) => [uniqueIndex("member_org_user_uidx").on(table.organizationId, table.userId), index("member_user_idx").on(table.userId)]);

// Internal serialization row used by the PostgreSQL last-OWNER triggers.
// It intentionally has no FK: organization delete cleanup removes the row via
// a dedicated trigger, after membership cascade processing has started.
export const organizationOwnerGuard = pgTable("organization_owner_guard", {
  organizationId: text("organization_id").primaryKey(),
  revision: bigint("revision", { mode: "bigint" }).notNull().default(sql`0`),
});

export const invitation = pgTable("invitation", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  inviterId: text("inviter_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  role: text("role"),
  status: text("status").notNull(),
  expiresAt: instant("expires_at").notNull(),
  createdAt: instant("created_at").notNull().defaultNow(),
}, (table) => [index("invitation_org_idx").on(table.organizationId)]);

// Keep the private guard out of Better Auth's adapter schema; it is managed
// only by PostgreSQL triggers and is not a Better Auth model.
export const authSchema = { user, session, account, verification, organization, member, invitation };
