import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { and, eq, inArray } from "drizzle-orm";
import * as schema from "@/db/schema";
import { createIsolatedConnectionPair, type IsolatedConnectionPair } from "../helpers/test-db";
import { seedTeamRbacFixture, signInAndGetCookie } from "../helpers/team-rbac-fixture";

const runtime = vi.hoisted(() => ({
  db: undefined as NodePgDatabase<typeof schema> | undefined,
  cookie: "",
}));

// PostgreSQL e autenticação permanecem reais; o mock apenas conecta a action ao DB isolado.
vi.mock("@/db", () => ({
  getDb: () => {
    if (!runtime.db) throw new Error("Banco isolado não inicializado.");
    return runtime.db;
  },
}));

// Transporta o cookie HTTP ao contexto de headers do Next sem simular sessão ou identidade.
vi.mock("next/headers", () => ({
  headers: async () => new Headers(runtime.cookie ? { cookie: runtime.cookie } : {}),
}));

// A action real não precisa do cache/request store quando chamada diretamente pelo Vitest.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

type Fixture = Awaited<ReturnType<typeof seedTeamRbacFixture>>;

type Records = {
  clientA: string;
  dealA: string;
  taskA: string;
  clientB: string;
  dealB: string;
  taskB: string;
};

type AssignmentState = {
  clients: typeof schema.clients.$inferSelect[];
  deals: typeof schema.deals.$inferSelect[];
  tasks: typeof schema.tasks.$inferSelect[];
};

let connection: IsolatedConnectionPair | undefined;
let db: NodePgDatabase<typeof schema>;
let fixture: Fixture | undefined;
let organizationB = "";
let userB = "";
let userWithoutMembership = "";
let records: Records;
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

  const route = await import("@/app/api/auth/[...all]/route");

  postAuth = route.POST;

  ({ transferMemberAssignments } = await import("@/modules/team/actions"));

});

beforeEach(async () => {

  fixture = await seedTeamRbacFixture(db);
  organizationB = `batch-real-auth-org-${randomUUID()}`;
  userB = `batch-real-auth-user-${randomUUID()}`;
  userWithoutMembership = `batch-real-auth-unmember-${randomUUID()}`;

  records = await db.transaction(async (tx) => {

    const sourceId = fixture!.actors.member.userId;

    await tx.insert(schema.organization).values({
      id: organizationB,
      name: "Batch transfer tenant B",
      slug: `batch-real-auth-${randomUUID()}`,
    });

    await tx.insert(schema.user).values([
      { id: userB, name: "Tenant B owner", email: `${randomUUID()}@example.test`, emailVerified: true },
      { id: userWithoutMembership, name: "Unassigned identity", email: `${randomUUID()}@example.test`, emailVerified: true },
    ]);

    await tx.insert(schema.member).values({
      id: `batch-real-auth-member-${randomUUID()}`,
      organizationId: organizationB,
      userId: userB,
      role: "owner",
    });

    const [clientA] = await tx.insert(schema.clients).values({
      organizationId: fixture!.organizationId,
      kind: "company",
      name: "Tenant A transfer client",
      ownerUserId: sourceId,
    }).returning({ id: schema.clients.id });
    const [dealA] = await tx.insert(schema.deals).values({
      organizationId: fixture!.organizationId,
      clientId: clientA.id,
      title: "Tenant A transfer opportunity",
      amount: "640.00",
      ownerUserId: sourceId,
    }).returning({ id: schema.deals.id });
    const [taskA] = await tx.insert(schema.tasks).values({
      organizationId: fixture!.organizationId,
      title: "Tenant A transfer task",
      dueAt: new Date("2027-11-12T12:00:00Z"),
      assigneeUserId: sourceId,
      clientId: clientA.id,
      dealId: dealA.id,
    }).returning({ id: schema.tasks.id });

    const [clientB] = await tx.insert(schema.clients).values({
      organizationId: organizationB,
      kind: "company",
      name: "Tenant B private client",
      ownerUserId: userB,
    }).returning({ id: schema.clients.id });
    const [dealB] = await tx.insert(schema.deals).values({
      organizationId: organizationB,
      clientId: clientB.id,
      title: "Tenant B private opportunity",
      amount: "920.00",
      ownerUserId: userB,
    }).returning({ id: schema.deals.id });
    const [taskB] = await tx.insert(schema.tasks).values({
      organizationId: organizationB,
      title: "Tenant B private task",
      dueAt: new Date("2027-12-13T12:00:00Z"),
      assigneeUserId: userB,
      clientId: clientB.id,
      dealId: dealB.id,
    }).returning({ id: schema.tasks.id });

    return { clientA: clientA.id, dealA: dealA.id, taskA: taskA.id, clientB: clientB.id, dealB: dealB.id, taskB: taskB.id };

  });

  runtime.cookie = "";

});

