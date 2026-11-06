import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { and, count, eq, isNotNull, sql } from "drizzle-orm";
import * as schema from "@/db/schema";
import { createIsolatedConnectionPair, type IsolatedConnectionPair } from "../helpers/test-db";
import { seedTeamRbacFixture } from "../helpers/team-rbac-fixture";

const runtime = vi.hoisted(() => ({
  db: undefined as NodePgDatabase<typeof schema> | undefined,
  organizationId: "",
  actorId: "",
  role: "owner",
}));

vi.mock("@/db", () => ({
  getDb: () => {
    if (!runtime.db) throw new Error("Banco isolado não inicializado.");
    return runtime.db;
  },
}));

// Apenas contexto/role são mockados; transações, locks, updates e FKs usam PostgreSQL real.
vi.mock("@/lib/workspace", () => ({
  requireWorkspaceRole: async (allowed: string[]) => {

    if (!runtime.actorId || !allowed.includes(runtime.role)) throw new Error("Acesso negado");

    return { organization: { id: runtime.organizationId }, user: { id: runtime.actorId }, role: runtime.role };

  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

type Fixture = Awaited<ReturnType<typeof seedTeamRbacFixture>>;
type TableRows = { clients: typeof schema.clients.$inferSelect[]; deals: typeof schema.deals.$inferSelect[]; tasks: typeof schema.tasks.$inferSelect[] };
type FixtureIds = { source: { clients: string[]; deals: string[]; tasks: string[] }; untouched: { clients: string; deals: string; tasks: string }; tenantB: { clients: string; deals: string; tasks: string } };

let connection: IsolatedConnectionPair;
let db: NodePgDatabase<typeof schema>;
let dbB: NodePgDatabase<typeof schema>;
let fixture: Fixture | undefined;
let organizationB = "";
let userB = "";
let userWithoutMembership = "";
let ids: FixtureIds;
let historicalAuditId = "";
let transferMemberAssignments: typeof import("@/modules/team/actions").transferMemberAssignments;
let reassignTaskAssignee: typeof import("@/modules/tasks/actions").reassignTaskAssignee;

beforeAll(async () => {

  if (process.env.DATABASE_URL) throw new Error("DATABASE_URL proibida nesta suíte.");

  connection = await createIsolatedConnectionPair();
  db = drizzle(connection.poolA, { schema });
  dbB = drizzle(connection.poolB, { schema });

  runtime.db = db;

  ({ transferMemberAssignments } = await import("@/modules/team/actions"));
  ({ reassignTaskAssignee } = await import("@/modules/tasks/actions"));
});

beforeEach(async () => {

  fixture = await seedTeamRbacFixture(db);
  organizationB = `assignment-transfer-org-${randomUUID()}`;
  userB = `assignment-transfer-user-${randomUUID()}`;
  userWithoutMembership = `assignment-transfer-unmember-${randomUUID()}`;
  historicalAuditId = `historical-${randomUUID()}`;

  ids = await db.transaction(async (tx) => {

    const ownerId = fixture!.actors.owner.userId;
    const sourceId = fixture!.actors.member.userId;
    const destinationId = fixture!.actors.target.userId;

    await tx.insert(schema.organization).values({ id: organizationB, name: "Assignment transfer B", slug: `assignment-transfer-${randomUUID()}` });
    await tx.insert(schema.user).values([
      { id: userB, name: "Other tenant user", email: `${randomUUID()}@example.test` },
      { id: userWithoutMembership, name: "No membership user", email: `${randomUUID()}@example.test` },
    ]);
    await tx.insert(schema.member).values({ id: `transfer-member-${randomUUID()}`, organizationId: organizationB, userId: userB, role: "owner" });

    const [activeClient] = await tx.insert(schema.clients).values({ organizationId: fixture!.organizationId, kind: "company", name: "Active assigned client", ownerUserId: sourceId }).returning({ id: schema.clients.id });
    const [archivedClient] = await tx.insert(schema.clients).values({ organizationId: fixture!.organizationId, kind: "person", name: "Archived assigned client", ownerUserId: sourceId, deletedAt: new Date("2026-02-01T12:00:00Z") }).returning({ id: schema.clients.id });
    const [untouchedClient] = await tx.insert(schema.clients).values({ organizationId: fixture!.organizationId, kind: "company", name: "Untouched client", ownerUserId: destinationId }).returning({ id: schema.clients.id });
    const [externalClient] = await tx.insert(schema.clients).values({ organizationId: organizationB, kind: "company", name: "Tenant B client", ownerUserId: userB }).returning({ id: schema.clients.id });

    const [activeDeal] = await tx.insert(schema.deals).values({ organizationId: fixture!.organizationId, clientId: activeClient.id, title: "Active assigned deal", amount: "425.50", ownerUserId: sourceId }).returning({ id: schema.deals.id });
    const [archivedDeal] = await tx.insert(schema.deals).values({ organizationId: fixture!.organizationId, clientId: archivedClient.id, title: "Archived assigned deal", amount: "875.25", ownerUserId: sourceId, deletedAt: new Date("2026-02-02T12:00:00Z") }).returning({ id: schema.deals.id });
    const [untouchedDeal] = await tx.insert(schema.deals).values({ organizationId: fixture!.organizationId, clientId: untouchedClient.id, title: "Untouched deal", amount: "80.00", ownerUserId: destinationId }).returning({ id: schema.deals.id });
    const [externalDeal] = await tx.insert(schema.deals).values({ organizationId: organizationB, clientId: externalClient.id, title: "Tenant B deal", amount: "99.00", ownerUserId: userB }).returning({ id: schema.deals.id });

    const [activeTask] = await tx.insert(schema.tasks).values({ organizationId: fixture!.organizationId, title: "Active assigned task", description: "Keep description", priority: "high", status: "in_progress", dueAt: new Date("2027-03-04T10:00:00Z"), assigneeUserId: sourceId, clientId: activeClient.id, dealId: activeDeal.id }).returning({ id: schema.tasks.id });
    const [archivedTask] = await tx.insert(schema.tasks).values({ organizationId: fixture!.organizationId, title: "Archived assigned task", description: "Archived description", priority: "low", status: "done", dueAt: new Date("2027-03-05T10:00:00Z"), assigneeUserId: sourceId, clientId: archivedClient.id, dealId: archivedDeal.id, deletedAt: new Date("2026-02-03T12:00:00Z") }).returning({ id: schema.tasks.id });
    const [untouchedTask] = await tx.insert(schema.tasks).values({ organizationId: fixture!.organizationId, title: "Untouched task", dueAt: new Date("2027-03-06T10:00:00Z"), assigneeUserId: destinationId, clientId: untouchedClient.id, dealId: untouchedDeal.id }).returning({ id: schema.tasks.id });
    const [externalTask] = await tx.insert(schema.tasks).values({ organizationId: organizationB, title: "Tenant B task", dueAt: new Date("2027-03-07T10:00:00Z"), assigneeUserId: userB, clientId: externalClient.id, dealId: externalDeal.id }).returning({ id: schema.tasks.id });

    await tx.insert(schema.auditLogs).values({ organizationId: fixture!.organizationId, actorUserId: ownerId, action: "historical", entityType: "member", entityId: historicalAuditId, details: "historical entry to preserve" });

    return {
      source: { clients: [activeClient.id, archivedClient.id], deals: [activeDeal.id, archivedDeal.id], tasks: [activeTask.id, archivedTask.id] },
      untouched: { clients: untouchedClient.id, deals: untouchedDeal.id, tasks: untouchedTask.id },
      tenantB: { clients: externalClient.id, deals: externalDeal.id, tasks: externalTask.id },
    };

  });

  runtime.organizationId = fixture.organizationId;
  runtime.actorId = fixture.actors.owner.userId;
  runtime.role = "owner";

});

afterEach(async () => {

  const errors: unknown[] = [];
  const fixtureToClean = fixture;

  try {

    if (organizationB) {

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
        await tx.delete(schema.user).where(eq(schema.user.id, userWithoutMembership));

      });

      const orgResidue = await db.select({ id: schema.organization.id }).from(schema.organization).where(eq(schema.organization.id, organizationB));
      const userResidue = await Promise.all([userB, userWithoutMembership].map((id) => db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.id, id))));

      if (orgResidue.length || userResidue.some((rows) => rows.length)) throw new Error("Resíduos do tenant B após cleanup.");

    }
  } catch (error) {

    errors.push(error);

  }

  try {

    await fixtureToClean?.cleanup();

  } catch (error) {

    errors.push(error);

  }
  if (fixtureToClean) {

    try {

      const orgId = fixtureToClean.organizationId;
      const orgResidue = await db.select({ id: schema.organization.id }).from(schema.organization).where(eq(schema.organization.id, orgId));
      const userIds = Object.values(fixtureToClean.actors).map((actor) => actor.userId);
      const userResidue = await Promise.all(userIds.map((id) => db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.id, id))));
      const clientsResidue = await db.select({ id: schema.clients.id }).from(schema.clients).where(eq(schema.clients.organizationId, orgId));
      const dealsResidue = await db.select({ id: schema.deals.id }).from(schema.deals).where(eq(schema.deals.organizationId, orgId));
      const tasksResidue = await db.select({ id: schema.tasks.id }).from(schema.tasks).where(eq(schema.tasks.organizationId, orgId));
      const auditResidue = await db.select({ id: schema.auditLogs.id }).from(schema.auditLogs).where(eq(schema.auditLogs.organizationId, orgId));
      const memberResidue = await db.select({ id: schema.member.id }).from(schema.member).where(eq(schema.member.organizationId, orgId));

      if (orgResidue.length || userResidue.some((rows) => rows.length) || clientsResidue.length || dealsResidue.length || tasksResidue.length || auditResidue.length || memberResidue.length) {

        throw new Error(`Resíduos da fixture ${orgId} após cleanup.`);

      }
    } catch (error) {

      errors.push(error);

    }
  }

  fixture = undefined;

  runtime.organizationId = "";
  runtime.actorId = "";
  runtime.role = "owner";
  runtime.db = db;

  if (errors.length) throw new AggregateError(errors, "Falha no cleanup da fixture member-assignment-transfer.");

});

