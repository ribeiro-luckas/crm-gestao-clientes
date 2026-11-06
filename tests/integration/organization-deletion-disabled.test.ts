import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { and, asc, eq, inArray } from "drizzle-orm";
import * as schema from "@/db/schema";
import { createIsolatedConnectionPair, type IsolatedConnectionPair } from "../helpers/test-db";
import { seedTeamRbacFixture, signInAndGetCookie } from "../helpers/team-rbac-fixture";

type Fixture = Awaited<ReturnType<typeof seedTeamRbacFixture>>;
type Actor = "owner" | "admin" | "member";
type ExtraOrganization = { id: string; userId: string };
type CommercialFixture = { clientIds: string[]; dealIds: string[]; taskIds: string[]; activityIds: string[]; auditIds: string[] };

const runtime = vi.hoisted(() => ({ db: undefined as NodePgDatabase<typeof schema> | undefined }));
// O handler real e o Better Auth usam o mesmo pool isolado que consulta as fixtures.
vi.mock("@/db", () => ({
  getDb: () => {
    if (!runtime.db) throw new Error("Banco isolado não inicializado.");
    return runtime.db;
  },
}));

let connection: IsolatedConnectionPair | undefined;
let db: NodePgDatabase<typeof schema>;
let fixture: Fixture | undefined;
let extraOrganization: ExtraOrganization | undefined;
let commercial: CommercialFixture | undefined;
let postAuth: (request: Request) => Promise<Response>;
let restoreEnvironment: (() => void) | undefined;

beforeAll(async () => {
  
  if (process.env.DATABASE_URL) throw new Error("DATABASE_URL proibida nesta suíte.");

  connection = await createIsolatedConnectionPair();
  db = drizzle(connection.poolA, { schema });
  runtime.db = db;


  const oldSecret = process.env.BETTER_AUTH_SECRET;
  const oldUrl = process.env.BETTER_AUTH_URL;

  process.env.BETTER_AUTH_SECRET = randomBytes(48).toString("base64url");
  process.env.BETTER_AUTH_URL = "http://localhost:3000";

  restoreEnvironment = () => {

    if (oldSecret === undefined) delete process.env.BETTER_AUTH_SECRET;
    else process.env.BETTER_AUTH_SECRET = oldSecret;

    if (oldUrl === undefined) delete process.env.BETTER_AUTH_URL;
    else process.env.BETTER_AUTH_URL = oldUrl;

  };

  postAuth = (await import("@/app/api/auth/[...all]/route")).POST;

});

beforeEach(async () => {

  fixture = await seedTeamRbacFixture(db);
  extraOrganization = undefined;

  try {

    commercial = await seedCommercialFixture();

  } catch (error) {

    await fixture.cleanup();

    fixture = undefined;

    throw error;
  }

});

afterEach(async () => {

  const errors: unknown[] = [];
  const currentExtra = extraOrganization;

  if (currentExtra) {

    try {

      await cleanupOrganization(currentExtra.id, [currentExtra.userId]);
      await assertOrganizationRemoved(currentExtra.id, [currentExtra.userId]);

    } catch (error) {
      
      errors.push(error);
    
    }
  }

  const currentFixture = fixture;

  try {

    await currentFixture?.cleanup();

    if (currentFixture) await assertOrganizationRemoved(currentFixture.organizationId, Object.values(currentFixture.actors).map((actor) => actor.userId));

  } catch (error) {
    
    errors.push(error);
  
  }

  fixture = undefined;
  commercial = undefined;
  extraOrganization = undefined;

  if (errors.length) throw new AggregateError(errors, "Falha ao limpar fixtures de exclusão de organização.");

});

afterAll(async () => {

  runtime.db = undefined;

  restoreEnvironment?.();

  if (connection) await connection.cleanup();

});

function requireFixture(): Fixture {

  if (!fixture) throw new Error("Fixture de organização não inicializada.");

  return fixture;

}

