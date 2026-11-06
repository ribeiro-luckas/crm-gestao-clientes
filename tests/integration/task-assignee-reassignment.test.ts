import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { and, eq, sql } from "drizzle-orm";
import * as schema from "@/db/schema";
import { createIsolatedConnectionPair, type IsolatedConnectionPair } from "../helpers/test-db";
import { seedTeamRbacFixture } from "../helpers/team-rbac-fixture";

const runtime = vi.hoisted(() => ({
  db: undefined as NodePgDatabase<typeof schema> | undefined,
  role: "owner",
  organizationId: "",
  actorId: "",
}));

vi.mock("@/db", () => ({
  getDb: () => {
    if (!runtime.db) throw new Error("Banco isolado não inicializado.");
    return runtime.db;
  },
}));

// Mocka somente autorização/contexto. Drizzle, transações, locks e constraints
// são reais; este arquivo não valida o fluxo de autenticação Better Auth.
vi.mock("@/lib/workspace", () => ({

  requireWorkspaceRole: async (allowed: string[]) => {
    
    if (!runtime.actorId || !allowed.includes(runtime.role)) throw new Error("Acesso negado");

    return {
      organization: { id: runtime.organizationId },
      user: { id: runtime.actorId },
      role: runtime.role,
    };

  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

type Fixture = Awaited<ReturnType<typeof seedTeamRbacFixture>>;
type TaskRow = typeof schema.tasks.$inferSelect;

let connection: IsolatedConnectionPair;
let db: NodePgDatabase<typeof schema>;
let fixture: Fixture | undefined;
let organizationB = "";
let userB = "";
let userWithoutMembership = "";
let clientA = "";
let dealA = "";
let taskA = "";
let taskB = "";
let reassignTaskAssignee: typeof import("@/modules/tasks/actions").reassignTaskAssignee;

beforeAll(async () => {

  if (process.env.DATABASE_URL) throw new Error("DATABASE_URL proibida nesta suíte.");

  connection = await createIsolatedConnectionPair();
  db = drizzle(connection.poolA, { schema });
  runtime.db = db;

  ({ reassignTaskAssignee } = await import("@/modules/tasks/actions"));
});

beforeEach(async () => {

  fixture = await seedTeamRbacFixture(db);
  organizationB = `task-reassign-org-${randomUUID()}`;
  userB = `task-reassign-user-${randomUUID()}`;
  userWithoutMembership = `task-reassign-unmember-${randomUUID()}`;

  await db.transaction(async (tx) => {

    await tx.insert(schema.organization).values({ id: organizationB, name: "Task reassignment B", slug: `task-reassign-${randomUUID()}` });
    await tx.insert(schema.user).values([
      { id: userB, name: "Tenant B user", email: `${randomUUID()}@example.test` },
      { id: userWithoutMembership, name: "User without membership", email: `${randomUUID()}@example.test` },
    ]);
    await tx.insert(schema.member).values({ id: `task-member-${randomUUID()}`, organizationId: organizationB, userId: userB, role: "owner" });

    const [aClient] = await tx.insert(schema.clients).values({
      organizationId: fixture!.organizationId,
      kind: "company",
      name: "Task reassignment A client",
      ownerUserId: fixture!.actors.owner.userId,
    }).returning({ id: schema.clients.id });
    const [aDeal] = await tx.insert(schema.deals).values({
      organizationId: fixture!.organizationId,
      clientId: aClient.id,
      title: "Task reassignment A deal",
      amount: "275.50",
      ownerUserId: fixture!.actors.owner.userId,
    }).returning({ id: schema.deals.id });
    const [bClient] = await tx.insert(schema.clients).values({
      organizationId: organizationB,
      kind: "company",
      name: "Task reassignment B client",
      ownerUserId: userB,
    }).returning({ id: schema.clients.id });
    const [bDeal] = await tx.insert(schema.deals).values({
      organizationId: organizationB,
      clientId: bClient.id,
      title: "Task reassignment B deal",
      amount: "990.00",
      ownerUserId: userB,
    }).returning({ id: schema.deals.id });
    const [aTask] = await tx.insert(schema.tasks).values({
      organizationId: fixture!.organizationId,
      title: "Task A",
      description: "Preserve this description",
      priority: "high",
      status: "todo",
      dueAt: new Date("2027-04-05T10:30:00Z"),
      assigneeUserId: fixture!.actors.owner.userId,
      clientId: aClient.id,
      dealId: aDeal.id,
    }).returning({ id: schema.tasks.id });
    const [bTask] = await tx.insert(schema.tasks).values({
      organizationId: organizationB,
      title: "Task B private",
      dueAt: new Date("2027-05-06T11:30:00Z"),
      assigneeUserId: userB,
      clientId: bClient.id,
      dealId: bDeal.id,
    }).returning({ id: schema.tasks.id });

    clientA = aClient.id;
    dealA = aDeal.id;
    taskA = aTask.id;
    taskB = bTask.id;
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

      const organizationResidue = await db.select({ id: schema.organization.id }).from(schema.organization).where(eq(schema.organization.id, organizationB));
      const userResidue = await Promise.all([userB, userWithoutMembership].map((id) => db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.id, id))));

      if (organizationResidue.length || userResidue.some((rows) => rows.length)) throw new Error("Resíduos de organização/usuários B após cleanup.");

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
      const organizationResidue = await db.select({ id: schema.organization.id }).from(schema.organization).where(eq(schema.organization.id, orgId));
      const userIds = Object.values(fixtureToClean.actors).map((actor) => actor.userId);
      const userResidue = await Promise.all(userIds.map((id) => db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.id, id))));
      const clientResidue = await db.select({ id: schema.clients.id }).from(schema.clients).where(eq(schema.clients.organizationId, orgId));
      const dealResidue = await db.select({ id: schema.deals.id }).from(schema.deals).where(eq(schema.deals.organizationId, orgId));
      const taskResidue = await db.select({ id: schema.tasks.id }).from(schema.tasks).where(eq(schema.tasks.organizationId, orgId));
      const contactResidue = await db.select({ id: schema.contacts.id }).from(schema.contacts).where(eq(schema.contacts.organizationId, orgId));
      const activityResidue = await db.select({ id: schema.activities.id }).from(schema.activities).where(eq(schema.activities.organizationId, orgId));
      const auditResidue = await db.select({ id: schema.auditLogs.id }).from(schema.auditLogs).where(eq(schema.auditLogs.organizationId, orgId));
      const membershipResidue = await db.select({ id: schema.member.id }).from(schema.member).where(eq(schema.member.organizationId, orgId));

      if (organizationResidue.length || userResidue.some((rows) => rows.length) || clientResidue.length || dealResidue.length || taskResidue.length || contactResidue.length || activityResidue.length || auditResidue.length || membershipResidue.length) {

        throw new Error(`Resíduos da fixture ${orgId} após cleanup.`);

      }

    } catch (error) {

      errors.push(error);

    }

  }

  fixture = undefined;

  runtime.organizationId = "";
  runtime.actorId = "";

  if (errors.length) throw new AggregateError(errors, "Falha no cleanup da fixture task-assignee-reassignment.");

});

