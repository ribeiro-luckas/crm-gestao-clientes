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

// Mocka somente a autorização/contexto. Drizzle, transações, locks e constraints
// são executados no PostgreSQL real; isso não valida o fluxo Better Auth.
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
type DealRow = typeof schema.deals.$inferSelect;

let connection: IsolatedConnectionPair;
let db: NodePgDatabase<typeof schema>;
let fixture: Fixture | undefined;
let organizationB = "";
let userB = "";
let userWithoutMembership = "";
let clientA = "";
let dealA = "";
let dealB = "";
let reassignDealOwner: typeof import("@/modules/deals/actions").reassignDealOwner;

beforeAll(async () => {

  if (process.env.DATABASE_URL) throw new Error("DATABASE_URL proibida nesta suíte.");

  connection = await createIsolatedConnectionPair();
  db = drizzle(connection.poolA, { schema });
  runtime.db = db;

  ({ reassignDealOwner } = await import("@/modules/deals/actions"));

});

beforeEach(async () => {

  fixture = await seedTeamRbacFixture(db);
  organizationB = `deal-reassign-org-${randomUUID()}`;
  userB = `deal-reassign-user-${randomUUID()}`;
  userWithoutMembership = `deal-reassign-unmember-${randomUUID()}`;
  await db.transaction(async (tx) => {

    await tx.insert(schema.organization).values({ id: organizationB, name: "Deal reassignment B", slug: `deal-reassign-${randomUUID()}` });

    await tx.insert(schema.user).values([
      { id: userB, name: "Tenant B user", email: `${randomUUID()}@example.test` },
      { id: userWithoutMembership, name: "Unassigned user", email: `${randomUUID()}@example.test` },
    ]);

    await tx.insert(schema.member).values({ id: `deal-member-${randomUUID()}`, organizationId: organizationB, userId: userB, role: "owner" });

    const [aClient] = await tx.insert(schema.clients).values({
      organizationId: fixture!.organizationId,
      kind: "company",
      name: "Deal owner reassignment A client",
      ownerUserId: fixture!.actors.owner.userId,
    }).returning({ id: schema.clients.id });
    const [bClient] = await tx.insert(schema.clients).values({
      organizationId: organizationB,
      kind: "company",
      name: "Deal owner reassignment B client",
      ownerUserId: userB,
    }).returning({ id: schema.clients.id });
    const [aDeal] = await tx.insert(schema.deals).values({
      organizationId: fixture!.organizationId,
      clientId: aClient.id,
      title: "Deal A",
      amount: "123.45",
      ownerUserId: fixture!.actors.owner.userId,
    }).returning({ id: schema.deals.id });
    const [bDeal] = await tx.insert(schema.deals).values({
      organizationId: organizationB,
      clientId: bClient.id,
      title: "Deal B secret",
      ownerUserId: userB,
    }).returning({ id: schema.deals.id });
    clientA = aClient.id;
    dealA = aDeal.id;
    dealB = bDeal.id;
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

      const [residue] = await db.select({ id: schema.organization.id }).from(schema.organization).where(eq(schema.organization.id, organizationB));

      if (residue) throw new Error(`A organização temporária ${organizationB} permaneceu após o cleanup.`);

      const users = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.id, userB));
      const unmember = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.id, userWithoutMembership));

      if (users.length || unmember.length) throw new Error("Usuários temporários do tenant B permaneceram após o cleanup.");

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

      const organizationResidue = await db.select({ id: schema.organization.id }).from(schema.organization).where(eq(schema.organization.id, fixtureToClean.organizationId));
      const memberUserIds = Object.values(fixtureToClean.actors).map((actor) => actor.userId);
      const userResidue = await Promise.all(memberUserIds.map((id) => db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.id, id))));
      const clientResidue = await db.select({ id: schema.clients.id }).from(schema.clients).where(eq(schema.clients.organizationId, fixtureToClean.organizationId));
      const dealResidue = await db.select({ id: schema.deals.id }).from(schema.deals).where(eq(schema.deals.organizationId, fixtureToClean.organizationId));
      const taskResidue = await db.select({ id: schema.tasks.id }).from(schema.tasks).where(eq(schema.tasks.organizationId, fixtureToClean.organizationId));
      const contactResidue = await db.select({ id: schema.contacts.id }).from(schema.contacts).where(eq(schema.contacts.organizationId, fixtureToClean.organizationId));
      const activityResidue = await db.select({ id: schema.activities.id }).from(schema.activities).where(eq(schema.activities.organizationId, fixtureToClean.organizationId));
      const auditResidue = await db.select({ id: schema.auditLogs.id }).from(schema.auditLogs).where(eq(schema.auditLogs.organizationId, fixtureToClean.organizationId));
      const membershipResidue = await db.select({ id: schema.member.id }).from(schema.member).where(eq(schema.member.organizationId, fixtureToClean.organizationId));

      if (organizationResidue.length || userResidue.some((rows) => rows.length) || clientResidue.length || dealResidue.length || taskResidue.length || contactResidue.length || activityResidue.length || auditResidue.length || membershipResidue.length) {

        throw new Error(`Resíduos da fixture ${fixtureToClean.organizationId} permaneceram após o cleanup.`);

      }
    } catch (error) {

      errors.push(error);

    }
  }

  fixture = undefined;

  runtime.organizationId = "";
  runtime.actorId = "";

  if (errors.length) throw new AggregateError(errors, "Falha no cleanup da fixture deal-owner-reassignment.");

});