function requireCommercial(): CommercialFixture {

  if (!commercial) throw new Error("Fixture comercial não inicializada.");

  return commercial;

}

async function signIn(actor: Actor) {

  return signInAndGetCookie(postAuth, requireFixture().actors[actor]);

}

async function request(cookie: string, organizationId: string) {

  return postAuth(new Request("http://localhost:3000/api/auth/organization/delete", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:3000", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify({ organizationId }),
  }));

}

async function seedCommercialFixture(): Promise<CommercialFixture> {

  const { organizationId, actors } = requireFixture();

  return db.transaction(async (tx) => {

    const [activeClient, archivedClient] = await tx.insert(schema.clients).values([
      { organizationId, kind: "company", name: `Deletion active client ${randomUUID()}`, ownerUserId: actors.target.userId },
      { organizationId, kind: "company", name: `Deletion archived client ${randomUUID()}`, ownerUserId: actors.admin.userId, deletedAt: new Date("2026-10-01T12:00:00.000Z") },
    ]).returning({ id: schema.clients.id });
    const [activeDeal, archivedDeal] = await tx.insert(schema.deals).values([
      { organizationId, clientId: activeClient.id, title: `Deletion active deal ${randomUUID()}`, amount: "450.00", ownerUserId: actors.admin.userId },
      { organizationId, clientId: archivedClient.id, title: `Deletion archived deal ${randomUUID()}`, amount: "625.00", ownerUserId: actors.target.userId, deletedAt: new Date("2026-10-02T12:00:00.000Z") },
    ]).returning({ id: schema.deals.id });
    const [activeTask, archivedTask] = await tx.insert(schema.tasks).values([
      { organizationId, title: `Deletion active task ${randomUUID()}`, dueAt: new Date("2027-02-10T12:00:00.000Z"), assigneeUserId: actors.owner.userId, clientId: activeClient.id, dealId: activeDeal.id },
      { organizationId, title: `Deletion archived task ${randomUUID()}`, dueAt: new Date("2027-02-11T12:00:00.000Z"), assigneeUserId: actors.target.userId, clientId: archivedClient.id, dealId: archivedDeal.id, deletedAt: new Date("2026-10-03T12:00:00.000Z") },
    ]).returning({ id: schema.tasks.id });

    const parents = [
      { entityType: "client", entityId: activeClient.id, actorUserId: actors.target.userId, parent: { clientId: activeClient.id } },
      { entityType: "client", entityId: archivedClient.id, actorUserId: actors.admin.userId, parent: { clientId: archivedClient.id } },
      { entityType: "deal", entityId: activeDeal.id, actorUserId: actors.admin.userId, parent: { dealId: activeDeal.id } },
      { entityType: "deal", entityId: archivedDeal.id, actorUserId: actors.target.userId, parent: { dealId: archivedDeal.id } },
      { entityType: "task", entityId: activeTask.id, actorUserId: actors.owner.userId, parent: { taskId: activeTask.id } },
      { entityType: "task", entityId: archivedTask.id, actorUserId: actors.target.userId, parent: { taskId: archivedTask.id } },
    ];
    const audits = await tx.insert(schema.auditLogs).values(parents.map((row) => ({
      organizationId, actorUserId: row.actorUserId, action: "fixture_history", entityType: row.entityType, entityId: row.entityId,
      details: JSON.stringify({ preserve: true }),
    }))).returning({ id: schema.auditLogs.id });
    const activities = await tx.insert(schema.activities).values(parents.map((row) => ({
      organizationId, type: "note" as const, subject: `Deletion history ${randomUUID()}`, actorUserId: row.actorUserId, ...row.parent,
    }))).returning({ id: schema.activities.id });

    return {
      clientIds: [activeClient.id, archivedClient.id], dealIds: [activeDeal.id, archivedDeal.id], taskIds: [activeTask.id, archivedTask.id],
      activityIds: activities.map((row) => row.id), auditIds: audits.map((row) => row.id),
    };

  });
}