afterAll(async () => {

  runtime.db = undefined;

  if (connection) await connection.cleanup();

});

function requireFixture(): Fixture {

  if (!fixture) throw new Error("Fixture não inicializada.");

  return fixture;

}

async function snapshotA(): Promise<TableRows> {

  const organizationId = requireFixture().organizationId;

  return {
    clients: await db.select().from(schema.clients).where(eq(schema.clients.organizationId, organizationId)),
    deals: await db.select().from(schema.deals).where(eq(schema.deals.organizationId, organizationId)),
    tasks: await db.select().from(schema.tasks).where(eq(schema.tasks.organizationId, organizationId)),
  };

}

async function snapshotB(): Promise<TableRows> {

  return {
    clients: await db.select().from(schema.clients).where(eq(schema.clients.organizationId, organizationB)),
    deals: await db.select().from(schema.deals).where(eq(schema.deals.organizationId, organizationB)),
    tasks: await db.select().from(schema.tasks).where(eq(schema.tasks.organizationId, organizationB)),
  };

}

async function transfer(fromUserId = requireFixture().actors.member.userId, toUserId: string | null = requireFixture().actors.target.userId) {

  return transferMemberAssignments({ fromUserId, toUserId });

}

function omitAssignmentAndUpdatedAt(row: Record<string, unknown>, assignmentField: string) {

  const copy = { ...row };

  delete copy[assignmentField];
  delete copy.updatedAt;

  return copy;

}