afterAll(async () => {
  runtime.db = undefined;
  if (connection) await connection.cleanup();
});

function requireFixture(): Fixture {

  if (!fixture) throw new Error("Fixture não inicializada.");

  return fixture;

}

async function currentTask(id = taskA): Promise<TaskRow | undefined> {

  return (await db.select().from(schema.tasks).where(eq(schema.tasks.id, id)))[0];

}

async function auditRows(id = taskA) {

  return db.select().from(schema.auditLogs).where(and(
    eq(schema.auditLogs.organizationId, requireFixture().organizationId),
    eq(schema.auditLogs.entityType, "task"),
    eq(schema.auditLogs.entityId, id),
  ));

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

        if (!row) throw new Error("Não foi possível obter o PID da transação de reatribuição.");

        onPid(Number(row.pid));

        return callback(tx);

      });
    },
  }) as NodePgDatabase<typeof schema>;
}

async function waitForTaskActionLock(
  monitor: IsolatedConnectionPair["clientA"],
  getActionPid: () => number | undefined,
  blockerPid: number,
  timeoutMs = 3000,
): Promise<LockWaitSession> {

  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {

    // clientA é independente da transação controladora em clientB e permanece
    // em autocommit; limpar o snapshot evita reusar estatísticas entre polls.
    await monitor.query("SELECT pg_stat_clear_snapshot()");

    const actionPid = getActionPid();

    if (actionPid !== undefined) {

      const result = await monitor.query<LockWaitSession>(
        `SELECT pid, state, wait_event_type, wait_event,
                pg_blocking_pids(pid) AS blocking_pids, query
         FROM pg_stat_activity
         WHERE datname = 'crm_test_isolated'
           AND usename = 'crm_test_admin'
           AND pid = $1
           AND pid <> pg_backend_pid()
           AND wait_event_type = 'Lock'
           AND $2 = ANY(pg_blocking_pids(pid))
         LIMIT 1`,
        [actionPid, blockerPid],
      );

      if (result.rows[0]) return result.rows[0];

    }

    await new Promise((resolve) => setTimeout(resolve, 20));

  }

  await monitor.query("SELECT pg_stat_clear_snapshot()");

  const actionPid = getActionPid();
  const monitorPid = (await monitor.query<{ pid: number }>("SELECT pg_backend_pid() AS pid")).rows[0]?.pid;
  const diagnostic = await monitor.query<LockWaitSession & { datname: string; usename: string }>(
    `SELECT pid, datname, usename, state, wait_event_type, wait_event,
            pg_blocking_pids(pid) AS blocking_pids, query
     FROM pg_stat_activity
     WHERE datname = 'crm_test_isolated'
       AND usename = 'crm_test_admin'
       AND (pid = ANY($1::int[]) OR wait_event_type = 'Lock')
     ORDER BY pid LIMIT 12`,
    [[blockerPid, ...(actionPid === undefined ? [] : [actionPid])]],
  );

  console.error("Timeout aguardando lock PostgreSQL da reatribuição de tarefa.", JSON.stringify({
    operation: "reassignTaskAssignee",
    blockerPid,
    actionPid: actionPid ?? null,
    monitorPid: monitorPid ?? null,
    sessions: diagnostic.rows,
  }));

  throw new Error("Timeout aguardando o PID de reassignTaskAssignee bloqueado pela transação controladora.");

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

                      return (values: Record<string, unknown>) => {

                        const valuesMethod = Reflect.get(builderTarget, builderProperty, builderTarget) as (row: Record<string, unknown>) => unknown;

                        return valuesMethod.call(builderTarget, { ...values, action: null });

                      };
                    }
                    const value = Reflect.get(builderTarget, builderProperty, builderReceiver);

                    return typeof value === "function" ? value.bind(builderTarget) : value;

                  },
                });
              }

              const insert = Reflect.get(txTarget, txProperty, txTarget) as (value: unknown) => unknown;

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

      return {
        code: "23502",
        table: typeof candidate.table === "string" ? candidate.table : undefined,
        column: typeof candidate.column === "string" ? candidate.column : undefined,
      };

    }

    current = candidate.cause;

  }

  return undefined;

}

