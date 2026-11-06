import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, inArray } from "drizzle-orm";
import * as schema from "@/db/schema";
import { createIsolatedConnectionPair, type IsolatedConnectionPair } from "../helpers/test-db";
import { seedTeamRbacFixture, signInAndGetCookie } from "../helpers/team-rbac-fixture";

const runtime = vi.hoisted(() => ({
  db: undefined as NodePgDatabase<typeof schema> | undefined,
  cookie: "",
}));

vi.mock("@/db", () => ({
  getDb: () => {
    if (!runtime.db) throw new Error("Banco isolado não inicializado.");
    return runtime.db;
  },
}));

// Apenas encaminha o cookie real do handler Better Auth até next/headers.
vi.mock("next/headers", () => ({ headers: async () => new Headers(runtime.cookie ? { cookie: runtime.cookie } : {}) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

type Fixture = Awaited<ReturnType<typeof seedTeamRbacFixture>>;
type Summary = Awaited<ReturnType<typeof import("@/modules/team/actions").getMemberAssignmentSummary>>;
type RecordIds = { clientsA: string[]; dealsA: string[]; tasksA: string[]; clientsB: string[]; dealsB: string[]; tasksB: string[] };

let connection: IsolatedConnectionPair | undefined;
let db: NodePgDatabase<typeof schema>;
let fixture: Fixture | undefined;
let organizationB = "";
let userB = "";
let ids: RecordIds;
let getMemberAssignmentSummary: typeof import("@/modules/team/actions").getMemberAssignmentSummary;
let postAuth: (request: Request) => Promise<Response>;
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

  const authRoute = await import("@/app/api/auth/[...all]/route");

  postAuth = authRoute.POST;

  ({ getMemberAssignmentSummary } = await import("@/modules/team/actions"));

});

beforeEach(async () => {

  fixture = await seedTeamRbacFixture(db);
  organizationB = `team-summary-org-${randomUUID()}`;
  userB = `team-summary-user-${randomUUID()}`;

  ids = await db.transaction(async (tx) => {

    const sourceUserId = fixture!.actors.member.userId;

    await tx.insert(schema.organization).values({ id: organizationB, name: "Summary tenant B", slug: `team-summary-${randomUUID()}` });
    await tx.insert(schema.user).values({ id: userB, name: "Tenant B user", email: `${randomUUID()}@example.test` });
    await tx.insert(schema.member).values({ id: `team-summary-member-${randomUUID()}`, organizationId: organizationB, userId: userB, role: "owner" });

    const [activeClientA] = await tx.insert(schema.clients).values({ organizationId: fixture!.organizationId, kind: "company", name: "Active client A", ownerUserId: sourceUserId }).returning({ id: schema.clients.id });
    const [archivedClientA] = await tx.insert(schema.clients).values({ organizationId: fixture!.organizationId, kind: "person", name: "Archived client A", ownerUserId: sourceUserId, deletedAt: new Date("2026-01-11T10:00:00Z") }).returning({ id: schema.clients.id });
    const [activeDealA] = await tx.insert(schema.deals).values({ organizationId: fixture!.organizationId, clientId: activeClientA.id, title: "Active deal A", amount: "120.00", ownerUserId: sourceUserId }).returning({ id: schema.deals.id });
    const [archivedDealA] = await tx.insert(schema.deals).values({ organizationId: fixture!.organizationId, clientId: archivedClientA.id, title: "Archived deal A", amount: "230.00", ownerUserId: sourceUserId, deletedAt: new Date("2026-01-12T10:00:00Z") }).returning({ id: schema.deals.id });
    const [activeTaskA] = await tx.insert(schema.tasks).values({ organizationId: fixture!.organizationId, title: "Active task A", dueAt: new Date("2027-10-01T10:00:00Z"), assigneeUserId: sourceUserId, clientId: activeClientA.id, dealId: activeDealA.id }).returning({ id: schema.tasks.id });
    const [archivedTaskA] = await tx.insert(schema.tasks).values({ organizationId: fixture!.organizationId, title: "Archived task A", dueAt: new Date("2027-10-02T10:00:00Z"), assigneeUserId: sourceUserId, clientId: archivedClientA.id, dealId: archivedDealA.id, deletedAt: new Date("2026-01-13T10:00:00Z") }).returning({ id: schema.tasks.id });

    const [clientB] = await tx.insert(schema.clients).values({ organizationId: organizationB, kind: "company", name: "Private client B", ownerUserId: userB }).returning({ id: schema.clients.id });
    const [dealB] = await tx.insert(schema.deals).values({ organizationId: organizationB, clientId: clientB.id, title: "Private deal B", amount: "990.00", ownerUserId: userB }).returning({ id: schema.deals.id });
    const [taskB] = await tx.insert(schema.tasks).values({ organizationId: organizationB, title: "Private task B", dueAt: new Date("2027-10-03T10:00:00Z"), assigneeUserId: userB, clientId: clientB.id, dealId: dealB.id }).returning({ id: schema.tasks.id });

    return {
      clientsA: [activeClientA.id, archivedClientA.id],
      dealsA: [activeDealA.id, archivedDealA.id],
      tasksA: [activeTaskA.id, archivedTaskA.id],
      clientsB: [clientB.id],
      dealsB: [dealB.id],
      tasksB: [taskB.id],
    };

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
        await tx.delete(schema.account).where(eq(schema.account.userId, userB));
        await tx.delete(schema.session).where(eq(schema.session.userId, userB));
        await tx.delete(schema.user).where(eq(schema.user.id, userB));
      });
      const residue = await db.select({ id: schema.organization.id }).from(schema.organization).where(eq(schema.organization.id, organizationB));
      const userResidue = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.id, userB));

      if (residue.length || userResidue.length) throw new Error("Resíduos da fixture do tenant B após cleanup.");

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
      const [orgResidue, usersResidue, membersResidue, clientsResidue, dealsResidue, tasksResidue, activitiesResidue, auditsResidue, accountsResidue, sessionsResidue] = await Promise.all([
        db.select({ id: schema.organization.id }).from(schema.organization).where(eq(schema.organization.id, orgId)),
        db.select({ id: schema.user.id }).from(schema.user).where(inArray(schema.user.id, userIds)),
        db.select({ id: schema.member.id }).from(schema.member).where(eq(schema.member.organizationId, orgId)),
        db.select({ id: schema.clients.id }).from(schema.clients).where(eq(schema.clients.organizationId, orgId)),
        db.select({ id: schema.deals.id }).from(schema.deals).where(eq(schema.deals.organizationId, orgId)),
        db.select({ id: schema.tasks.id }).from(schema.tasks).where(eq(schema.tasks.organizationId, orgId)),
        db.select({ id: schema.activities.id }).from(schema.activities).where(eq(schema.activities.organizationId, orgId)),
        db.select({ id: schema.auditLogs.id }).from(schema.auditLogs).where(eq(schema.auditLogs.organizationId, orgId)),
        db.select({ id: schema.account.id }).from(schema.account).where(inArray(schema.account.userId, userIds)),
        db.select({ id: schema.session.id }).from(schema.session).where(inArray(schema.session.userId, userIds)),
      ]);

      if ([orgResidue, usersResidue, membersResidue, clientsResidue, dealsResidue, tasksResidue, activitiesResidue, auditsResidue, accountsResidue, sessionsResidue].some((rows) => rows.length)) {

        throw new Error(`Resíduos da fixture ${orgId} após cleanup.`);

      }

    } catch (error) {

      errors.push(error);

    }

  }

  fixture = undefined;
  runtime.db = db;

  if (errors.length) throw new AggregateError(errors, "Falha no cleanup dos testes do resumo de responsabilidades.");

});

