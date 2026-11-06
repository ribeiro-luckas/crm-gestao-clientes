import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { and, eq, inArray } from "drizzle-orm";
import * as schema from "@/db/schema";
import { createIsolatedConnectionPair, type IsolatedConnectionPair } from "../helpers/test-db";
import { seedTeamRbacFixture, signInAndGetCookie } from "../helpers/team-rbac-fixture";

const runtime = vi.hoisted(() => ({ db: undefined as NodePgDatabase<typeof schema> | undefined, cookie: "" }));

// O handler Better Auth, o adapter Drizzle e as sessões continuam reais; apenas
// getDb aponta para o pool explicitamente isolado do teste.
vi.mock("@/db", () => ({
  getDb: () => {
    if (!runtime.db) throw new Error("Banco isolado não inicializado.");
    return runtime.db;
  },
}));

// Usado exclusivamente para transportar a sessão real à Server Action de transferência.
vi.mock("next/headers", () => ({ headers: async () => new Headers(runtime.cookie ? { cookie: runtime.cookie } : {}) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

type Fixture = Awaited<ReturnType<typeof seedTeamRbacFixture>>;
type Actor = "owner" | "admin" | "member" | "target" | "ownerPeer";
type Entity = "client" | "deal" | "task";
type Assignment = { entity: Entity; id: string; clientId?: string; deletedAt: Date | null; activityId: string; auditId: string };
type ExtraTenant = { organizationId: string; userIds: string[] };

let connection: IsolatedConnectionPair | undefined;
let db: NodePgDatabase<typeof schema>;
let fixture: Fixture | undefined;
let extraTenant: ExtraTenant | undefined;
let postAuth: (request: Request) => Promise<Response>;
let transferMemberAssignments: typeof import("@/modules/team/actions").transferMemberAssignments;
let restoreAuthEnvironment: (() => void) | undefined;

beforeAll(async () => {

  if (process.env.DATABASE_URL) throw new Error("DATABASE_URL proibida nesta suíte.");

  connection = await createIsolatedConnectionPair();

  db = drizzle(connection.poolA, { schema });

  runtime.db = db;

  const previousSecret = process.env.BETTER_AUTH_SECRET;
  const previousUrl = process.env.BETTER_AUTH_URL;

  process.env.BETTER_AUTH_SECRET = randomBytes(48).toString("base64url");
  process.env.BETTER_AUTH_URL = "http://localhost:3000";

  restoreAuthEnvironment = () => {

    if (previousSecret === undefined) delete process.env.BETTER_AUTH_SECRET;
    else process.env.BETTER_AUTH_SECRET = previousSecret;

    if (previousUrl === undefined) delete process.env.BETTER_AUTH_URL;
    else process.env.BETTER_AUTH_URL = previousUrl;

  };

  postAuth = (await import("@/app/api/auth/[...all]/route")).POST;

  ({ transferMemberAssignments } = await import("@/modules/team/actions"));

});

beforeEach(async () => {
  fixture = await seedTeamRbacFixture(db);
  extraTenant = undefined;
  runtime.cookie = "";
});

afterEach(async () => {

  const errors: unknown[] = [];

  runtime.cookie = "";

  if (extraTenant) {

    try {

      await cleanupTenant(extraTenant.organizationId, extraTenant.userIds);

      await assertTenantRemoved(extraTenant.organizationId, extraTenant.userIds);

    } catch (error) {
      
      errors.push(error);
    
    }
  }

  const currentFixture = fixture;

  try {

    await currentFixture?.cleanup();

    if (currentFixture) await assertTenantRemoved(currentFixture.organizationId, Object.values(currentFixture.actors).map((actor) => actor.userId));

  } catch (error) {

    errors.push(error);

  }

  fixture = undefined;
  extraTenant = undefined;

  if (errors.length) throw new AggregateError(errors, "Falha ao limpar fixtures de saída voluntária.");

});

afterAll(async () => {

  runtime.cookie = "";
  runtime.db = undefined;

  restoreAuthEnvironment?.();

  if (connection) await connection.cleanup();

});

function requireFixture(): Fixture {

  if (!fixture) throw new Error("Fixture de saída voluntária não inicializada.");

  return fixture;

}

async function signIn(actor: Actor): Promise<string> {

  const cookie = await signInAndGetCookie(postAuth, requireFixture().actors[actor]);

  runtime.cookie = cookie;

  return cookie;

}

async function leave(cookie: string, organizationId: string) {

  return postAuth(new Request("http://localhost:3000/api/auth/organization/leave", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:3000", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify({ organizationId }),
  }));

}

async function getSession(cookie: string) {

  const response = await postAuth(new Request("http://localhost:3000/api/auth/get-session", { headers: { cookie } }));

  return response.json() as Promise<{ session?: { activeOrganizationId?: string | null }; user?: { id: string } }>;

}

async function memberExists(organizationId: string, userId: string) {

  const rows = await db.select({ id: schema.member.id }).from(schema.member).where(and(
    eq(schema.member.organizationId, organizationId), eq(schema.member.userId, userId),
  ));

  return rows.length === 1;

}

async function seedAssignment(entity: Entity, archived: boolean, userId = requireFixture().actors.target.userId): Promise<Assignment> {

  const organizationId = requireFixture().organizationId;
  const deletedAt = archived ? new Date("2026-10-15T12:00:00.000Z") : null;

  return db.transaction(async (tx) => {

    let clientId: string | undefined;
    let entityId: string;

    if (entity === "client" || entity === "deal") {

      const [client] = await tx.insert(schema.clients).values({
        organizationId, kind: "company", name: `Leave ${entity} ${randomUUID()}`,
        ownerUserId: entity === "client" ? userId : requireFixture().actors.owner.userId,
      }).returning({ id: schema.clients.id });

      clientId = client.id;

      if (entity === "client") {

        const [updated] = await tx.update(schema.clients).set({ deletedAt }).where(eq(schema.clients.id, client.id)).returning({ id: schema.clients.id });

        entityId = updated.id;

      } else {

        const [deal] = await tx.insert(schema.deals).values({
          organizationId, clientId, title: `Leave deal ${randomUUID()}`, amount: "125.00", ownerUserId: userId, deletedAt,
        }).returning({ id: schema.deals.id });

        entityId = deal.id;

      }

    } else {

      const [task] = await tx.insert(schema.tasks).values({
        organizationId, title: `Leave task ${randomUUID()}`, dueAt: new Date("2027-02-10T12:00:00.000Z"),
        assigneeUserId: userId, deletedAt,
      }).returning({ id: schema.tasks.id });

      entityId = task.id;

    }

    const [audit] = await tx.insert(schema.auditLogs).values({
      organizationId, actorUserId: userId, action: "fixture_history", entityType: entity, entityId,
      details: JSON.stringify({ preserved: true }),
    }).returning({ id: schema.auditLogs.id });
    const [activity] = await tx.insert(schema.activities).values({
      organizationId, type: "note", subject: `Leave history ${randomUUID()}`, actorUserId: userId,
      ...(entity === "client" ? { clientId: entityId } : {}),
      ...(entity === "deal" ? { dealId: entityId } : {}),
      ...(entity === "task" ? { taskId: entityId } : {}),
    }).returning({ id: schema.activities.id });

    return { entity, id: entityId, clientId, deletedAt, activityId: activity.id, auditId: audit.id };

  });

}

async function getAssignment(item: Assignment) {

  if (item.entity === "client") return (await db.select().from(schema.clients).where(eq(schema.clients.id, item.id)))[0];
  if (item.entity === "deal") return (await db.select().from(schema.deals).where(eq(schema.deals.id, item.id)))[0];

  return (await db.select().from(schema.tasks).where(eq(schema.tasks.id, item.id)))[0];

}

async function historyRows() {

  const organizationId = requireFixture().organizationId;
  const [audits, activities] = await Promise.all([
    db.select().from(schema.auditLogs).where(eq(schema.auditLogs.organizationId, organizationId)),
    db.select().from(schema.activities).where(eq(schema.activities.organizationId, organizationId)),
  ]);

  // A organização pertence somente a esta fixture; comparar o conjunto inteiro
  // também detecta históricos inesperados criados pelo endpoint durante a saída.
  return { audits, activities };

}

async function expectBlockedLeave(cookie: string, organizationId: string, userId: string, items: Assignment[]) {

  const [beforeOrganization] = await db.select().from(schema.organization).where(eq(schema.organization.id, organizationId));
  const beforeRows = await Promise.all(items.map(getAssignment));
  const beforeHistory = await historyRows();
  const response = await leave(cookie, organizationId);
  const body = await response.json() as { code?: string; message?: string };

  expect(response.status).toBe(409);
  expect(body.code).toBe("MEMBER_HAS_ASSIGNMENTS");
  expect(body.message).toContain("responsabilidades atribuídas");
  expect(await memberExists(organizationId, userId)).toBe(true);
  expect(await db.select().from(schema.organization).where(eq(schema.organization.id, organizationId))).toEqual([beforeOrganization]);
  expect(await Promise.all(items.map(getAssignment))).toEqual(beforeRows);
  expect(await historyRows()).toEqual(beforeHistory);
  expect(JSON.stringify(body)).not.toContain("stack");

  return body;

}

async function makeTenantB(sharedActor?: { userId: string; role: string }, targetHasAssignments = false) {

  const organizationId = `leave-tenant-b-${randomUUID()}`;
  const userId = `leave-user-b-${randomUUID()}`;
  const memberId = `leave-member-b-${randomUUID()}`;
  const sharedActorId = sharedActor?.userId;
  const fixtureOwnerId = requireFixture().actors.ownerPeer.userId;

  let assignmentClientId: string | undefined;

  extraTenant = { organizationId, userIds: [userId] };

  await db.transaction(async (tx) => {

    await tx.insert(schema.organization).values({ id: organizationId, name: "Leave tenant B", slug: `leave-b-${randomUUID()}` });

    await tx.insert(schema.user).values({ id: userId, name: "Leave tenant B target", email: `${randomUUID()}@example.test`, emailVerified: true });

    const members = [
      { id: `leave-owner-b-${randomUUID()}`, organizationId, userId: fixtureOwnerId, role: "owner" },
      { id: memberId, organizationId, userId, role: "member" },
    ];

    if (sharedActor && sharedActorId) members.push({ id: `leave-shared-${randomUUID()}`, organizationId, userId: sharedActorId, role: sharedActor.role });

    await tx.insert(schema.member).values(members);

    if (targetHasAssignments) {

      const [client] = await tx.insert(schema.clients).values({ organizationId, kind: "company", name: "Tenant B private client", ownerUserId: sharedActorId ?? userId }).returning({ id: schema.clients.id });

      assignmentClientId = client.id;

      await tx.insert(schema.auditLogs).values({ organizationId, actorUserId: sharedActorId ?? userId, action: "fixture_history", entityType: "client", entityId: client.id });

    }

  });

  return { organizationId, userId, memberId, assignmentClientId };

}

async function cleanupTenant(organizationId: string, userIds: string[]) {

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

async function assertTenantRemoved(organizationId: string, userIds: string[]) {

  const [orgs, members, clients, deals, tasks, activities, audits, invitations] = await Promise.all([
    db.select({ id: schema.organization.id }).from(schema.organization).where(eq(schema.organization.id, organizationId)),
    db.select({ id: schema.member.id }).from(schema.member).where(eq(schema.member.organizationId, organizationId)),
    db.select({ id: schema.clients.id }).from(schema.clients).where(eq(schema.clients.organizationId, organizationId)),
    db.select({ id: schema.deals.id }).from(schema.deals).where(eq(schema.deals.organizationId, organizationId)),
    db.select({ id: schema.tasks.id }).from(schema.tasks).where(eq(schema.tasks.organizationId, organizationId)),
    db.select({ id: schema.activities.id }).from(schema.activities).where(eq(schema.activities.organizationId, organizationId)),
    db.select({ id: schema.auditLogs.id }).from(schema.auditLogs).where(eq(schema.auditLogs.organizationId, organizationId)),
    db.select({ id: schema.invitation.id }).from(schema.invitation).where(eq(schema.invitation.organizationId, organizationId)),
  ]);
  const authResidue = userIds.length ? await Promise.all(userIds.map(async (id) => {

    const [users, accounts, sessions] = await Promise.all([
      db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.id, id)),
      db.select({ id: schema.account.id }).from(schema.account).where(eq(schema.account.userId, id)),
      db.select({ id: schema.session.id }).from(schema.session).where(eq(schema.session.userId, id)),
    ]);

    return users.length + accounts.length + sessions.length;

  })) : [];

  if ([orgs, members, clients, deals, tasks, activities, audits, invitations].some((rows) => rows.length) || authResidue.some(Boolean)) {

    throw new Error(`Resíduos encontrados na fixture ${organizationId}.`);

  }

}

describe("Better Auth: proteção HTTP da saída voluntária", () => {

  it.each([
    ["cliente ativo", "client", false], ["oportunidade ativa", "deal", false], ["tarefa ativa", "task", false],
    ["cliente arquivado", "client", true], ["oportunidade arquivada", "deal", true], ["tarefa arquivada", "task", true],
  ] as const)("bloqueia saída com %s atribuído", async (_label, entity, archived) => {
    const { organizationId, actors } = requireFixture();
    const assignment = await seedAssignment(entity, archived, actors.target.userId);
    const cookie = await signIn("target");

    await expectBlockedLeave(cookie, organizationId, actors.target.userId, [assignment]);

  });

  it("bloqueia saída com atribuições nas três entidades e informa contagens do workspace solicitado", async () => {

    const { organizationId, actors } = requireFixture();
    const assignments = await Promise.all([
      seedAssignment("client", true, actors.target.userId),
      seedAssignment("deal", false, actors.target.userId),
      seedAssignment("task", true, actors.target.userId),
    ]);
    const body = await expectBlockedLeave(await signIn("target"), organizationId, actors.target.userId, assignments);

    expect(body.message).toContain("clientes: 1");
    expect(body.message).toContain("oportunidades: 1");
    expect(body.message).toContain("tarefas: 1");

  });

  it.each([["MEMBER", "member"], ["ADMIN", "admin"]] as const)("permite saída de %s sem atribuições e preserva usuário e histórico", async (_role, actor) => {

    const { organizationId, actors } = requireFixture();
    const selected = actors[actor];
    const [historicAudit] = await db.insert(schema.auditLogs).values({
      organizationId, actorUserId: selected.userId, action: "historic_member_event", entityType: "member", entityId: selected.memberId,
    }).returning({ id: schema.auditLogs.id });
    const [historicClient] = await db.insert(schema.clients).values({ organizationId, kind: "company", name: `History ${randomUUID()}`, ownerUserId: actors.owner.userId }).returning({ id: schema.clients.id });
    const [historicActivity] = await db.insert(schema.activities).values({
      organizationId, type: "note", subject: "Activity by departing user", actorUserId: selected.userId, clientId: historicClient.id,
    }).returning({ id: schema.activities.id });

    const cookie = await signIn(actor);
    const response = await leave(cookie, organizationId);

    expect(response.status).toBe(200);
    expect(await memberExists(organizationId, selected.userId)).toBe(false);
    expect(await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.id, selected.userId))).toHaveLength(1);
    expect(await db.select({ id: schema.account.id }).from(schema.account).where(eq(schema.account.userId, selected.userId))).toHaveLength(1);
    expect(await db.select({ id: schema.session.id }).from(schema.session).where(eq(schema.session.userId, selected.userId))).toHaveLength(1);
    expect(await db.select({ id: schema.auditLogs.id }).from(schema.auditLogs).where(eq(schema.auditLogs.id, historicAudit.id))).toHaveLength(1);
    expect(await db.select({ id: schema.activities.id }).from(schema.activities).where(eq(schema.activities.id, historicActivity.id))).toHaveLength(1);
    expect((await getSession(cookie)).session?.activeOrganizationId).toBeNull();

  });

  it("permite OWNER não último a sair e preserva o OWNER remanescente", async () => {

    const { organizationId, actors } = requireFixture();
    const cookie = await signIn("ownerPeer");
    const response = await leave(cookie, organizationId);

    expect(response.status).toBe(200);
    expect(await memberExists(organizationId, actors.ownerPeer.userId)).toBe(false);
    expect(await memberExists(organizationId, actors.owner.userId)).toBe(true);
    expect((await db.select({ role: schema.member.role }).from(schema.member).where(eq(schema.member.userId, actors.owner.userId)))[0]?.role).toBe("owner");

  });

  it("preserva a proteção Better Auth do último OWNER", async () => {

    const { organizationId, actors } = requireFixture();

    await db.delete(schema.member).where(and(eq(schema.member.organizationId, organizationId), eq(schema.member.userId, actors.ownerPeer.userId)));

    const cookie = await signIn("owner");
    const response = await leave(cookie, organizationId);
    const body = await response.json() as { code?: string; message?: string };

    expect(response.status).toBe(400);
    expect(body.message).toContain("only owner");
    expect(await memberExists(organizationId, actors.owner.userId)).toBe(true);
    expect(await db.select({ id: schema.organization.id }).from(schema.organization).where(eq(schema.organization.id, organizationId))).toHaveLength(1);
    expect(await db.select({ role: schema.member.role }).from(schema.member).where(and(eq(schema.member.organizationId, organizationId), eq(schema.member.role, "owner")))).toEqual([{ role: "owner" }]);

  });

  it("rejeita saída sem sessão", async () => {

    const { organizationId, actors } = requireFixture();
    const response = await leave("", organizationId);

    expect(response.status).toBe(401);
    expect(await memberExists(organizationId, actors.member.userId)).toBe(true);

  });

  it("rejeita sessão revogada pelo endpoint real de sign-out", async () => {

    const { organizationId, actors } = requireFixture();
    const cookie = await signIn("member");
    const signOut = await postAuth(new Request("http://localhost:3000/api/auth/sign-out", { method: "POST", headers: { origin: "http://localhost:3000", cookie } }));

    expect(signOut.ok).toBe(true);

    const response = await leave(cookie, organizationId);

    expect(response.status).toBe(401);
    expect(await memberExists(organizationId, actors.member.userId)).toBe(true);

  });

  it("não consulta atribuições nem permite sair de organização inexistente", async () => {

    const { organizationId, actors } = requireFixture();
    const cookie = await signIn("member");
    const response = await leave(cookie, `missing-${randomUUID()}`);

    expect(response.status).toBe(400);
    expect(await memberExists(organizationId, actors.member.userId)).toBe(true);
    expect(await db.select({ id: schema.organization.id }).from(schema.organization).where(eq(schema.organization.id, organizationId))).toHaveLength(1);

  });

  it("usa a organização explicitamente solicitada, mesmo diferente da ativa, para usuário membro em ambas", async () => {

    const { organizationId: orgA, actors } = requireFixture();
    const orgB = await makeTenantB({ userId: actors.owner.userId, role: "member" });
    const [client] = await db.insert(schema.clients).values({ organizationId: orgB.organizationId, kind: "company", name: "Only B assignment", ownerUserId: actors.owner.userId }).returning({ id: schema.clients.id });

    await db.insert(schema.auditLogs).values({ organizationId: orgB.organizationId, actorUserId: actors.owner.userId, action: "fixture_history", entityType: "client", entityId: client.id });

    const cookie = await signIn("owner");

    await db.update(schema.session).set({ activeOrganizationId: orgA }).where(eq(schema.session.userId, actors.owner.userId));

    expect((await getSession(cookie)).session?.activeOrganizationId).toBe(orgA);

    const response = await leave(cookie, orgB.organizationId);
    const body = await response.json() as { code?: string; message?: string };

    expect(response.status).toBe(409);
    expect(body.code).toBe("MEMBER_HAS_ASSIGNMENTS");
    expect(body.message).toContain("clientes: 1");
    expect(await memberExists(orgA, actors.owner.userId)).toBe(true);
    expect(await memberExists(orgB.organizationId, actors.owner.userId)).toBe(true);
    expect(await db.select({ ownerUserId: schema.clients.ownerUserId }).from(schema.clients).where(eq(schema.clients.id, client.id))).toEqual([{ ownerUserId: actors.owner.userId }]);
    expect((await getSession(cookie)).session?.activeOrganizationId).toBe(orgA);

  });

  it("não expõe atribuições de tenant sem membership do solicitante", async () => {

    const { organizationId: orgA, actors } = requireFixture();
    const orgB = await makeTenantB(undefined, true);
    const cookie = await signIn("owner");

    expect((await getSession(cookie)).session?.activeOrganizationId).toBe(orgA);

    const response = await leave(cookie, orgB.organizationId);
    const body = await response.text();

    expect(response.status).toBe(400);
    expect(body).not.toContain("MEMBER_HAS_ASSIGNMENTS");
    expect(body).not.toContain("clientes: 1");
    expect(body).not.toContain("Tenant B private client");
    expect(await memberExists(orgA, actors.owner.userId)).toBe(true);
    expect(await memberExists(orgB.organizationId, orgB.userId)).toBe(true);
    expect(await db.select({ ownerUserId: schema.clients.ownerUserId }).from(schema.clients).where(eq(schema.clients.id, orgB.assignmentClientId!)))
      .toEqual([{ ownerUserId: orgB.userId }]);
    expect(await db.select({ id: schema.auditLogs.id }).from(schema.auditLogs).where(eq(schema.auditLogs.organizationId, orgB.organizationId))).toHaveLength(1);

  });

  it("remove somente a membership explicitamente solicitada e mantém ativa a outra organização", async () => {

    const { organizationId: orgA, actors } = requireFixture();
    const orgB = await makeTenantB({ userId: actors.member.userId, role: "member" });
    const cookie = await signIn("member");

    await db.update(schema.session).set({ activeOrganizationId: orgA }).where(eq(schema.session.userId, actors.member.userId));

    expect((await getSession(cookie)).session?.activeOrganizationId).toBe(orgA);

    const response = await leave(cookie, orgB.organizationId);

    expect(response.status).toBe(200);
    expect(await memberExists(orgA, actors.member.userId)).toBe(true);
    expect(await memberExists(orgB.organizationId, actors.member.userId)).toBe(false);
    expect((await getSession(cookie)).session?.activeOrganizationId).toBe(orgA);

  });

  it("permite a saída após transferência real e preserva registros e auditoria", async () => {
    
    const { organizationId, actors } = requireFixture();
    const assignments = await Promise.all([
      seedAssignment("client", false, actors.target.userId),
      seedAssignment("deal", true, actors.target.userId),
      seedAssignment("task", false, actors.target.userId),
    ]);
    const ownerCookie = await signIn("owner");

    runtime.cookie = ownerCookie;

    const transfer = await transferMemberAssignments({ fromUserId: actors.target.userId, toUserId: actors.owner.userId });

    expect(transfer).toMatchObject({ ok: true, counts: { clients: 1, deals: 1, tasks: 1, total: 3 } });

    for (const item of assignments) {

      const row = await getAssignment(item) as { ownerUserId?: string | null; assigneeUserId?: string | null; deletedAt: Date | null };

      expect(item.entity === "task" ? row.assigneeUserId : row.ownerUserId).toBe(actors.owner.userId);
      expect(row.deletedAt).toEqual(item.deletedAt);

    }

    const targetCookie = await signIn("target");
    const response = await leave(targetCookie, organizationId);

    expect(response.status).toBe(200);
    expect(await memberExists(organizationId, actors.target.userId)).toBe(false);
    expect(await Promise.all(assignments.map(async (item) => {

      const row = await getAssignment(item) as { ownerUserId?: string | null; assigneeUserId?: string | null };

      return item.entity === "task" ? row.assigneeUserId : row.ownerUserId;

    }))).toEqual(assignments.map(() => actors.owner.userId));

    const history = await historyRows();

    expect(history.audits.filter((row) => row.action === "reassign")).toHaveLength(3);
    expect(history.activities).toHaveLength(3);

  });
});