async function captureSnapshot(organizationId: string, userIds: string[], recordIds: CommercialFixture) {

  const [organization, memberships, users, accounts, sessions, clients, deals, tasks, activities, audits] = await Promise.all([
    db.select().from(schema.organization).where(eq(schema.organization.id, organizationId)),
    db.select().from(schema.member).where(eq(schema.member.organizationId, organizationId)).orderBy(asc(schema.member.id)),
    db.select().from(schema.user).where(inArray(schema.user.id, userIds)).orderBy(asc(schema.user.id)),
    db.select().from(schema.account).where(inArray(schema.account.userId, userIds)).orderBy(asc(schema.account.id)),
    db.select().from(schema.session).where(inArray(schema.session.userId, userIds)).orderBy(asc(schema.session.id)),
    db.select().from(schema.clients).where(inArray(schema.clients.id, recordIds.clientIds)).orderBy(asc(schema.clients.id)),
    db.select().from(schema.deals).where(inArray(schema.deals.id, recordIds.dealIds)).orderBy(asc(schema.deals.id)),
    db.select().from(schema.tasks).where(inArray(schema.tasks.id, recordIds.taskIds)).orderBy(asc(schema.tasks.id)),
    db.select().from(schema.activities).where(inArray(schema.activities.id, recordIds.activityIds)).orderBy(asc(schema.activities.id)),
    db.select().from(schema.auditLogs).where(inArray(schema.auditLogs.id, recordIds.auditIds)).orderBy(asc(schema.auditLogs.id)),
  ]);

  return { organization, memberships, users, accounts, sessions, clients, deals, tasks, activities, audits };

}

async function expectDeletionDisabled(actor: Actor) {

  const { organizationId, actors } = requireFixture();
  const cookie = await signIn(actor);
  const userIds = Object.values(actors).map((item) => item.userId);
  const before = await captureSnapshot(organizationId, userIds, requireCommercial());
  const response = await request(cookie, organizationId);
  const body = await response.json() as { code?: string; message?: string };

  expect(response.status).toBe(404);
  expect(body.code).toBe("ORGANIZATION_DELETION_DISABLED");
  expect(body.message).toContain("Organization deletion is disabled");
  expect(await captureSnapshot(organizationId, userIds, requireCommercial())).toEqual(before);

}

async function cleanupOrganization(organizationId: string, userIds: string[]) {

  await db.transaction(async (tx) => {

    await tx.delete(schema.activities).where(eq(schema.activities.organizationId, organizationId));
    await tx.delete(schema.tasks).where(eq(schema.tasks.organizationId, organizationId));
    await tx.delete(schema.deals).where(eq(schema.deals.organizationId, organizationId));
    await tx.delete(schema.contacts).where(eq(schema.contacts.organizationId, organizationId));
    await tx.delete(schema.clients).where(eq(schema.clients.organizationId, organizationId));
    await tx.delete(schema.auditLogs).where(eq(schema.auditLogs.organizationId, organizationId));
    await tx.delete(schema.invitation).where(eq(schema.invitation.organizationId, organizationId));
    await tx.delete(schema.member).where(eq(schema.member.organizationId, organizationId));
    await tx.delete(schema.organization).where(eq(schema.organization.id, organizationId));

    if (userIds.length) {

      await tx.delete(schema.session).where(inArray(schema.session.userId, userIds));
      await tx.delete(schema.account).where(inArray(schema.account.userId, userIds));
      await tx.delete(schema.user).where(inArray(schema.user.id, userIds));

    }

  });
}