afterAll(async () => {

  runtime.cookie = "";
  runtime.db = undefined;

  restoreAuthEnvironment?.();

  if (connection) await connection.cleanup();

});

function requireFixture(): Fixture {

  if (!fixture) throw new Error("Fixture do painel não inicializada.");

  return fixture;

}

async function signIn(role: "owner" | "admin" | "member") {

  const cookie = await signInAndGetCookie(postAuth, requireFixture().actors[role]);

  runtime.cookie = cookie;

}

function zeroCounts(summary: Summary) {

  expect(summary.every((person) => person.total.all === 0)).toBe(true);
  expect(summary.every((person) => person.clients.active === 0 && person.clients.archived === 0 && person.deals.active === 0 && person.deals.archived === 0 && person.tasks.active === 0 && person.tasks.archived === 0)).toBe(true);

}

describe("resumo de responsabilidades administrativo", () => {

  it("OWNER vê contagens persistidas por membro, separa arquivados e não inclui o tenant B", async () => {

    const { actors, organizationId } = requireFixture();

    await signIn("owner");

    const summary = await getMemberAssignmentSummary();
    const source = summary.find((row) => row.userId === actors.member.userId);
    const memberWithoutAssignments = summary.find((row) => row.userId === actors.target.userId);

    expect(summary).toHaveLength(5);
    expect(summary.every((row) => row.role && row.userId !== userB)).toBe(true);
    expect(source).toMatchObject({
      memberId: actors.member.memberId,
      userId: actors.member.userId,
      name: "RBAC member",
      email: actors.member.email,
      role: "member",
      clients: { active: 1, archived: 1 },
      deals: { active: 1, archived: 1 },
      tasks: { active: 1, archived: 1 },
      total: { active: 3, archived: 3, all: 6 },
    });
    expect(memberWithoutAssignments).toMatchObject({
      role: "member",
      clients: { active: 0, archived: 0 },
      deals: { active: 0, archived: 0 },
      tasks: { active: 0, archived: 0 },
      total: { active: 0, archived: 0, all: 0 },
    });
    expect(summary.every((row) => row.userId !== userB)).toBe(true);
    expect(await db.select({ id: schema.clients.id }).from(schema.clients).where(inArray(schema.clients.id, ids.clientsB))).toHaveLength(1);
    expect(organizationId).not.toBe(organizationB);

  });

  it.each(["admin", "member"] as const)("bloqueia %s no servidor sem retornar o resumo restrito", async (role) => {

    await signIn(role);

    await expect(getMemberAssignmentSummary()).rejects.toThrow();

  });

  it("bloqueia consulta direta sem sessão", async () => {

    runtime.cookie = "";

    await expect(getMemberAssignmentSummary()).rejects.toThrow();

  });

  it("retorna zeros quando a organização não possui registros comerciais atribuídos", async () => {

    const { actors } = requireFixture();

    await signIn("owner");

    await db.transaction(async (tx) => {
      await tx.delete(schema.tasks).where(inArray(schema.tasks.id, ids.tasksA));
      await tx.delete(schema.deals).where(inArray(schema.deals.id, ids.dealsA));
      await tx.delete(schema.clients).where(inArray(schema.clients.id, ids.clientsA));
    });

    const summary = await getMemberAssignmentSummary();

    expect(summary.find((row) => row.userId === actors.member.userId)).toMatchObject({ total: { active: 0, archived: 0, all: 0 } });

    zeroCounts(summary);

  });
});