async function sourceReferences() {

  const { organizationId, actors: testActors } = requireFixture();
  const [clients] = await db.select({ value: count() }).from(schema.clients).where(and(eq(schema.clients.organizationId, organizationId), eq(schema.clients.ownerUserId, testActors.member.userId)));
  const [deals] = await db.select({ value: count() }).from(schema.deals).where(and(eq(schema.deals.organizationId, organizationId), eq(schema.deals.ownerUserId, testActors.member.userId)));
  const [tasks] = await db.select({ value: count() }).from(schema.tasks).where(and(eq(schema.tasks.organizationId, organizationId), eq(schema.tasks.assigneeUserId, testActors.member.userId)));
  return { clients: clients.value, deals: deals.value, tasks: tasks.value };

}

async function archivedSourceReferences() {

  const { organizationId, actors: testActors } = requireFixture();
  const [clients] = await db.select({ value: count() }).from(schema.clients).where(and(eq(schema.clients.organizationId, organizationId), eq(schema.clients.ownerUserId, testActors.member.userId), isNotNull(schema.clients.deletedAt)));
  const [deals] = await db.select({ value: count() }).from(schema.deals).where(and(eq(schema.deals.organizationId, organizationId), eq(schema.deals.ownerUserId, testActors.member.userId), isNotNull(schema.deals.deletedAt)));
  const [tasks] = await db.select({ value: count() }).from(schema.tasks).where(and(eq(schema.tasks.organizationId, organizationId), eq(schema.tasks.assigneeUserId, testActors.member.userId), isNotNull(schema.tasks.deletedAt)));

  return { clients: clients.value, deals: deals.value, tasks: tasks.value, total: clients.value + deals.value + tasks.value };

}