async function assertOrganizationRemoved(organizationId: string, userIds: string[]) {

  const [organizations, memberships, clients, contacts, deals, tasks, activities, audits, invitations] = await Promise.all([
    db.select({ id: schema.organization.id }).from(schema.organization).where(eq(schema.organization.id, organizationId)),
    db.select({ id: schema.member.id }).from(schema.member).where(eq(schema.member.organizationId, organizationId)),
    db.select({ id: schema.clients.id }).from(schema.clients).where(eq(schema.clients.organizationId, organizationId)),
      db.select({ id: schema.contacts.id }).from(schema.contacts).where(eq(schema.contacts.organizationId, organizationId)),
    db.select({ id: schema.deals.id }).from(schema.deals).where(eq(schema.deals.organizationId, organizationId)),
    db.select({ id: schema.tasks.id }).from(schema.tasks).where(eq(schema.tasks.organizationId, organizationId)),
    db.select({ id: schema.activities.id }).from(schema.activities).where(eq(schema.activities.organizationId, organizationId)),
    db.select({ id: schema.auditLogs.id }).from(schema.auditLogs).where(eq(schema.auditLogs.organizationId, organizationId)),
    db.select({ id: schema.invitation.id }).from(schema.invitation).where(eq(schema.invitation.organizationId, organizationId)),
  ]);
  const authRows = userIds.length ? await Promise.all(userIds.map(async (userId) => {

    const [users, accounts, sessions] = await Promise.all([
      db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.id, userId)),
      db.select({ id: schema.account.id }).from(schema.account).where(eq(schema.account.userId, userId)),
      db.select({ id: schema.session.id }).from(schema.session).where(eq(schema.session.userId, userId)),
    ]);

    return users.length + accounts.length + sessions.length;

  })) : [];

  if ([organizations, memberships, clients, contacts, deals, tasks, activities, audits, invitations].some((rows) => rows.length) || authRows.some(Boolean)) {

    throw new Error(`Resíduos encontrados após cleanup da fixture ${organizationId}.`);

  }
}

