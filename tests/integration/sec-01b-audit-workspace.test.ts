import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { and, count, eq, inArray } from "drizzle-orm";
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
vi.mock("next/headers", () => ({
  headers: async () => new Headers(runtime.cookie ? { cookie: runtime.cookie } : {}),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

type Fixture = Awaited<ReturnType<typeof seedTeamRbacFixture>>;

let connection: IsolatedConnectionPair;
let db: NodePgDatabase<typeof schema>;
let fixtureA: Fixture | undefined;
let fixtureB: Fixture | undefined;
let fixtureC: Fixture | undefined;
let postAuth: (request: Request) => Promise<Response>;
let updateMemberRole: typeof import("@/modules/team/actions").updateMemberRole;
let createClient: typeof import("@/modules/clients/actions").createClient;
let createDeal: typeof import("@/modules/deals/actions").createDeal;
let createTask: typeof import("@/modules/tasks/actions").createTask;
let selectWorkspace: typeof import("@/modules/workspaces/actions").selectWorkspace;
let exportClients: typeof import("@/app/api/export/clients.csv/route").GET;
let requireApiWorkspaceRole: typeof import("@/lib/workspace").requireApiWorkspaceRole;
let WorkspaceAuthenticationError: typeof import("@/lib/workspace").WorkspaceAuthenticationError;
let WorkspaceSelectionRequiredError: typeof import("@/lib/workspace").WorkspaceSelectionRequiredError;
let restoreAuthEnvironment: (() => void) | undefined;

beforeAll(async () => {
  
  if (process.env.DATABASE_URL) throw new Error("Esta suíte proíbe DATABASE_URL.");

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

  ({ updateMemberRole } = await import("@/modules/team/actions"));
  ({ createClient } = await import("@/modules/clients/actions"));
  ({ createDeal } = await import("@/modules/deals/actions"));
  ({ createTask } = await import("@/modules/tasks/actions"));
  ({ selectWorkspace } = await import("@/modules/workspaces/actions"));
  ({ GET: exportClients } = await import("@/app/api/export/clients.csv/route"));
  ({ requireApiWorkspaceRole, WorkspaceAuthenticationError, WorkspaceSelectionRequiredError } = await import("@/lib/workspace"));

});

beforeEach(async () => {

  runtime.cookie = "";

  fixtureA = await seedTeamRbacFixture(db);

});

afterEach(async () => {

  runtime.cookie = "";

  const fixtures = [fixtureC, fixtureB, fixtureA];

  fixtureA = undefined;
  fixtureB = undefined;
  fixtureC = undefined;

  for (const fixture of fixtures) await fixture?.cleanup();

});

afterAll(async () => {

  runtime.cookie = "";
  runtime.db = undefined;

  restoreAuthEnvironment?.();

  if (connection) await connection.cleanup();

});

describe("SEC-01B — achados F001 e F003", () => {

  it("F001 reverte papel e auditoria juntos quando o insert de audit_logs falha", async () => {

    const current = requireA();
    fixtureB = await seedTeamRbacFixture(db);
    const tenantBMembersBefore = await db.select({ userId: schema.member.userId, role: schema.member.role })
      .from(schema.member).where(eq(schema.member.organizationId, fixtureB.organizationId));
    const targetMemberId = current.actors.target.memberId;
    const [initialTarget] = await db.select({ role: schema.member.role }).from(schema.member)
      .where(and(eq(schema.member.organizationId, current.organizationId), eq(schema.member.id, targetMemberId)));

    expect(initialTarget?.role).toBe("member");

    runtime.cookie = await signInAndGetCookie(postAuth, current.actors.owner);

    const realDb = runtime.db;

    if (!realDb) throw new Error("Banco isolado não inicializado.");

    const injectedFailure = { triggered: false };

    runtime.db = failOnlyAuditLogInsertInTransaction(realDb, injectedFailure);

    let thrown: unknown;

    try {

      await updateMemberRole(targetMemberId, "admin");

    } catch (error) {

      thrown = error;

    } finally {

      runtime.db = realDb;

    }

    expect(runtime.db).toBe(realDb);
    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toBe("Não foi possível atualizar o papel do membro.");
    expect(injectedFailure.triggered).toBe(true);

    const [target] = await db.select({ role: schema.member.role }).from(schema.member)
      .where(and(eq(schema.member.organizationId, current.organizationId), eq(schema.member.id, targetMemberId)));
    const [owner] = await db.select({ role: schema.member.role }).from(schema.member)
      .where(and(eq(schema.member.organizationId, current.organizationId), eq(schema.member.userId, current.actors.owner.userId)));
    const [ownerPeer] = await db.select({ role: schema.member.role }).from(schema.member)
      .where(and(eq(schema.member.organizationId, current.organizationId), eq(schema.member.userId, current.actors.ownerPeer.userId)));
    const audits = await db.select({ id: schema.auditLogs.id }).from(schema.auditLogs).where(and(
      eq(schema.auditLogs.organizationId, current.organizationId),
      eq(schema.auditLogs.entityType, "member"),
      eq(schema.auditLogs.entityId, targetMemberId),
    ));

    expect(target?.role).toBe("member");
    expect(owner?.role).toBe("owner");
    expect(ownerPeer?.role).toBe("owner");
    expect(audits).toEqual([]);
    expect(await db.select({ userId: schema.member.userId, role: schema.member.role })
      .from(schema.member).where(eq(schema.member.organizationId, fixtureB.organizationId))).toEqual(tenantBMembersBefore);

  });

  it("F001 confirma papel e evento de auditoria no fluxo positivo", async () => {

    const current = requireA();
    const targetMemberId = current.actors.target.memberId;

    runtime.cookie = await signInAndGetCookie(postAuth, current.actors.owner);

    await updateMemberRole(targetMemberId, "admin");

    const [target] = await db.select({ role: schema.member.role }).from(schema.member)
      .where(and(eq(schema.member.organizationId, current.organizationId), eq(schema.member.id, targetMemberId)));

    const audits = await db.select({
      organizationId: schema.auditLogs.organizationId,
      actorUserId: schema.auditLogs.actorUserId,
      action: schema.auditLogs.action,
      entityType: schema.auditLogs.entityType,
      entityId: schema.auditLogs.entityId,
      details: schema.auditLogs.details,
    }).from(schema.auditLogs).where(and(
      eq(schema.auditLogs.organizationId, current.organizationId),
      eq(schema.auditLogs.entityType, "member"),
      eq(schema.auditLogs.entityId, targetMemberId),
    ));

    expect(target?.role).toBe("admin");
    expect(audits).toEqual([{
      organizationId: current.organizationId,
      actorUserId: current.actors.owner.userId,
      action: "update",
      entityType: "member",
      entityId: targetMemberId,
      details: JSON.stringify({ from: "member", to: "admin" }),
    }]);

  });

  it("F003 seleciona automaticamente somente uma membership inequívoca quando a sessão não tem contexto", async () => {

    const current = requireA();

    runtime.cookie = await signInAndGetCookie(postAuth, current.actors.owner);

    const [sessionRow] = await db.select({ id: schema.session.id, activeOrganizationId: schema.session.activeOrganizationId })
      .from(schema.session).where(eq(schema.session.userId, current.actors.owner.userId));

    expect(sessionRow).toBeDefined();
    expect(sessionRow?.activeOrganizationId).toBe(current.organizationId);

    await setActiveOrganization(sessionRow!.id, null);

    const selected = await requireApiWorkspaceRole(["owner"]);

    expect(selected.organization.id).toBe(current.organizationId);

    const [storedSession] = await db.select({ activeOrganizationId: schema.session.activeOrganizationId })
      .from(schema.session).where(eq(schema.session.id, sessionRow!.id));

    expect(storedSession?.activeOrganizationId).toBe(current.organizationId);

  });

  it("F003 exige seleção explícita e nunca migra leituras ou escritas para outra membership", async () => {

    const current = requireA();

    fixtureB = await seedTeamRbacFixture(db);
    fixtureC = await seedTeamRbacFixture(db);

    const membershipInB = `sec01b-extra-${randomUUID()}`;

    await db.insert(schema.member).values({
      id: membershipInB,
      organizationId: fixtureB.organizationId,
      userId: current.actors.owner.userId,
      role: "member",
      createdAt: new Date("2099-01-01T00:00:00.000Z"),
    });

    runtime.cookie = await signInAndGetCookie(postAuth, current.actors.owner);

    const [multiSessionRow] = await db.select({ id: schema.session.id, activeOrganizationId: schema.session.activeOrganizationId })
      .from(schema.session).where(eq(schema.session.userId, current.actors.owner.userId));

    expect(multiSessionRow).toBeDefined();
    expect(multiSessionRow?.activeOrganizationId ?? null).toBeNull();

    await expect(requireApiWorkspaceRole(["owner"])).rejects.toBeInstanceOf(WorkspaceSelectionRequiredError);

    const noContextClientName = `SEC01C no-context ${randomUUID()}`;

    await expect(createClient({ kind: "person", name: noContextClientName, status: "prospect" })).rejects.toThrow();

    const [existingClient] = await db.insert(schema.clients).values({
      organizationId: current.organizationId,
      kind: "company",
      name: `SEC01C existing ${randomUUID()}`,
      ownerUserId: current.actors.owner.userId,
    }).returning({ id: schema.clients.id });
    const beforeNoContext = await workspaceEntityCounts([current.organizationId, fixtureB.organizationId, fixtureC.organizationId]);
    const beforeNoContextAudits = await db.select({ id: schema.auditLogs.id, organizationId: schema.auditLogs.organizationId })
      .from(schema.auditLogs).where(inArray(schema.auditLogs.organizationId, [current.organizationId, fixtureB.organizationId, fixtureC.organizationId]));
      
    await expect(createDeal({ clientId: existingClient.id, title: "SEC01C blocked deal", amount: "10.00" })).rejects.toThrow();
    await expect(createTask({ title: "SEC01C blocked task", priority: "normal", dueAt: new Date(Date.now() + 86_400_000).toISOString() })).rejects.toThrow();

    expect(await workspaceEntityCounts([current.organizationId, fixtureB.organizationId, fixtureC.organizationId])).toEqual(beforeNoContext);
    expect(await db.select({ id: schema.auditLogs.id, organizationId: schema.auditLogs.organizationId })
      .from(schema.auditLogs).where(inArray(schema.auditLogs.organizationId, [current.organizationId, fixtureB.organizationId, fixtureC.organizationId])))
      .toEqual(beforeNoContextAudits);
    expect(await db.select({ id: schema.clients.id }).from(schema.clients).where(and(
      eq(schema.clients.organizationId, current.organizationId), eq(schema.clients.name, noContextClientName),
    ))).toEqual([]);

    const unselectedExport = await exportClients(new Request("http://localhost:3000/api/export/clients.csv"));

    expect(unselectedExport.status).toBe(409);
    expect(unselectedExport.headers.get("content-type")).toContain("application/json");
    expect(await unselectedExport.json()).toMatchObject({ code: "WORKSPACE_SELECTION_REQUIRED", selectionUrl: "/workspace/select" });

    await expectSelectWorkspace(organizationIdForm(fixtureB.organizationId));

    expect(await storedActiveOrganization(current.actors.owner.userId)).toBe(fixtureB.organizationId);

    const activeB = await requireApiWorkspaceRole(["member"]);

    expect(activeB.organization.id).toBe(fixtureB.organizationId);
    expect(activeB.role).toBe("member");

    await expectSelectWorkspace(organizationIdForm(current.organizationId));

    expect((await requireApiWorkspaceRole(["owner"])).organization.id).toBe(current.organizationId);

    const [sessionAfterSwitch] = await db.select({ id: schema.session.id }).from(schema.session)
      .where(eq(schema.session.userId, current.actors.owner.userId));

    if (!sessionAfterSwitch) throw new Error("Sessão sintética não encontrada.");

    // An active ID for C or an unknown ID must never fall back to A or B.
    await expectSelectWorkspace(organizationIdForm(fixtureC.organizationId));

    expect(await storedActiveOrganization(current.actors.owner.userId)).toBe(current.organizationId);

    await setActiveOrganization(sessionAfterSwitch.id, fixtureC.organizationId);
    await expect(requireApiWorkspaceRole(["owner"])).rejects.toMatchObject({ reason: "invalid" });

    const invalidExport = await exportClients(new Request("http://localhost:3000/api/export/clients.csv"));

    expect(invalidExport.status).toBe(409);
    expect(await invalidExport.text()).not.toContain("text/csv");

    const deniedName = `SEC01C invalid-context ${randomUUID()}`;
    const beforeInvalidContext = await workspaceEntityCounts([current.organizationId, fixtureB.organizationId, fixtureC.organizationId]);
    const beforeInvalidAudits = await db.select({ id: schema.auditLogs.id, organizationId: schema.auditLogs.organizationId })
      .from(schema.auditLogs).where(inArray(schema.auditLogs.organizationId, [current.organizationId, fixtureB.organizationId, fixtureC.organizationId]));

    await expect(createClient({ kind: "person", name: deniedName, status: "prospect" })).rejects.toThrow();
    await expect(createDeal({ clientId: existingClient.id, title: "SEC01C invalid deal", amount: "10.00" })).rejects.toThrow();
    await expect(createTask({ title: "SEC01C invalid task", priority: "normal", dueAt: new Date(Date.now() + 86_400_000).toISOString() })).rejects.toThrow();

    expect(await db.select({ id: schema.clients.id }).from(schema.clients).where(and(
      eq(schema.clients.organizationId, current.organizationId), eq(schema.clients.name, deniedName),
    ))).toEqual([]);
    expect(await workspaceEntityCounts([current.organizationId, fixtureB.organizationId, fixtureC.organizationId])).toEqual(beforeInvalidContext);
    expect(await db.select({ id: schema.auditLogs.id, organizationId: schema.auditLogs.organizationId })
      .from(schema.auditLogs).where(inArray(schema.auditLogs.organizationId, [current.organizationId, fixtureB.organizationId, fixtureC.organizationId])))
      .toEqual(beforeInvalidAudits);

    await setActiveOrganization(sessionAfterSwitch.id, `sec01c-nonexistent-${randomUUID()}`);
    await expect(requireApiWorkspaceRole(["owner"])).rejects.toBeInstanceOf(WorkspaceSelectionRequiredError);

    // Removing B leaves a stale explicit ID. It must not run an action in A.
    await expectSelectWorkspace(organizationIdForm(fixtureB.organizationId));
    await db.delete(schema.member).where(and(
      eq(schema.member.organizationId, fixtureB.organizationId),
      eq(schema.member.id, membershipInB),
    ));
    await expect(requireApiWorkspaceRole(["owner"])).rejects.toBeInstanceOf(WorkspaceSelectionRequiredError);
    
    const removedExport = await exportClients(new Request("http://localhost:3000/api/export/clients.csv"));

    expect(removedExport.status).toBe(409);

    await expect(createClient({ kind: "person", name: `SEC01C removed membership ${randomUUID()}`, status: "prospect" })).rejects.toThrow();

    const signOut = await postAuth(new Request("http://localhost:3000/api/auth/sign-out", {
      method: "POST",
      headers: { origin: "http://localhost:3000", cookie: runtime.cookie },
    }));

    expect(signOut.ok).toBe(true);

    await expect(requireApiWorkspaceRole(["owner"])).rejects.toBeInstanceOf(WorkspaceAuthenticationError);

  });
});

function organizationIdForm(organizationId: string) {

  const formData = new FormData();

  formData.set("organizationId", organizationId);

  return formData;

}

async function expectSelectWorkspace(formData: FormData) {

  await expect(selectWorkspace(formData)).rejects.toThrow(/NEXT_REDIRECT/);

}

async function storedActiveOrganization(userId: string) {

  const [sessionRow] = await db.select({ activeOrganizationId: schema.session.activeOrganizationId })
    .from(schema.session).where(eq(schema.session.userId, userId));

  return sessionRow?.activeOrganizationId;

}

async function workspaceEntityCounts(organizationIds: string[]) {

  return Promise.all(organizationIds.map(async (organizationId) => {

    const [[clientCount], [dealCount], [taskCount]] = await Promise.all([
      db.select({ value: count() }).from(schema.clients).where(eq(schema.clients.organizationId, organizationId)),
      db.select({ value: count() }).from(schema.deals).where(eq(schema.deals.organizationId, organizationId)),
      db.select({ value: count() }).from(schema.tasks).where(eq(schema.tasks.organizationId, organizationId)),
    ]);

    return { organizationId, clients: clientCount?.value, deals: dealCount?.value, tasks: taskCount?.value };
  }));

}

async function setActiveOrganization(sessionId: string, organizationId: string | null) {

  await db.update(schema.session).set({ activeOrganizationId: organizationId })
    .where(eq(schema.session.id, sessionId));

}

function requireA(): Fixture {

  if (!fixtureA) throw new Error("Fixture A não inicializada.");

  return fixtureA;

}

type TestDatabase = NodePgDatabase<typeof schema>;
type TestTransaction = Parameters<Parameters<TestDatabase["transaction"]>[0]>[0];

function failOnlyAuditLogInsertInTransaction(
  base: TestDatabase,
  injectedFailure: { triggered: boolean },
): TestDatabase {

  return new Proxy(base, {

    get(target, property) {

      if (property === "transaction") {

        const transaction = Reflect.get(target, property, target) as (
          callback: (tx: TestTransaction) => Promise<unknown>,
          ...args: unknown[]
        ) => Promise<unknown>;

        return (
          callback: (tx: TestTransaction) => Promise<unknown>,
          ...args: unknown[]
        ) => transaction.call(target, (tx) => callback(failOnlyAuditLogInsert(tx, injectedFailure)), ...args);
      }

      const value = Reflect.get(target, property, target);

      return typeof value === "function" ? value.bind(target) : value;

    },
  });
}

function failOnlyAuditLogInsert(tx: TestTransaction, injectedFailure: { triggered: boolean }): TestTransaction {

  return new Proxy(tx, {

    get(target, property) {

      if (property === "insert") {

        return (table: unknown) => {

          if (table === schema.auditLogs) {

            return { values: async () => {

              injectedFailure.triggered = true;

              throw new Error("SEC-01B synthetic audit insert failure");

            } };
          }

          const insert = Reflect.get(target, property, target) as (value: unknown) => unknown;

          return insert.call(target, table);

        };
      }

      const value = Reflect.get(target, property, target);

      return typeof value === "function" ? value.bind(target) : value;

    },
  }) as TestTransaction;

}