async function auditRows() {

  return db.select().from(schema.auditLogs).where(eq(schema.auditLogs.organizationId, requireFixture().organizationId));

}

function withAuditInsertFailure(base: NodePgDatabase<typeof schema>): NodePgDatabase<typeof schema> {

  return new Proxy(base, {

    get(target, property, receiver) {

      if (property !== "transaction") return Reflect.get(target, property, receiver);

      return (callback: (tx: object) => Promise<unknown>) => target.transaction((tx) => callback(new Proxy(tx, {

        get(txTarget, txProperty, txReceiver) {

          if (txProperty === "insert") {

            return (table: unknown) => {

              if (table === schema.auditLogs) {

                const insert = Reflect.get(txTarget, txProperty, txTarget) as (target: unknown) => object;
                const builder = insert.call(txTarget, table);

                return new Proxy(builder, {

                  get(builderTarget, builderProperty, builderReceiver) {

                    if (builderProperty === "values") {

                      return (values: unknown) => {

                        const valuesMethod = Reflect.get(builderTarget, builderProperty, builderTarget) as (rows: unknown) => unknown;
                        const invalidRows = Array.isArray(values)
                          ? values.map((row) => ({ ...(row as Record<string, unknown>), action: null }))
                          : { ...(values as Record<string, unknown>), action: null };

                        return valuesMethod.call(builderTarget, invalidRows);

                      };
                    }

                    const value = Reflect.get(builderTarget, builderProperty, builderReceiver);

                    return typeof value === "function" ? value.bind(builderTarget) : value;

                  },
                });
              }

              const insert = Reflect.get(txTarget, txProperty, txTarget) as (target: unknown) => unknown;

              return insert.call(txTarget, table);

            };
          }

          const value = Reflect.get(txTarget, txProperty, txReceiver);

          return typeof value === "function" ? value.bind(txTarget) : value;

        },
      })));
    },
  }) as NodePgDatabase<typeof schema>;
}

function findNotNullViolation(error: unknown): { code: string; table: string | undefined; column: string | undefined } | undefined {

  const seen = new Set<object>();

  let current: unknown = error;

  while (current && typeof current === "object" && !seen.has(current)) {

    seen.add(current);

    const candidate = current as { code?: unknown; table?: unknown; column?: unknown; cause?: unknown };

    if (candidate.code === "23502") {

      return { code: "23502", table: typeof candidate.table === "string" ? candidate.table : undefined, column: typeof candidate.column === "string" ? candidate.column : undefined };

    }

    current = candidate.cause;

  }

  return undefined;

}

type LockWaitSession = {
  pid: number;
  state: string;
  wait_event_type: string | null;
  wait_event: string | null;
  blocking_pids: number[];
  query: string;
};

function captureTransactionBackendPid(
  base: NodePgDatabase<typeof schema>,
  onPid: (pid: number) => void,
): NodePgDatabase<typeof schema> {

  return new Proxy(base, {

    get(target, property, receiver) {

      if (property !== "transaction") {

        const value = Reflect.get(target, property, receiver);

        return typeof value === "function" ? value.bind(target) : value;

      }

      return (callback: (transaction: unknown) => Promise<unknown>) => target.transaction(async (tx) => {

        const result = await tx.execute(sql`SELECT pg_backend_pid() AS pid`);
        const row = result.rows[0] as { pid: number | string } | undefined;

        if (!row) throw new Error("Não foi possível obter o PID da transação de transferência.");

        onPid(Number(row.pid));

        return callback(tx);

      });
    },
  }) as NodePgDatabase<typeof schema>;
}