describe("Better Auth Organization: exclusão de organização desabilitada", () => {

  it.each([["OWNER", "owner"], ["ADMIN", "admin"], ["MEMBER", "member"]] as const)("recusa exclusão iniciada por %s e preserva todos os dados", async (_role, actor) => {

    await expectDeletionDisabled(actor);

  });

  it("recusa chamada sem sessão sem excluir a organização", async () => {

    const { organizationId, actors } = requireFixture();
    const userIds = Object.values(actors).map((actor) => actor.userId);
    const before = await captureSnapshot(organizationId, userIds, requireCommercial());
    const response = await request("", organizationId);

    expect(response.status).not.toBe(200);
    expect(await captureSnapshot(organizationId, userIds, requireCommercial())).toEqual(before);

  });

  it("recusa sessão revogada e mantém a organização intacta", async () => {

    const { organizationId, actors } = requireFixture();
    const cookie = await signIn("owner");
    const signOut = await postAuth(new Request("http://localhost:3000/api/auth/sign-out", {
      method: "POST", headers: { origin: "http://localhost:3000", cookie },
    }));
    expect(signOut.ok).toBe(true);

    const userIds = Object.values(actors).map((actor) => actor.userId);
    const before = await captureSnapshot(organizationId, userIds, requireCommercial());
    const response = await request(cookie, organizationId);

    expect(response.status).not.toBe(200);
    expect(await captureSnapshot(organizationId, userIds, requireCommercial())).toEqual(before);

  });

  it("recusa organização existente sem membership do solicitante e preserva ambos os tenants", async () => {

    const { actors } = requireFixture();
    const id = `deletion-unauthorized-${randomUUID()}`;
    const userId = `deletion-foreign-user-${randomUUID()}`;

    extraOrganization = { id, userId };

    const foreignData = await db.transaction(async (tx) => {
      await tx.insert(schema.organization).values({ id, name: "Foreign deletion target", slug: `deletion-${randomUUID()}` });
      await tx.insert(schema.user).values({ id: userId, name: "Foreign owner", email: `${randomUUID()}@example.test`, emailVerified: true });
      await tx.insert(schema.member).values({ id: `deletion-member-${randomUUID()}`, organizationId: id, userId, role: "owner" });
      const [client] = await tx.insert(schema.clients).values({ organizationId: id, kind: "company", name: "Foreign tenant private client", ownerUserId: userId }).returning({ id: schema.clients.id });
      const [audit] = await tx.insert(schema.auditLogs).values({ organizationId: id, actorUserId: userId, action: "fixture_history", entityType: "client", entityId: client.id }).returning({ id: schema.auditLogs.id });
      extraOrganization = { id, userId };
      return { clientId: client.id, auditId: audit.id };
    });
    const cookie = await signIn("owner");
    const beforeA = await captureSnapshot(requireFixture().organizationId, Object.values(actors).map((actor) => actor.userId), requireCommercial());
    const foreignRecords = { clientIds: [foreignData.clientId], dealIds: [], taskIds: [], activityIds: [], auditIds: [foreignData.auditId] };
    const beforeB = await captureSnapshot(id, [userId], foreignRecords);
    const response = await request(cookie, id);

    expect(response.status).toBe(404);
    expect((await response.json() as { code?: string }).code).toBe("ORGANIZATION_DELETION_DISABLED");
    expect(await captureSnapshot(requireFixture().organizationId, Object.values(actors).map((actor) => actor.userId), requireCommercial())).toEqual(beforeA);

    const afterB = await captureSnapshot(id, [userId], foreignRecords);
    
    expect(afterB.organization).toEqual(beforeB.organization);
    expect(afterB.memberships).toEqual(beforeB.memberships);
    expect(afterB.users).toEqual(beforeB.users);
    expect(afterB.clients).toEqual(beforeB.clients);
    expect(afterB.audits).toEqual(beforeB.audits);
    expect(afterB.activities).toEqual(beforeB.activities);

  });

  it("mantém alteração permitida de papel via endpoint Better Auth", async () => {

    const { organizationId, actors } = requireFixture();
    const cookie = await signIn("owner");
    const response = await postAuth(new Request("http://localhost:3000/api/auth/organization/update-member-role", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:3000", cookie },
      body: JSON.stringify({ organizationId, memberId: actors.target.memberId, role: "admin" }),
    }));

    expect(response.status).toBe(200);
    expect(await db.select({ role: schema.member.role }).from(schema.member).where(and(
      eq(schema.member.organizationId, organizationId), eq(schema.member.userId, actors.target.userId),
    ))).toEqual([{ role: "admin" }]);
    expect(await db.select({ id: schema.organization.id }).from(schema.organization).where(eq(schema.organization.id, organizationId))).toHaveLength(1);

  });

  it("mantém remoção administrativa autorizada de membro sem responsabilidades", async () => {

    const { organizationId, actors } = requireFixture();
    const cookie = await signIn("owner");
    const response = await postAuth(new Request("http://localhost:3000/api/auth/organization/remove-member", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:3000", cookie },
      body: JSON.stringify({ organizationId, memberIdOrEmail: actors.member.memberId }),
    }));

    expect(response.status).toBe(200);
    expect(await db.select({ id: schema.member.id }).from(schema.member).where(and(
      eq(schema.member.organizationId, organizationId), eq(schema.member.userId, actors.member.userId),
    ))).toHaveLength(0);
    expect(await db.select({ id: schema.organization.id }).from(schema.organization).where(eq(schema.organization.id, organizationId))).toHaveLength(1);
    expect(await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.id, actors.member.userId))).toHaveLength(1);

  });

  it("mantém saída voluntária permitida de membro sem responsabilidades", async () => {

    const { organizationId, actors } = requireFixture();
    const cookie = await signIn("member");
    const response = await postAuth(new Request("http://localhost:3000/api/auth/organization/leave", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:3000", cookie },
      body: JSON.stringify({ organizationId }),
    }));

    expect(response.status).toBe(200);
    expect(await db.select({ id: schema.member.id }).from(schema.member).where(and(
      eq(schema.member.organizationId, organizationId), eq(schema.member.userId, actors.member.userId),
    ))).toHaveLength(0);
    expect(await db.select({ id: schema.organization.id }).from(schema.organization).where(eq(schema.organization.id, organizationId))).toHaveLength(1);
    expect(await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.id, actors.member.userId))).toHaveLength(1);

  });
});