afterAll(async () => {

  runtime.db = undefined;

  if (connection) await connection.cleanup();

});

function requireFixture(): Fixture {

  if (!fixture) throw new Error("Fixture não inicializada.");

  return fixture;

}

async function currentDeal(id = dealA): Promise<DealRow | undefined> {

  return (await db.select().from(schema.deals).where(eq(schema.deals.id, id)))[0];

}

async function auditRows(id = dealA) {

  return db.select().from(schema.auditLogs).where(and(
    eq(schema.auditLogs.organizationId, requireFixture().organizationId),
    eq(schema.auditLogs.entityType, "deal"),
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

async function waitForDealActionLock(
  monitor: IsolatedConnectionPair["clientA"],
  getActionPid: () => number | undefined,
  blockerPid: number,
  timeoutMs = 3000,
): Promise<LockWaitSession> {

  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {

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

  console.error("Timeout aguardando lock PostgreSQL da reatribuição de oportunidade.", JSON.stringify({
    operation: "reassignDealOwner",
    blockerPid,
    actionPid: actionPid ?? null,
    monitorPid: monitorPid ?? null,
    sessions: diagnostic.rows,
  }));

  throw new Error("Timeout aguardando o PID de reassignDealOwner bloqueado pela transação controladora.");

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

                        // Coluna NOT NULL inválida: o próprio PostgreSQL rejeita o INSERT,
                        // abortando a transação depois do UPDATE comercial.
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

describe("reassignDealOwner (contexto mockado; PostgreSQL real)", () => {

  it("OWNER reatribui para membro da organização e grava auditoria", async () => {

    const { actors } = requireFixture();

    expect(await reassignDealOwner({ dealId: dealA, newUserId: actors.target.userId })).toMatchObject({ ok: true, id: dealA });
    expect((await currentDeal())?.ownerUserId).toBe(actors.target.userId);
    expect(await auditRows()).toMatchObject([{ organizationId: fixture!.organizationId, actorUserId: actors.owner.userId, action: "reassign", details: JSON.stringify({ fromUserId: actors.owner.userId, toUserId: actors.target.userId }) }]);

  });

  it.each(["admin", "member"]) ("rejeita papel %s sem alterar oportunidade ou auditar", async (role) => {

    const { actors } = requireFixture();

    runtime.role = role;

    const before = await currentDeal();

    await expect(reassignDealOwner({ dealId: dealA, newUserId: actors.target.userId })).rejects.toThrow("Acesso negado");

    expect(await currentDeal()).toEqual(before);
    expect(await auditRows()).toHaveLength(0);

  });

  it("rejeita contexto sem sessão", async () => {

    runtime.actorId = "";

    await expect(reassignDealOwner({ dealId: dealA, newUserId: null })).rejects.toThrow("Acesso negado");

    expect(await auditRows()).toHaveLength(0);

  });

  it("rejeita usuário de outro tenant, usuário sem membership e usuário inexistente", async () => {

    const before = await currentDeal();

    for (const newUserId of [userB, userWithoutMembership, `missing-${randomUUID()}`]) {

      expect(await reassignDealOwner({ dealId: dealA, newUserId })).toMatchObject({ ok: false });
      expect(await currentDeal()).toEqual(before);

    }

    expect(await auditRows()).toHaveLength(0);

  });

  it("não altera oportunidade de outro tenant", async () => {

    const before = await currentDeal(dealB);

    expect(await reassignDealOwner({ dealId: dealB, newUserId: requireFixture().actors.target.userId })).toMatchObject({ ok: false });
    expect(await currentDeal(dealB)).toEqual(before);
    expect(await auditRows(dealB)).toHaveLength(0);

  });

  it("rejeita UUID inválido sem alteração ou auditoria", async () => {

    const before = await currentDeal();

    expect(await reassignDealOwner({ dealId: "invalid-uuid", newUserId: null })).toMatchObject({ ok: false });
    expect(await currentDeal()).toEqual(before);
    expect(await auditRows()).toHaveLength(0);

  });

  it("rejeita oportunidade arquivada", async () => {

    const { actors } = requireFixture();

    await db.update(schema.deals).set({ deletedAt: new Date() }).where(eq(schema.deals.id, dealA));

    const before = await currentDeal();
    
    expect(await reassignDealOwner({ dealId: dealA, newUserId: actors.target.userId })).toMatchObject({ ok: false });
    expect(await currentDeal()).toEqual(before);
    expect(await auditRows()).toHaveLength(0);

  });

  it.each([
    { stage: "new_lead" as const, closedAt: null, lossReason: null },
    { stage: "won" as const, closedAt: new Date("2026-01-02T03:04:05Z"), lossReason: null },
    { stage: "lost" as const, closedAt: new Date("2026-01-03T03:04:05Z"), lossReason: "Sem orçamento" },
  ])("permite reatribuição no estágio $stage sem alterar os dados comerciais", async ({ stage, closedAt, lossReason }) => {

    const { actors } = requireFixture();

    await db.update(schema.deals).set({ stage, closedAt, lossReason }).where(eq(schema.deals.id, dealA));

    const before = await currentDeal();

    expect(await reassignDealOwner({ dealId: dealA, newUserId: actors.target.userId })).toMatchObject({ ok: true });

    const after = await currentDeal();

    expect(after).toMatchObject({
      clientId: before?.clientId,
      title: before?.title,
      amount: before?.amount,
      stage: before?.stage,
      closedAt: before?.closedAt,
      lossReason: before?.lossReason,
      ownerUserId: actors.target.userId,
    });

  });

  it("desatribui sem remover a oportunidade ou modificar outros campos comerciais", async () => {

    const before = await currentDeal();
    const result = await reassignDealOwner({ dealId: dealA, newUserId: null });
    const after = await currentDeal();

    expect(result).toMatchObject({ ok: true, id: dealA });
    expect(after).toMatchObject({
      id: dealA,
      organizationId: fixture!.organizationId,
      clientId: before?.clientId,
      title: before?.title,
      amount: before?.amount,
      stage: before?.stage,
      closedAt: before?.closedAt,
      lossReason: before?.lossReason,
      ownerUserId: null,
      deletedAt: null,
    });
    expect(await auditRows()).toMatchObject([{ action: "unassign", actorUserId: fixture!.actors.owner.userId, details: JSON.stringify({ fromUserId: fixture!.actors.owner.userId, toUserId: null }) }]);
  });

  it("não cria auditoria quando o responsável não muda", async () => {

    expect(await reassignDealOwner({ dealId: dealA, newUserId: requireFixture().actors.owner.userId })).toMatchObject({ ok: true });
    expect((await currentDeal())?.ownerUserId).toBe(requireFixture().actors.owner.userId);
    expect(await auditRows()).toHaveLength(0);

  });

  it("falha de auditoria reverte a atualização na transação PostgreSQL", async () => {

    const { actors } = requireFixture();
    const before = await currentDeal();
    const realDb = runtime.db!;

    runtime.db = withAuditInsertFailure(db);

    let failure: unknown;

    try {

      await reassignDealOwner({ dealId: dealA, newUserId: actors.target.userId });

    } catch (error) {

      failure = error;

    } finally {

      runtime.db = realDb;

    }

    expect(findNotNullViolation(failure)).toMatchObject({ code: "23502", table: "audit_logs", column: "action" });
    expect(await currentDeal()).toEqual(before);
    expect(await auditRows()).toHaveLength(0);
    expect(await db.select({ id: schema.clients.id }).from(schema.clients).where(eq(schema.clients.id, clientA))).toHaveLength(1);

  });

  it("duas reatribuições concorrentes produzem estado final e auditoria encadeados", async () => {

    const { actors } = requireFixture();
    const initialOwner = (await currentDeal())?.ownerUserId;
    const externalDealBefore = await currentDeal(dealB);
    const [firstResult, secondResult] = await Promise.all([
      reassignDealOwner({ dealId: dealA, newUserId: actors.target.userId }),
      reassignDealOwner({ dealId: dealA, newUserId: actors.ownerPeer.userId }),
    ]);

    expect(firstResult).toMatchObject({ ok: true });
    expect(secondResult).toMatchObject({ ok: true });

    const rows = await auditRows();

    expect(rows).toHaveLength(2);

    const entries = rows.map((row) => ({ row, details: JSON.parse(row.details ?? "{}") as { fromUserId: string | null; toUserId: string | null } }));
    const first = entries.find(({ details }) => details.fromUserId === initialOwner);

    expect(first).toBeDefined();

    const second = entries.find(({ details }) => details.fromUserId === first?.details.toUserId);

    expect(second).toBeDefined();
    expect(first?.details.toUserId).not.toBe(second?.details.toUserId);
    expect((await currentDeal())?.ownerUserId).toBe(second?.details.toUserId);
    expect(rows.every((row) => row.organizationId === requireFixture().organizationId && row.entityId === dealA)).toBe(true);
    expect(await currentDeal(dealB)).toEqual(externalDealBefore);

  });

  it("aguarda deterministicamente o lock da oportunidade e continua após liberação", async () => {

    const { actors } = requireFixture();
    const beforeDeal = await currentDeal();
    const externalDealBefore = await currentDeal(dealB);
    const auditsBefore = await auditRows();

    let pendingAction: ReturnType<typeof reassignDealOwner> | undefined;
    let actionPid: number | undefined;
    let actionSettled = false;

    await connection.clientB.query("BEGIN");

    let controllerTransactionOpen = true;
    let testFailure: unknown;
    let failed = false;

    const cleanupErrors: unknown[] = [];

    try {

      const lockedDeal = await connection.clientB.query('SELECT id FROM "deals" WHERE id = $1 FOR UPDATE', [dealA]);

      expect(lockedDeal.rowCount).toBe(1);

      const blockerPid = (await connection.clientB.query<{ pid: number }>("SELECT pg_backend_pid() AS pid")).rows[0]!.pid;
      const monitorPid = (await connection.clientA.query<{ pid: number }>("SELECT pg_backend_pid() AS pid")).rows[0]!.pid;

      expect(monitorPid).not.toBe(blockerPid);

      runtime.db = captureTransactionBackendPid(db, (pid) => { actionPid = pid; });

      pendingAction = reassignDealOwner({ dealId: dealA, newUserId: actors.target.userId });

      void pendingAction.then(() => { actionSettled = true; }, () => { actionSettled = true; });

      const blockedAction = await waitForDealActionLock(connection.clientA, () => actionPid, blockerPid);

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

      expect(await pendingAction).toMatchObject({ ok: true, id: dealA });

      const afterDeal = await currentDeal();

      expect(afterDeal?.ownerUserId).toBe(actors.target.userId);
      expect(afterDeal).toMatchObject({
        organizationId: beforeDeal?.organizationId,
        clientId: beforeDeal?.clientId,
        title: beforeDeal?.title,
        stage: beforeDeal?.stage,
        amount: beforeDeal?.amount,
        currency: beforeDeal?.currency,
        expectedCloseAt: beforeDeal?.expectedCloseAt,
        lossReason: beforeDeal?.lossReason,
        closedAt: beforeDeal?.closedAt,
        deletedAt: beforeDeal?.deletedAt,
      });

      const auditsAfter = await auditRows();

      expect(auditsAfter).toHaveLength(1);
      expect(auditsAfter).toMatchObject([{
        organizationId: requireFixture().organizationId,
        actorUserId: actors.owner.userId,
        action: "reassign",
        entityType: "deal",
        entityId: dealA,
        details: JSON.stringify({ fromUserId: actors.owner.userId, toUserId: actors.target.userId }),
      }]);
      expect(await currentDeal(dealB)).toEqual(externalDealBefore);
      expect(auditsAfter).not.toEqual(auditsBefore);

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