afterEach(async () => {

  const errors: unknown[] = [];
  
  runtime.cookie = "";

  const fixtureToClean = fixture;


  if (organizationB) {

    try {

      await db.transaction(async (tx) => {

        await tx.delete(schema.activities).where(eq(schema.activities.organizationId, organizationB));
        await tx.delete(schema.tasks).where(eq(schema.tasks.organizationId, organizationB));
        await tx.delete(schema.deals).where(eq(schema.deals.organizationId, organizationB));
        await tx.delete(schema.contacts).where(eq(schema.contacts.organizationId, organizationB));
        await tx.delete(schema.clients).where(eq(schema.clients.organizationId, organizationB));
        await tx.delete(schema.auditLogs).where(eq(schema.auditLogs.organizationId, organizationB));
        await tx.delete(schema.invitation).where(eq(schema.invitation.organizationId, organizationB));
        await tx.delete(schema.member).where(eq(schema.member.organizationId, organizationB));
        await tx.delete(schema.organization).where(eq(schema.organization.id, organizationB));
        await tx.delete(schema.account).where(inArray(schema.account.userId, [userB, userWithoutMembership]));
        await tx.delete(schema.session).where(inArray(schema.session.userId, [userB, userWithoutMembership]));
        await tx.delete(schema.user).where(eq(schema.user.id, userB));
        await tx.delete(schema.user).where(eq(schema.user.id, userWithoutMembership));

      });

      const [orgResidue, userResidue, memberResidue, accountResidue, sessionResidue, clientResidue, dealResidue, taskResidue, auditResidue] = await Promise.all([
        db.select({ id: schema.organization.id }).from(schema.organization).where(eq(schema.organization.id, organizationB)),
        db.select({ id: schema.user.id }).from(schema.user).where(inArray(schema.user.id, [userB, userWithoutMembership])),
        db.select({ id: schema.member.id }).from(schema.member).where(eq(schema.member.organizationId, organizationB)),
        db.select({ id: schema.account.id }).from(schema.account).where(inArray(schema.account.userId, [userB, userWithoutMembership])),
        db.select({ id: schema.session.id }).from(schema.session).where(inArray(schema.session.userId, [userB, userWithoutMembership])),
        db.select({ id: schema.clients.id }).from(schema.clients).where(eq(schema.clients.organizationId, organizationB)),
        db.select({ id: schema.deals.id }).from(schema.deals).where(eq(schema.deals.organizationId, organizationB)),
        db.select({ id: schema.tasks.id }).from(schema.tasks).where(eq(schema.tasks.organizationId, organizationB)),
        db.select({ id: schema.auditLogs.id }).from(schema.auditLogs).where(eq(schema.auditLogs.organizationId, organizationB)),
      ]);

      if (orgResidue.length || userResidue.length || memberResidue.length || accountResidue.length || sessionResidue.length || clientResidue.length || dealResidue.length || taskResidue.length || auditResidue.length) {

        throw new Error("Resíduos da fixture do tenant B após cleanup.");

      }
    } catch (error) {

      errors.push(error);

    }
  }

  try {

    await fixtureToClean?.cleanup();

  } catch (error) {

    errors.push(error);

  }

  if (fixtureToClean) {

    try {

      const orgId = fixtureToClean.organizationId;
      const userIds = Object.values(fixtureToClean.actors).map((actor) => actor.userId);
      const [orgResidue, userResidue, accountResidue, sessionResidue, clientResidue, contactResidue, dealResidue, taskResidue, activityResidue, auditResidue, memberResidue, invitationResidue] = await Promise.all([
        db.select({ id: schema.organization.id }).from(schema.organization).where(eq(schema.organization.id, orgId)),
        db.select({ id: schema.user.id }).from(schema.user).where(inArray(schema.user.id, userIds)),
        db.select({ id: schema.account.id }).from(schema.account).where(inArray(schema.account.userId, userIds)),
        db.select({ id: schema.session.id }).from(schema.session).where(inArray(schema.session.userId, userIds)),
        db.select({ id: schema.clients.id }).from(schema.clients).where(eq(schema.clients.organizationId, orgId)),
        db.select({ id: schema.contacts.id }).from(schema.contacts).where(eq(schema.contacts.organizationId, orgId)),
        db.select({ id: schema.deals.id }).from(schema.deals).where(eq(schema.deals.organizationId, orgId)),
        db.select({ id: schema.tasks.id }).from(schema.tasks).where(eq(schema.tasks.organizationId, orgId)),
        db.select({ id: schema.activities.id }).from(schema.activities).where(eq(schema.activities.organizationId, orgId)),
        db.select({ id: schema.auditLogs.id }).from(schema.auditLogs).where(eq(schema.auditLogs.organizationId, orgId)),
        db.select({ id: schema.member.id }).from(schema.member).where(eq(schema.member.organizationId, orgId)),
        db.select({ id: schema.invitation.id }).from(schema.invitation).where(eq(schema.invitation.organizationId, orgId)),
      ]);

      if (orgResidue.length || userResidue.length || accountResidue.length || sessionResidue.length || clientResidue.length || contactResidue.length || dealResidue.length || taskResidue.length || activityResidue.length || auditResidue.length || memberResidue.length || invitationResidue.length) {

        throw new Error(`Resíduos da fixture ${orgId} após cleanup.`);

      }
    } catch (error) {

      errors.push(error);

    }
  }

  fixture = undefined;

  runtime.db = db;

  if (errors.length) throw new AggregateError(errors, "Falha no cleanup dos testes Better Auth de transferência em lote.");

});