async function waitForBlockedSession(
  monitor: IsolatedConnectionPair["clientA"],
  getOperationPid: () => number | undefined,
  blockerPid: number,
  operation: string,
  timeoutMs = 4000,
): Promise<LockWaitSession> {

  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {

    // Monitor dedicado, fora da transação que segura o lock. Cada consulta usa
    // autocommit e limpa qualquer snapshot estatístico antes de observar atividade.
    await monitor.query("SELECT pg_stat_clear_snapshot()");

    const operationPid = getOperationPid();

    if (operationPid !== undefined) {
      const result = await monitor.query<LockWaitSession>(
      `SELECT pid, state, wait_event_type, wait_event, pg_blocking_pids(pid) AS blocking_pids, query
       FROM pg_stat_activity
       WHERE datname = 'crm_test_isolated'
         AND usename = 'crm_test_admin'
         AND wait_event_type = 'Lock'
         AND pid <> pg_backend_pid()
         AND pid = $1
         AND $2 = ANY(pg_blocking_pids(pid))
       LIMIT 1`,
        [operationPid, blockerPid],
      );

      if (result.rows[0]) return result.rows[0];

    }

    await new Promise((resolve) => setTimeout(resolve, 20));

  }

  await monitor.query("SELECT pg_stat_clear_snapshot()");

  const operationPid = getOperationPid();
  const diagnostic = await monitor.query<LockWaitSession & { datname: string; usename: string }>(
    `SELECT pid, datname, usename, state, wait_event_type, wait_event,
            pg_blocking_pids(pid) AS blocking_pids, query
     FROM pg_stat_activity
     WHERE datname = 'crm_test_isolated'
       AND usename = 'crm_test_admin'
       AND (pid = ANY($1::int[]) OR wait_event_type = 'Lock')
     ORDER BY pid LIMIT 12`,
    [[blockerPid, ...(operationPid === undefined ? [] : [operationPid])]],
  );

  console.error("Timeout aguardando lock PostgreSQL no teste de transferência.", JSON.stringify({
    operation,
    blockerPid,
    operationPid: operationPid ?? null,
    monitorPid: (await monitor.query<{ pid: number }>("SELECT pg_backend_pid() AS pid")).rows[0]?.pid,
    sessions: diagnostic.rows,
  }));

  throw new Error(`Timeout aguardando o PID da operação ${operation} bloqueado pelo PID controlador.`);

}

