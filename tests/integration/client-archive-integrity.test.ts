import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/db/schema";
import { auditLogs, activities, clients, contacts, deals, tasks } from "@/db/schema/crm";
import { eq, and, isNull } from "drizzle-orm";
import { createIsolatedConnectionPair, type IsolatedConnectionPair } from "../helpers/test-db";

const runtime = vi.hoisted(() => ({ db: undefined as NodePgDatabase<typeof schema> | undefined, organizationId: "", userId: "" }));

vi.mock("@/db", () => ({ getDb: () => {
  if (!runtime.db) throw new Error("Banco isolado de integração não inicializado.");
  return runtime.db;
} }));

vi.mock("@/lib/workspace", () => ({ requireWorkspaceRole: async () => ({
  organization: { id: runtime.organizationId },
  user: { id: runtime.userId },
}) }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { archiveClient } from "@/modules/clients/actions";
import { createContact } from "@/modules/clients/contact-actions";
import { createDeal } from "@/modules/deals/actions";
import { createTask } from "@/modules/tasks/actions";
import { createActivity } from "@/modules/activities/actions";

let connection: IsolatedConnectionPair;
let db: NodePgDatabase<typeof schema>;
let orgId: string;
let userId: string;

const orgName = "Integration CRM";

beforeAll(async () => {

  if (process.env.DATABASE_URL) throw new Error("Os testes de integração não podem usar DATABASE_URL.");

  connection = await createIsolatedConnectionPair();
  db = drizzle(connection.poolA, { schema });

  runtime.db = db;

  orgId = `integration-org-${randomUUID()}`;
  userId = `integration-owner-${randomUUID()}`;

  runtime.organizationId = orgId;
  runtime.userId = userId;

  try {

    await db.transaction(async (tx) => {

      await tx.insert(schema.organization).values({ id: orgId, name: orgName, slug: `integration-${randomUUID()}` });
      await tx.insert(schema.user).values({ id: userId, name: "Integration Owner", email: `${randomUUID()}@example.test` });
      await tx.insert(schema.member).values({ id: `integration-member-${randomUUID()}`, organizationId: orgId, userId, role: "owner" });

    });

  } catch (setupError) {

    const errors: unknown[] = [setupError];

    try { await cleanupFixture(); } catch (cleanupError) { errors.push(cleanupError); }

    runtime.db = undefined;

    try { await connection.cleanup(); } catch (connectionError) { errors.push(connectionError); }

    throw new AggregateError(errors, "Falha ao preparar fixture de integridade de arquivamento.");

  }
});

afterAll(async () => {

  const errors: unknown[] = [];

  try { if (db && orgId && userId) await cleanupFixture(); } catch (error) { errors.push(error); }

  runtime.db = undefined;

  try { if (connection) await connection.cleanup(); } catch (error) { errors.push(error); }

  if (errors.length) throw new AggregateError(errors, "Falha ao limpar fixture de integridade de arquivamento.");

});

async function cleanupFixture() {

  await db.transaction(async (tx) => {

    const [organization] = await tx.select({ id: schema.organization.id, name: schema.organization.name }).from(schema.organization).where(eq(schema.organization.id, orgId));

    if (organization && organization.name !== orgName) throw new Error("ID da organização da fixture aponta para registro inesperado; limpeza abortada.");

    const [user] = await tx.select({ id: schema.user.id, name: schema.user.name }).from(schema.user).where(eq(schema.user.id, userId));

    if (user && user.name !== "Integration Owner") throw new Error("ID do usuário da fixture aponta para registro inesperado; limpeza abortada.");

    await tx.delete(activities).where(eq(activities.organizationId, orgId));
    await tx.delete(tasks).where(eq(tasks.organizationId, orgId));
    await tx.delete(deals).where(eq(deals.organizationId, orgId));
    await tx.delete(contacts).where(eq(contacts.organizationId, orgId));
    await tx.delete(clients).where(eq(clients.organizationId, orgId));
    await tx.delete(auditLogs).where(eq(auditLogs.organizationId, orgId));
    await tx.delete(schema.invitation).where(eq(schema.invitation.organizationId, orgId));
    await tx.delete(schema.member).where(eq(schema.member.organizationId, orgId));
    await tx.delete(schema.organization).where(eq(schema.organization.id, orgId));
    await tx.delete(schema.account).where(eq(schema.account.userId, userId));
    await tx.delete(schema.session).where(eq(schema.session.userId, userId));
    await tx.delete(schema.user).where(eq(schema.user.id, userId));

  });
}

async function makeClient(kind: "person" | "company" = "person") {

  const [client] = await db.insert(clients).values({ organizationId: orgId, kind, name: `Fixture ${randomUUID()}`, status: "active", ownerUserId: userId }).returning({ id: clients.id });

  return client.id;

}

async function makeDeal(clientId: string, stage: "new_lead" | "won" | "lost" = "new_lead") {

  const [deal] = await db.insert(deals).values({ organizationId: orgId, clientId, title: `Deal ${randomUUID()}`, amount: "10.00", stage, closedAt: stage === "new_lead" ? null : new Date(), lossReason: stage === "lost" ? "Sem aderência" : null, ownerUserId: userId }).returning({ id: deals.id });

  return deal.id;

}

async function makeTask(values: { clientId?: string; dealId?: string; status?: "todo" | "in_progress" | "done" | "canceled" }) {

  const [task] = await db.insert(tasks).values({ organizationId: orgId, title: `Task ${randomUUID()}`, dueAt: new Date(Date.now() + 86_400_000), assigneeUserId: userId, clientId: values.clientId ?? null, dealId: values.dealId ?? null, status: values.status ?? "todo" }).returning({ id: tasks.id });

  return task.id;

}

async function expectBlocked(clientId: string, expected: string) {

  const auditBefore = await db.select({ id: auditLogs.id }).from(auditLogs).where(and(eq(auditLogs.entityType, "client"), eq(auditLogs.entityId, clientId), eq(auditLogs.action, "archive")));
  const result = await archiveClient(clientId);

  expect(result).toMatchObject({ ok: false, message: expect.stringContaining(expected) });

  const auditAfter = await db.select({ id: auditLogs.id }).from(auditLogs).where(and(eq(auditLogs.entityType, "client"), eq(auditLogs.entityId, clientId), eq(auditLogs.action, "archive")));

  expect(auditAfter).toHaveLength(auditBefore.length);

}

describe("client archival integrity on isolated PostgreSQL", () => {

  it("blocks active contacts", async () => {

    const clientId = await makeClient("company");

    await db.insert(contacts).values({ organizationId: orgId, companyClientId: clientId, name: "Active contact" });
    await expectBlocked(clientId, "contatos ativos");

  });

  it("blocks open deals", async () => {

    const clientId = await makeClient();

    await makeDeal(clientId);
    await expectBlocked(clientId, "oportunidades comerciais em aberto");

  });

  it("allows clients with only won or lost deals", async () => {

    const clientId = await makeClient();

    await makeDeal(clientId, "won");
    await makeDeal(clientId, "lost");

    expect(await archiveClient(clientId)).toMatchObject({ ok: true });

  });

  it("blocks pending tasks directly associated with the client", async () => {

    const clientId = await makeClient();

    await makeTask({ clientId });
    await expectBlocked(clientId, "tarefas pendentes");

  });

  it("blocks pending tasks associated through a deal", async () => {

    const clientId = await makeClient();
    const dealId = await makeDeal(clientId, "won");

    await makeTask({ dealId });
    await expectBlocked(clientId, "tarefas pendentes");

  });

  it("counts a task with both client and deal links once", async () => {

    const clientId = await makeClient();
    const dealId = await makeDeal(clientId, "won");

    await makeTask({ clientId, dealId });
    await expectBlocked(clientId, "tarefas pendentes");

  });

  it("ignores completed and canceled tasks", async () => {

    const clientId = await makeClient();

    await makeTask({ clientId, status: "done" });
    await makeTask({ clientId, status: "canceled" });

    expect(await archiveClient(clientId)).toMatchObject({ ok: true });

  });

  it("keeps historical activities without blocking archival", async () => {

    const clientId = await makeClient();

    await db.insert(activities).values({ organizationId: orgId, actorUserId: userId, clientId, type: "note", subject: "Historical note" });

    expect(await archiveClient(clientId)).toMatchObject({ ok: true });

    const [activity] = await db.select({ id: activities.id }).from(activities).where(eq(activities.clientId, clientId));

    expect(activity).toBeDefined();

  });

  it("rejects new activities for an archived client", async () => {

    const clientId = await makeClient();

    expect(await archiveClient(clientId)).toMatchObject({ ok: true });
    expect(await createActivity({ clientId, type: "note", subject: "Must fail" })).toMatchObject({ ok: false });

  });

  it("rejects new activities for opportunities whose client is archived", async () => {

    const clientId = await makeClient();
    const dealId = await makeDeal(clientId, "won");

    expect(await archiveClient(clientId)).toMatchObject({ ok: true });
    expect(await createActivity({ dealId, type: "note", subject: "Must fail" })).toMatchObject({ ok: false });

  });

  it.each([
    ["contact", async (id: string) => createContact({ companyClientId: id, name: "Concurrent contact" })],
    ["deal", async (id: string) => createDeal({ clientId: id, title: "Concurrent deal", amount: "10.00" })],
    ["task", async (id: string) => createTask({ clientId: id, title: "Concurrent task", priority: "normal", dueAt: new Date(Date.now() + 86_400_000).toISOString() })],
  ])("serializes concurrent %s creation and archival", async (_kind, createDependency) => {

    const clientId = await makeClient("company");
    const [archiveResult, createResult] = await Promise.all([archiveClient(clientId), createDependency(clientId)]);
    const [currentClient] = await db.select({ deletedAt: clients.deletedAt }).from(clients).where(eq(clients.id, clientId));
    const activeContactRows = await db.select({ id: contacts.id }).from(contacts).where(and(eq(contacts.companyClientId, clientId), isNull(contacts.deletedAt)));
    const activeDealRows = await db.select({ id: deals.id }).from(deals).where(and(eq(deals.clientId, clientId), isNull(deals.deletedAt)));
    const taskRows = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.clientId, clientId));
    const dependencyExists = activeContactRows.length + activeDealRows.length + taskRows.length > 0;

    expect(archiveResult.ok && createResult.ok).toBe(false);
    
    if (currentClient.deletedAt) expect(dependencyExists).toBe(false);
    else expect(createResult.ok || archiveResult.ok).toBe(true);

  });
});