afterAll(async () => {

  runtime.cookie = "";
  runtime.db = undefined;

  restoreAuthEnvironment?.();

  if (connection) await connection.cleanup();

});

function requireFixture(): Fixture {

  if (!fixture) throw new Error("Fixture Better Auth não inicializada.");

  return fixture;

}

async function signIn(actor: "owner" | "admin" | "member") {

  const cookie = await signInAndGetCookie(postAuth, requireFixture().actors[actor]);

  runtime.cookie = cookie;

  return cookie;

}

async function stateA(): Promise<AssignmentState> {

  const organizationId = requireFixture().organizationId;

  return {
    clients: await db.select().from(schema.clients).where(eq(schema.clients.organizationId, organizationId)),
    deals: await db.select().from(schema.deals).where(eq(schema.deals.organizationId, organizationId)),
    tasks: await db.select().from(schema.tasks).where(eq(schema.tasks.organizationId, organizationId)),
  };

}

async function stateB(): Promise<AssignmentState> {

  return {
    clients: await db.select().from(schema.clients).where(eq(schema.clients.organizationId, organizationB)),
    deals: await db.select().from(schema.deals).where(eq(schema.deals.organizationId, organizationB)),
    tasks: await db.select().from(schema.tasks).where(eq(schema.tasks.organizationId, organizationB)),
  };

}

async function recordsAuditRows(ids = Object.values(records)) {

  return db.select().from(schema.auditLogs).where(and(
    inArray(schema.auditLogs.organizationId, [requireFixture().organizationId, organizationB]),
    inArray(schema.auditLogs.entityId, ids),
  ));

}

function expectNoTenantBDisclosure(value: unknown) {

  const serialized = JSON.stringify(value);

  for (const secret of [organizationB, userB, records.clientB, records.dealB, records.taskB, "Tenant B private"]) {

    expect(serialized).not.toContain(secret);

  }
}

async function assertRejectedWithoutEffects() {

  const beforeA = await stateA();
  const beforeB = await stateB();
  const auditBefore = await recordsAuditRows();

  let result: unknown;
  let threw = false;

  try {

    result = await transferMemberAssignments({ fromUserId: requireFixture().actors.member.userId, toUserId: requireFixture().actors.target.userId });

  } catch {

    threw = true;

  }

  if (!threw) expect(result).not.toMatchObject({ ok: true });

  expect(await stateA()).toEqual(beforeA);
  expect(await stateB()).toEqual(beforeB);
  expect(await recordsAuditRows()).toEqual(auditBefore);

}