describe("transferMemberAssignments (workspace mockado; PostgreSQL real)", () => {

  it("transfere dados ativos e arquivados atomicamente, preserva campos e isola tenant B", async () => {

    const { actors: testActors, organizationId } = requireFixture();
    const beforeA = await snapshotA();
    const beforeB = await snapshotB();
    const historyBefore = (await auditRows()).find((row) => row.id === historicalAuditId);

    const result = await transfer();

    expect(result).toEqual({
      ok: true,
      counts: { clients: 2, deals: 2, tasks: 2, total: 6 },
      archivedReferencesPending: { clients: 0, deals: 0, tasks: 0, total: 0 },
    });

    const afterA = await snapshotA();
    const afterB = await snapshotB();

    for (const id of ids.source.clients) {

      const before = beforeA.clients.find((row) => row.id === id)!;
      const after = afterA.clients.find((row) => row.id === id)!;

      expect(after.ownerUserId).toBe(testActors.target.userId);
      expect(omitAssignmentAndUpdatedAt(after, "ownerUserId")).toEqual(omitAssignmentAndUpdatedAt(before, "ownerUserId"));

    }

    for (const id of ids.source.deals) {

      const before = beforeA.deals.find((row) => row.id === id)!;
      const after = afterA.deals.find((row) => row.id === id)!;

      expect(after.ownerUserId).toBe(testActors.target.userId);
      expect(omitAssignmentAndUpdatedAt(after, "ownerUserId")).toEqual(omitAssignmentAndUpdatedAt(before, "ownerUserId"));

    }

    for (const id of ids.source.tasks) {

      const before = beforeA.tasks.find((row) => row.id === id)!;
      const after = afterA.tasks.find((row) => row.id === id)!;

      expect(after.assigneeUserId).toBe(testActors.target.userId);
      expect(omitAssignmentAndUpdatedAt(after, "assigneeUserId")).toEqual(omitAssignmentAndUpdatedAt(before, "assigneeUserId"));

    }

    expect(afterA.clients.find((row) => row.id === ids.untouched.clients)).toEqual(beforeA.clients.find((row) => row.id === ids.untouched.clients));
    expect(afterA.deals.find((row) => row.id === ids.untouched.deals)).toEqual(beforeA.deals.find((row) => row.id === ids.untouched.deals));
    expect(afterA.tasks.find((row) => row.id === ids.untouched.tasks)).toEqual(beforeA.tasks.find((row) => row.id === ids.untouched.tasks));
    expect(afterB).toEqual(beforeB);
    expect(await sourceReferences()).toEqual({ clients: 0, deals: 0, tasks: 0 });
    expect(await archivedSourceReferences()).toEqual(result.ok ? result.archivedReferencesPending : undefined);
    expect(result).toMatchObject({ archivedReferencesPending: { clients: 0, deals: 0, tasks: 0, total: 0 } });

    const transferredIds = [...ids.source.clients, ...ids.source.deals, ...ids.source.tasks];
    const expectedEntityType = new Map<string, string>([
      ...ids.source.clients.map((id) => [id, "client"] as const),
      ...ids.source.deals.map((id) => [id, "deal"] as const),
      ...ids.source.tasks.map((id) => [id, "task"] as const),
    ]);

    const rows = (await auditRows()).filter((row) => transferredIds.includes(row.entityId));

    expect(rows).toHaveLength(6);

    for (const row of rows) {

      expect(row).toMatchObject({ organizationId, actorUserId: testActors.owner.userId, action: "reassign", entityType: expectedEntityType.get(row.entityId), details: JSON.stringify({ fromUserId: testActors.member.userId, toUserId: testActors.target.userId }) });

    }

    expect((await auditRows()).find((row) => row.id === historicalAuditId)).toEqual(historyBefore);

  });

  it("desatribui as três entidades e audita cada alteração", async () => {

    const { actors: testActors, organizationId } = requireFixture();
    const beforeA = await snapshotA();
    const result = await transfer(testActors.member.userId, null);

    expect(result).toEqual({ ok: true, counts: { clients: 2, deals: 2, tasks: 2, total: 6 }, archivedReferencesPending: { clients: 0, deals: 0, tasks: 0, total: 0 } });

    const afterA = await snapshotA();

    for (const id of ids.source.clients) expect(afterA.clients.find((row) => row.id === id)?.ownerUserId).toBeNull();
    for (const id of ids.source.deals) expect(afterA.deals.find((row) => row.id === id)?.ownerUserId).toBeNull();
    for (const id of ids.source.tasks) expect(afterA.tasks.find((row) => row.id === id)?.assigneeUserId).toBeNull();
    for (const table of ["clients", "deals", "tasks"] as const) {

      const field = table === "tasks" ? "assigneeUserId" : "ownerUserId";

      for (const id of ids.source[table]) {

        const before = beforeA[table].find((row) => row.id === id)! as unknown as Record<string, unknown>;
        const after = afterA[table].find((row) => row.id === id)! as unknown as Record<string, unknown>;

        expect(omitAssignmentAndUpdatedAt(after, field)).toEqual(omitAssignmentAndUpdatedAt(before, field));

      }
    }

    const transferRows = (await auditRows()).filter((row) => [...ids.source.clients, ...ids.source.deals, ...ids.source.tasks].includes(row.entityId));

    expect(transferRows).toHaveLength(6);

    const expectedEntityType = new Map<string, string>([
      ...ids.source.clients.map((id) => [id, "client"] as const),
      ...ids.source.deals.map((id) => [id, "deal"] as const),
      ...ids.source.tasks.map((id) => [id, "task"] as const),
    ]);

    expect(transferRows.every((row) => row.action === "unassign" && row.organizationId === organizationId && row.actorUserId === testActors.owner.userId && row.entityType === expectedEntityType.get(row.entityId) && row.details === JSON.stringify({ fromUserId: testActors.member.userId, toUserId: null }))).toBe(true);
    expect(await sourceReferences()).toEqual({ clients: 0, deals: 0, tasks: 0 });
    expect(await archivedSourceReferences()).toEqual({ clients: 0, deals: 0, tasks: 0, total: 0 });
    
  });

  it.each(["admin", "member"] as const)("rejeita %s sem modificar registros ou auditorias", async (role) => {

    runtime.role = role;

    const beforeA = await snapshotA();
    const beforeB = await snapshotB();
    const beforeAudit = await auditRows();

    await expect(transfer()).rejects.toThrow("Acesso negado");

    expect(await snapshotA()).toEqual(beforeA);
    expect(await snapshotB()).toEqual(beforeB);
    expect(await auditRows()).toEqual(beforeAudit);

  });

  it("rejeita contexto sem sessão sem modificar registros ou auditorias", async () => {

    runtime.actorId = "";

    const beforeA = await snapshotA();
    const beforeAudit = await auditRows();

    await expect(transfer()).rejects.toThrow("Acesso negado");

    expect(await snapshotA()).toEqual(beforeA);
    expect(await auditRows()).toEqual(beforeAudit);

  });

  it("rejeita origem/destino inválidos, externos, sem membership ou iguais", async () => {

    const beforeA = await snapshotA();
    const beforeB = await snapshotB();
    const beforeAudit = await auditRows();
    const source = requireFixture().actors.member.userId;
    const destination = requireFixture().actors.target.userId;
    const cases: Array<{ fromUserId: string; toUserId: string | null }> = [
      { fromUserId: "", toUserId: destination },
      { fromUserId: source, toUserId: "" },
      { fromUserId: `missing-${randomUUID()}`, toUserId: destination },
      { fromUserId: userWithoutMembership, toUserId: destination },
      { fromUserId: userB, toUserId: destination },
      { fromUserId: source, toUserId: userB },
      { fromUserId: source, toUserId: userWithoutMembership },
      { fromUserId: source, toUserId: `missing-${randomUUID()}` },
      { fromUserId: source, toUserId: source },
    ];

    for (const input of cases) expect(await transferMemberAssignments(input)).toMatchObject({ ok: false });

    expect(await snapshotA()).toEqual(beforeA);
    expect(await snapshotB()).toEqual(beforeB);
    expect(await auditRows()).toEqual(beforeAudit);

  });

  it("não cria auditoria fictícia quando a origem não tem atribuições", async () => {

    const beforeA = await snapshotA();
    const beforeAudit = await auditRows();
    const result = await transfer(requireFixture().actors.owner.userId, requireFixture().actors.target.userId);

    expect(result).toMatchObject({ ok: true, counts: { clients: 0, deals: 0, tasks: 0, total: 0 } });
    expect(await snapshotA()).toEqual(beforeA);
    expect(await auditRows()).toEqual(beforeAudit);

  });

  it("falha PostgreSQL no INSERT de auditoria reverte clientes, oportunidades e tarefas", async () => {

    const beforeA = await snapshotA();
    const beforeAudit = await auditRows();
    const realDb = runtime.db!;

    runtime.db = withAuditInsertFailure(db);

    let failure: unknown;

    try {

      await transfer();

    } catch (error) {

      failure = error;

    } finally {

      runtime.db = realDb;

    }

    expect(findNotNullViolation(failure)).toMatchObject({ code: "23502", table: "audit_logs", column: "action" });
    expect(await snapshotA()).toEqual(beforeA);
    expect(await auditRows()).toEqual(beforeAudit);
    expect(await sourceReferences()).toEqual({ clients: 2, deals: 2, tasks: 2 });

  });

  it("serializa transferências concorrentes da mesma origem com contagens e auditoria consistentes", async () => {

    const { actors: testActors } = requireFixture();
    const [first, second] = await Promise.all([
      transfer(testActors.member.userId, testActors.target.userId),
      transfer(testActors.member.userId, testActors.ownerPeer.userId),
    ]);

    expect(first).toMatchObject({ ok: true });
    expect(second).toMatchObject({ ok: true });

    const firstTotal = first.ok ? first.counts.total : -1;
    const secondTotal = second.ok ? second.counts.total : -1;

    expect([firstTotal, secondTotal].sort((a, b) => a - b)).toEqual([0, 6]);

    const destination = firstTotal === 6 ? testActors.target.userId : testActors.ownerPeer.userId;

    expect(await sourceReferences()).toEqual({ clients: 0, deals: 0, tasks: 0 });

    const state = await snapshotA();

    for (const id of ids.source.clients) expect(state.clients.find((row) => row.id === id)?.ownerUserId).toBe(destination);

    for (const id of ids.source.deals) expect(state.deals.find((row) => row.id === id)?.ownerUserId).toBe(destination);

    for (const id of ids.source.tasks) expect(state.tasks.find((row) => row.id === id)?.assigneeUserId).toBe(destination);

    const expectedIds = [...ids.source.clients, ...ids.source.deals, ...ids.source.tasks];
    const transferRows = (await auditRows()).filter((row) => expectedIds.includes(row.entityId));

    expect(transferRows).toHaveLength(6);
    expect(transferRows.every((row) => row.details === JSON.stringify({ fromUserId: testActors.member.userId, toUserId: destination }))).toBe(true);

  });

  it("transfere com lock conflitante e serializa reatribuição individual posterior", async () => {

    const { actors: testActors } = requireFixture();
    const beforeTask = (await db.select().from(schema.tasks).where(eq(schema.tasks.id, ids.source.tasks[0])))[0];

    let batchPromise: ReturnType<typeof transfer> | undefined;
    let individualPromise: ReturnType<typeof reassignTaskAssignee> | undefined;
    let lockTransactionOpen = false;
    let transferPid: number | undefined;

    await connection.clientB.query("BEGIN");

    lockTransactionOpen = true;

    try {

      await connection.clientB.query('SELECT id FROM "tasks" WHERE id = $1 FOR UPDATE', [ids.source.tasks[0]]);

      const blocker = await connection.clientB.query<{ pid: number }>("SELECT pg_backend_pid() AS pid");
      const blockerPid = blocker.rows[0]!.pid;
      const monitorPid = (await connection.clientA.query<{ pid: number }>("SELECT pg_backend_pid() AS pid")).rows[0]!.pid;

      expect(monitorPid).not.toBe(blockerPid);

      runtime.db = captureTransactionBackendPid(db, (pid) => { transferPid = pid; });

      batchPromise = transfer(testActors.member.userId, testActors.target.userId);

      const batchWaiter = await waitForBlockedSession(connection.clientA, () => transferPid, blockerPid, "transferMemberAssignments");

      expect(batchWaiter.pid).toBe(transferPid);
      expect(batchWaiter.pid).not.toBe(monitorPid);
      expect(batchWaiter.wait_event_type).toBe("Lock");
      expect(batchWaiter.blocking_pids).toContain(blockerPid);

      await connection.clientB.query("COMMIT");

      lockTransactionOpen = false;

      const controllerState = await connection.clientA.query<{ xact_start: Date | null }>(
        "SELECT xact_start FROM pg_stat_activity WHERE pid = $1",
        [blockerPid],
      );

      expect(controllerState.rows[0]?.xact_start).toBeNull();

      const batchResult = await batchPromise;

      expect(batchResult).toMatchObject({ ok: true, counts: { clients: 2, deals: 2, tasks: 2, total: 6 } });

      // A ação individual é deliberadamente posterior ao commit do lote. O
      // cenário comprova o lock real do lote e então valida que a ação seguinte
      // opera sobre o estado confirmado, sem presumir uma segunda espera por lock.
      runtime.db = dbB;

      individualPromise = reassignTaskAssignee({ taskId: ids.source.tasks[0], newUserId: testActors.member.userId });

      const individualResult = await individualPromise;

      expect(individualResult).toMatchObject({ ok: true });

      const task = (await db.select().from(schema.tasks).where(eq(schema.tasks.id, ids.source.tasks[0])))[0];

      expect(task?.assigneeUserId).toBe(testActors.member.userId);
      expect(task).toMatchObject({ clientId: beforeTask?.clientId, dealId: beforeTask?.dealId, title: beforeTask?.title, status: beforeTask?.status, dueAt: beforeTask?.dueAt });

      const taskAudit = (await auditRows()).filter((row) => row.entityType === "task" && row.entityId === ids.source.tasks[0]);

      expect(taskAudit).toHaveLength(2);
      expect(taskAudit.map((row) => JSON.parse(row.details ?? "{}"))).toContainEqual({ fromUserId: testActors.member.userId, toUserId: testActors.target.userId });
      expect(taskAudit.map((row) => JSON.parse(row.details ?? "{}"))).toContainEqual({ fromUserId: testActors.target.userId, toUserId: testActors.member.userId });
      expect(await sourceReferences()).toEqual({ clients: 0, deals: 0, tasks: 1 });

    } finally {

      const cleanupErrors: unknown[] = [];

      if (lockTransactionOpen) {

        try {

          await connection.clientB.query("ROLLBACK");

          lockTransactionOpen = false;

        } catch (error) {

          cleanupErrors.push(error);

        }
      }

      const pending = await Promise.allSettled([batchPromise, individualPromise].filter((promise): promise is NonNullable<typeof promise> => promise !== undefined));

      cleanupErrors.push(...pending.filter((result) => result.status === "rejected").map((result) => result.reason));
      runtime.db = db;

      if (cleanupErrors.length) throw new AggregateError(cleanupErrors, "Falha ao liberar o lock ou aguardar as operações concorrentes.");

    }
  }, 15000);
});