describe("reassignTaskAssignee (contexto mockado; PostgreSQL real)", () => {

  it("OWNER reatribui para membro do workspace e grava auditoria", async () => {

    const { actors } = requireFixture();

    expect(await reassignTaskAssignee({ taskId: taskA, newUserId: actors.target.userId })).toMatchObject({ ok: true, id: taskA });
    expect((await currentTask())?.assigneeUserId).toBe(actors.target.userId);
    expect(await auditRows()).toMatchObject([{
      organizationId: fixture!.organizationId,
      actorUserId: actors.owner.userId,
      action: "reassign",
      entityType: "task",
      entityId: taskA,
      details: JSON.stringify({ fromUserId: actors.owner.userId, toUserId: actors.target.userId }),
    }]);

  });

  it.each(["admin", "member"]) ("rejeita papel %s sem alterar tarefa ou auditar", async (role) => {

    const { actors } = requireFixture();

    runtime.role = role;

    const before = await currentTask();

    await expect(reassignTaskAssignee({ taskId: taskA, newUserId: actors.target.userId })).rejects.toThrow("Acesso negado");

    expect(await currentTask()).toEqual(before);
    expect(await auditRows()).toHaveLength(0);

  });

  it("rejeita contexto sem sessão", async () => {

    runtime.actorId = "";

    await expect(reassignTaskAssignee({ taskId: taskA, newUserId: null })).rejects.toThrow("Acesso negado");

    expect(await auditRows()).toHaveLength(0);

  });

  it("rejeita usuário de outro tenant, sem membership e inexistente sem alterar a tarefa", async () => {

    const before = await currentTask();

    for (const newUserId of [userB, userWithoutMembership, `missing-${randomUUID()}`]) {

      expect(await reassignTaskAssignee({ taskId: taskA, newUserId })).toMatchObject({ ok: false });
      expect(await currentTask()).toEqual(before);

    }

    expect(await auditRows()).toHaveLength(0);
  });

  it("não altera tarefa de outro tenant", async () => {

    const before = await currentTask(taskB);

    expect(await reassignTaskAssignee({ taskId: taskB, newUserId: requireFixture().actors.target.userId })).toMatchObject({ ok: false });
    expect(await currentTask(taskB)).toEqual(before);
    expect(await auditRows(taskB)).toHaveLength(0);

  });

  it("rejeita UUID inválido sem alteração ou auditoria", async () => {

    const before = await currentTask();

    expect(await reassignTaskAssignee({ taskId: "invalid-uuid", newUserId: null })).toMatchObject({ ok: false });
    expect(await currentTask()).toEqual(before);
    expect(await auditRows()).toHaveLength(0);

  });

  it("rejeita tarefa arquivada", async () => {

    const { actors } = requireFixture();

    await db.update(schema.tasks).set({ deletedAt: new Date() }).where(eq(schema.tasks.id, taskA));

    const before = await currentTask();

    expect(await reassignTaskAssignee({ taskId: taskA, newUserId: actors.target.userId })).toMatchObject({ ok: false });
    expect(await currentTask()).toEqual(before);
    expect(await auditRows()).toHaveLength(0);

  });

  it.each(["todo", "in_progress", "done", "canceled"] as const)("permite reatribuição em tarefa ativa no status %s preservando os demais campos", async (status) => {
    
    const { actors } = requireFixture();

    await db.update(schema.tasks).set({ status }).where(eq(schema.tasks.id, taskA));

    const before = await currentTask();

    expect(await reassignTaskAssignee({ taskId: taskA, newUserId: actors.target.userId })).toMatchObject({ ok: true });

    const after = await currentTask();

    expect(after).toMatchObject({
      organizationId: before?.organizationId,
      clientId: before?.clientId,
      dealId: before?.dealId,
      title: before?.title,
      description: before?.description,
      priority: before?.priority,
      status: before?.status,
      dueAt: before?.dueAt,
      assigneeUserId: actors.target.userId,
      deletedAt: null,
    });
  });

  it("desatribui sem remover a tarefa ou alterar status e relacionamentos", async () => {

    const before = await currentTask();

    expect(await reassignTaskAssignee({ taskId: taskA, newUserId: null })).toMatchObject({ ok: true, id: taskA });

    const after = await currentTask();

    expect(after).toMatchObject({
      id: taskA,
      organizationId: fixture!.organizationId,
      clientId: before?.clientId,
      dealId: before?.dealId,
      title: before?.title,
      description: before?.description,
      priority: before?.priority,
      status: before?.status,
      dueAt: before?.dueAt,
      assigneeUserId: null,
      deletedAt: null,
    });
    expect(await auditRows()).toMatchObject([{
      organizationId: fixture!.organizationId,
      actorUserId: fixture!.actors.owner.userId,
      action: "unassign",
      entityType: "task",
      entityId: taskA,
      details: JSON.stringify({ fromUserId: fixture!.actors.owner.userId, toUserId: null }),
    }]);
  });

  it("não cria auditoria quando não há mudança", async () => {

    expect(await reassignTaskAssignee({ taskId: taskA, newUserId: requireFixture().actors.owner.userId })).toMatchObject({ ok: true });
    expect((await currentTask())?.assigneeUserId).toBe(requireFixture().actors.owner.userId);
    expect(await auditRows()).toHaveLength(0);

  });

  it("erro PostgreSQL no INSERT de auditoria reverte toda a alteração", async () => {

    const { actors } = requireFixture();
    const before = await currentTask();
    const realDb = runtime.db!;

    runtime.db = withAuditInsertFailure(db);

    let failure: unknown;

    try {

      await reassignTaskAssignee({ taskId: taskA, newUserId: actors.target.userId });

    } catch (error) {

      failure = error;

    } finally {

      runtime.db = realDb;

    }

    expect(findNotNullViolation(failure)).toMatchObject({ code: "23502", table: "audit_logs", column: "action" });
    expect(await currentTask()).toEqual(before);
    expect(await auditRows()).toHaveLength(0);
    expect(await db.select({ id: schema.clients.id }).from(schema.clients).where(eq(schema.clients.id, clientA))).toHaveLength(1);
    expect(await db.select({ id: schema.deals.id }).from(schema.deals).where(eq(schema.deals.id, dealA))).toHaveLength(1);

  });

  it("duas reatribuições simultâneas preservam estado e auditoria encadeados", async () => {

    const { actors } = requireFixture();
    const initialAssignee = (await currentTask())?.assigneeUserId;
    const commercialFields = await currentTask();
    const externalTaskBefore = await currentTask(taskB);
    const [firstResult, secondResult] = await Promise.all([
      reassignTaskAssignee({ taskId: taskA, newUserId: actors.target.userId }),
      reassignTaskAssignee({ taskId: taskA, newUserId: actors.ownerPeer.userId }),
    ]);

    expect(firstResult).toMatchObject({ ok: true });
    expect(secondResult).toMatchObject({ ok: true });

    const rows = await auditRows();

    expect(rows).toHaveLength(2);

    const entries = rows.map((row) => ({ row, details: JSON.parse(row.details ?? "{}") as { fromUserId: string | null; toUserId: string | null } }));
    const first = entries.find(({ details }) => details.fromUserId === initialAssignee);

    expect(first).toBeDefined();

    const second = entries.find(({ details }) => details.fromUserId === first?.details.toUserId);

    expect(second).toBeDefined();
    expect(first?.details.toUserId).not.toBe(second?.details.toUserId);

    const finalTask = await currentTask();

    expect(finalTask?.assigneeUserId).toBe(second?.details.toUserId);
    expect(finalTask).toMatchObject({
      clientId: commercialFields?.clientId,
      dealId: commercialFields?.dealId,
      title: commercialFields?.title,
      description: commercialFields?.description,
      priority: commercialFields?.priority,
      status: commercialFields?.status,
      dueAt: commercialFields?.dueAt,
    });
    expect(rows.every((row) => row.organizationId === requireFixture().organizationId && row.entityId === taskA)).toBe(true);
    expect(await currentTask(taskB)).toEqual(externalTaskBefore);
  });

  it("aguarda deterministicamente o lock PostgreSQL da tarefa", async () => {

    const { actors } = requireFixture();
    const beforeTask = await currentTask();
    const externalTaskBefore = await currentTask(taskB);
    const auditsBefore = await auditRows();

    let pendingAction: ReturnType<typeof reassignTaskAssignee> | undefined;
    let actionPid: number | undefined;
    let actionSettled = false;

    await connection.clientB.query("BEGIN");

    let controllerTransactionOpen = true;
    let testFailure: unknown;
    let failed = false;

    const cleanupErrors: unknown[] = [];

    try {

      await connection.clientB.query('SELECT id FROM "tasks" WHERE id = $1 FOR UPDATE', [taskA]);

      const blockerPid = (await connection.clientB.query<{ pid: number }>("SELECT pg_backend_pid() AS pid")).rows[0]!.pid;
      const monitorPid = (await connection.clientA.query<{ pid: number }>("SELECT pg_backend_pid() AS pid")).rows[0]!.pid;

      expect(monitorPid).not.toBe(blockerPid);

      runtime.db = captureTransactionBackendPid(db, (pid) => { actionPid = pid; });
      pendingAction = reassignTaskAssignee({ taskId: taskA, newUserId: actors.target.userId });

      void pendingAction.then(() => { actionSettled = true; }, () => { actionSettled = true; });

      const blockedAction = await waitForTaskActionLock(connection.clientA, () => actionPid, blockerPid);

      expect(blockedAction.pid).toBe(actionPid);
      expect(blockedAction.pid).not.toBe(monitorPid);
      expect(blockedAction.wait_event_type).toBe("Lock");
      expect(blockedAction.blocking_pids).toContain(blockerPid);
      expect(actionSettled).toBe(false);

      await connection.clientB.query("COMMIT");

      controllerTransactionOpen = false;

      const controllerState = await connection.clientA.query<{ xact_start: Date | null }>(
        "SELECT xact_start FROM pg_stat_activity WHERE pid = $1",
        [blockerPid],
      );

      expect(controllerState.rows[0]?.xact_start).toBeNull();
      expect(await pendingAction).toMatchObject({ ok: true, id: taskA });
      const afterTask = await currentTask();
      expect(afterTask?.assigneeUserId).toBe(actors.target.userId);
      expect(afterTask).toMatchObject({
        clientId: beforeTask?.clientId,
        dealId: beforeTask?.dealId,
        title: beforeTask?.title,
        description: beforeTask?.description,
        priority: beforeTask?.priority,
        status: beforeTask?.status,
        dueAt: beforeTask?.dueAt,
        deletedAt: beforeTask?.deletedAt,
      });
      expect(await auditRows()).toMatchObject([{
        organizationId: requireFixture().organizationId,
        actorUserId: actors.owner.userId,
        action: "reassign",
        entityType: "task",
        entityId: taskA,
        details: JSON.stringify({ fromUserId: actors.owner.userId, toUserId: actors.target.userId }),
      }]);
      expect(await currentTask(taskB)).toEqual(externalTaskBefore);
      expect(await auditRows()).not.toEqual(auditsBefore);

    } catch (error) {

      failed = true;
      testFailure = error;

    } finally {

      if (controllerTransactionOpen) {

        try {

          await connection.clientB.query("ROLLBACK");

          controllerTransactionOpen = false;

        } catch (error) {

          cleanupErrors.push(error);

        }

      }

      if (pendingAction) {

        let timer: ReturnType<typeof setTimeout> | undefined;

        const settled = await Promise.race([
          Promise.allSettled([pendingAction]).then((results) => ({ timedOut: false as const, results })),
          new Promise<{ timedOut: true }>((resolve) => {
            timer = setTimeout(() => resolve({ timedOut: true }), 5000);
          }),
        ]);

        if (timer) clearTimeout(timer);

        if (settled.timedOut) cleanupErrors.push(new Error("A action de reatribuição não concluiu após liberar o lock controlado."));
        else cleanupErrors.push(...settled.results.filter((result) => result.status === "rejected").map((result) => result.reason));

      }

      runtime.db = db;

    }

    if (cleanupErrors.length) throw new AggregateError([...(failed ? [testFailure] : []), ...cleanupErrors], "Falha no teste ou no cleanup do lock PostgreSQL.");
    if (failed) throw testFailure;

  }, 10000);

});