describe("transferMemberAssignments com sessão Better Auth real", () => {

  it("OWNER autenticado transfere clientes, oportunidades e tarefas no próprio workspace", async () => {

    const { actors, organizationId } = requireFixture();

    await signIn("owner");

    const result = await transferMemberAssignments({ fromUserId: actors.member.userId, toUserId: actors.target.userId });

    expect(result).toEqual({
      ok: true,
      counts: { clients: 1, deals: 1, tasks: 1, total: 3 },
      archivedReferencesPending: { clients: 0, deals: 0, tasks: 0, total: 0 },
    });
    expect(await stateA()).toMatchObject({
      clients: [expect.objectContaining({ id: records.clientA, organizationId, ownerUserId: actors.target.userId })],
      deals: [expect.objectContaining({ id: records.dealA, organizationId, ownerUserId: actors.target.userId })],
      tasks: [expect.objectContaining({ id: records.taskA, organizationId, assigneeUserId: actors.target.userId })],
    });
    expect((await stateB()).clients[0]).toMatchObject({ id: records.clientB, ownerUserId: userB });
    expect((await stateB()).deals[0]).toMatchObject({ id: records.dealB, ownerUserId: userB });
    expect((await stateB()).tasks[0]).toMatchObject({ id: records.taskB, assigneeUserId: userB });

    const audits = await recordsAuditRows();
    
    expect(audits).toHaveLength(3);
    expect(audits).toEqual(expect.arrayContaining([
      expect.objectContaining({ organizationId, actorUserId: actors.owner.userId, action: "reassign", entityType: "client", entityId: records.clientA, details: JSON.stringify({ fromUserId: actors.member.userId, toUserId: actors.target.userId }) }),
      expect.objectContaining({ organizationId, actorUserId: actors.owner.userId, action: "reassign", entityType: "deal", entityId: records.dealA, details: JSON.stringify({ fromUserId: actors.member.userId, toUserId: actors.target.userId }) }),
      expect.objectContaining({ organizationId, actorUserId: actors.owner.userId, action: "reassign", entityType: "task", entityId: records.taskA, details: JSON.stringify({ fromUserId: actors.member.userId, toUserId: actors.target.userId }) }),
    ]));

  });

  it("OWNER autenticado desatribui as três entidades e preserva os registros", async () => {

    const { actors, organizationId } = requireFixture();

    await signIn("owner");

    const result = await transferMemberAssignments({ fromUserId: actors.member.userId, toUserId: null });

    expect(result).toMatchObject({ ok: true, counts: { clients: 1, deals: 1, tasks: 1, total: 3 } });
    expect(await db.select({ id: schema.clients.id, ownerUserId: schema.clients.ownerUserId }).from(schema.clients).where(eq(schema.clients.id, records.clientA))).toEqual([{ id: records.clientA, ownerUserId: null }]);
    expect(await db.select({ id: schema.deals.id, ownerUserId: schema.deals.ownerUserId }).from(schema.deals).where(eq(schema.deals.id, records.dealA))).toEqual([{ id: records.dealA, ownerUserId: null }]);
    expect(await db.select({ id: schema.tasks.id, assigneeUserId: schema.tasks.assigneeUserId }).from(schema.tasks).where(eq(schema.tasks.id, records.taskA))).toEqual([{ id: records.taskA, assigneeUserId: null }]);

    const audits = await recordsAuditRows();

    expect(audits).toHaveLength(3);
    expect(audits.every((row) => row.organizationId === organizationId && row.actorUserId === actors.owner.userId && row.action === "unassign")).toBe(true);
    expect(audits.map((row) => JSON.parse(row.details ?? "{}")).every((details) => details.fromUserId === actors.member.userId && details.toUserId === null)).toBe(true);

  });

  it.each(["admin", "member"] as const)("rejeita %s autenticado sem alterar dados nem auditar", async (role) => {

    await signIn(role);

    const beforeA = await stateA();
    const beforeB = await stateB();
    const auditsBefore = await recordsAuditRows();

    await expect(transferMemberAssignments({ fromUserId: requireFixture().actors.member.userId, toUserId: requireFixture().actors.target.userId })).rejects.toThrow();

    expect(await stateA()).toEqual(beforeA);
    expect(await stateB()).toEqual(beforeB);
    expect(await recordsAuditRows()).toEqual(auditsBefore);

  });

  it("rejeita chamada sem sessão Better Auth", async () => {

    const beforeA = await stateA();
    const beforeB = await stateB();

    runtime.cookie = "";

    await expect(transferMemberAssignments({ fromUserId: requireFixture().actors.member.userId, toUserId: requireFixture().actors.target.userId })).rejects.toThrow();

    expect(await stateA()).toEqual(beforeA);
    expect(await stateB()).toEqual(beforeB);
    expect(await recordsAuditRows()).toHaveLength(0);

  });

  it("rejeita sessão revogada pelo endpoint real de sign-out", async () => {

    const cookie = await signIn("owner");
    const response = await postAuth(new Request("http://localhost:3000/api/auth/sign-out", {
      method: "POST",
      headers: { origin: "http://localhost:3000", cookie },
    }));

    expect(response.ok).toBe(true);
    expect(await db.select({ id: schema.session.id }).from(schema.session).where(eq(schema.session.userId, requireFixture().actors.owner.userId))).toHaveLength(0);

    runtime.cookie = cookie;

    await assertRejectedWithoutEffects();

  });

  it("rejeita OWNER cuja membership foi removida, sem alterar dados nem auditar", async () => {

    const { actors, organizationId } = requireFixture();

    await signIn("owner");
    await db.delete(schema.member).where(and(eq(schema.member.organizationId, organizationId), eq(schema.member.userId, actors.owner.userId)));

    const beforeA = await stateA();
    const beforeB = await stateB();

    await expect(transferMemberAssignments({ fromUserId: actors.member.userId, toUserId: actors.target.userId })).rejects.toThrow();

    expect(await stateA()).toEqual(beforeA);
    expect(await stateB()).toEqual(beforeB);
    expect(await recordsAuditRows()).toHaveLength(0);

  });

  it("activeOrganizationId adulterado para B não concede acesso aos registros de B", async () => {

    const { actors } = requireFixture();

    await signIn("owner");

    const [session] = await db.select({ id: schema.session.id }).from(schema.session).where(eq(schema.session.userId, actors.owner.userId));

    expect(session).toBeDefined();

    await db.update(schema.session).set({ activeOrganizationId: organizationB }).where(eq(schema.session.id, session!.id));

    const beforeA = await stateA();
    const beforeB = await stateB();

    await expect(transferMemberAssignments({ fromUserId: userB, toUserId: actors.owner.userId })).rejects.toThrow();

    expect(await stateA()).toEqual(beforeA);
    expect(await stateB()).toEqual(beforeB);
    expect(await recordsAuditRows()).toHaveLength(0);

  });

  it("rejeita origem que pertence somente ao tenant B", async () => {

    await signIn("owner");

    const beforeA = await stateA();
    const beforeB = await stateB();
    const result = await transferMemberAssignments({ fromUserId: userB, toUserId: requireFixture().actors.target.userId });

    expect(result).toMatchObject({ ok: false });
    expectNoTenantBDisclosure(result);
    expect(await stateA()).toEqual(beforeA);
    expect(await stateB()).toEqual(beforeB);
    expect(await recordsAuditRows()).toHaveLength(0);

  });

  it("rejeita destino que pertence somente ao tenant B", async () => {

    const { actors } = requireFixture();

    await signIn("owner");

    const beforeA = await stateA();
    const beforeB = await stateB();
    const result = await transferMemberAssignments({ fromUserId: actors.member.userId, toUserId: userB });

    expect(result).toMatchObject({ ok: false });
    expectNoTenantBDisclosure(result);
    expect(await stateA()).toEqual(beforeA);
    expect(await stateB()).toEqual(beforeB);
    expect(await recordsAuditRows()).toHaveLength(0);

  });

  it("rejeita destino existente sem membership", async () => {

    const { actors } = requireFixture();

    await signIn("owner");

    const beforeA = await stateA();
    const result = await transferMemberAssignments({ fromUserId: actors.member.userId, toUserId: userWithoutMembership });

    expect(result).toMatchObject({ ok: false });
    expectNoTenantBDisclosure(result);
    expect(await stateA()).toEqual(beforeA);
    expect(await recordsAuditRows()).toHaveLength(0);

  });

  it("rejeita origem igual ao destino sem alterações", async () => {

    const { actors } = requireFixture();

    await signIn("owner");

    const beforeA = await stateA();

    expect(await transferMemberAssignments({ fromUserId: actors.member.userId, toUserId: actors.member.userId })).toMatchObject({ ok: false });
    expect(await stateA()).toEqual(beforeA);
    expect(await recordsAuditRows()).toHaveLength(0);

  });
});
