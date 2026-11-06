import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, inArray } from "drizzle-orm";
import * as schema from "@/db/schema";
import { createIsolatedConnectionPair, type IsolatedConnectionPair } from "../helpers/test-db";
import { seedTeamRbacFixture } from "../helpers/team-rbac-fixture";

const runtime = vi.hoisted(() => ({ db: undefined as NodePgDatabase<typeof schema> | undefined }));

vi.mock("@/db", () => ({
  getDb: () => {
    if (!runtime.db) throw new Error("Banco PostgreSQL isolado não inicializado.");
    return runtime.db;
  },
}));

type Fixture = Awaited<ReturnType<typeof seedTeamRbacFixture>>;

let connection: IsolatedConnectionPair | undefined;
let db: NodePgDatabase<typeof schema>;
let fixture: Fixture | undefined;
let temporaryOrganizationIds: string[] = [];
let createBootstrapOrganizationWithOwner: typeof import("../../scripts/lib/bootstrap-organization").createBootstrapOrganizationWithOwner;

beforeAll(async () => {

  if (process.env.DATABASE_URL) throw new Error("DATABASE_URL proibida nesta suíte.");

  connection = await createIsolatedConnectionPair();
  db = drizzle(connection.poolA, { schema });

  runtime.db = db;

  ({ createBootstrapOrganizationWithOwner } = await import("../../scripts/lib/bootstrap-organization"));

});

beforeEach(async () => {
  fixture = await seedTeamRbacFixture(db);
  temporaryOrganizationIds = [];
});

afterEach(async () => {

  const current = fixture;
  const organizationIds = [...temporaryOrganizationIds];

  fixture = undefined;
  temporaryOrganizationIds = [];

  const errors: unknown[] = [];

  if (organizationIds.length) {

    try {

      // Organization deletion cascades its fixture memberships. Keep the
      // deletion in one transaction so deferred checks see no organization.
      await db.transaction(async (tx) => {
        await tx.delete(schema.organization).where(inArray(schema.organization.id, organizationIds));
      });

      const [organizations, memberships, guards] = await Promise.all([
        db.select({ id: schema.organization.id }).from(schema.organization).where(inArray(schema.organization.id, organizationIds)),
        db.select({ id: schema.member.id }).from(schema.member).where(inArray(schema.member.organizationId, organizationIds)),
        db.select({ id: schema.organizationOwnerGuard.organizationId }).from(schema.organizationOwnerGuard)
          .where(inArray(schema.organizationOwnerGuard.organizationId, organizationIds)),
      ]);

      if (organizations.length || memberships.length || guards.length) {

        throw new Error("Resíduos de organizações temporárias após cleanup.");

      }
    } catch (error) {

      errors.push(error);

    }
  }

  if (current) {

    try {

      await current.cleanup();

      const [organizations, memberships, guards] = await Promise.all([
        db.select({ id: schema.organization.id }).from(schema.organization).where(eq(schema.organization.id, current.organizationId)),
        db.select({ id: schema.member.id }).from(schema.member).where(eq(schema.member.organizationId, current.organizationId)),
        db.select({ id: schema.organizationOwnerGuard.organizationId }).from(schema.organizationOwnerGuard)
          .where(eq(schema.organizationOwnerGuard.organizationId, current.organizationId)),
      ]);

      if (organizations.length || memberships.length || guards.length) {

        throw new Error(`Resíduos da fixture ${current.organizationId} após cleanup.`);

      }
    } catch (error) {

      errors.push(error);

    }
  }

  if (errors.length) throw new AggregateError(errors, "Falha no cleanup da invariante de criação de organização.");

});

afterAll(async () => {

  runtime.db = undefined;

  if (connection) await connection.cleanup();

});

function requireFixture(): Fixture {

  if (!fixture) throw new Error("Fixture da invariante de criação não inicializada.");

  return fixture;

}

function findPostgresError(error: unknown): { code?: string; constraint?: string } | undefined {

  const visited = new Set<object>();

  let current: unknown = error;

  while (current && typeof current === "object" && !visited.has(current)) {

    visited.add(current);

    const candidate = current as { code?: unknown; constraint?: unknown; cause?: unknown };

    if (typeof candidate.code === "string") {

      return {
        code: candidate.code,
        constraint: typeof candidate.constraint === "string" ? candidate.constraint : undefined,
      };

    }
    
    current = candidate.cause;

  }

  return undefined;

}

async function expectOwnerConstraintFailure(operation: Promise<unknown>) {

  let thrown: unknown;

  try {

    await operation;

  } catch (error) {

    thrown = error;

  }

  expect(findPostgresError(thrown)).toMatchObject({ code: "23514", constraint: "organization_requires_owner" });

}

async function expectForeignKeyFailure(operation: Promise<unknown>) {

  let thrown: unknown;

  try {

    await operation;

  } catch (error) {

    thrown = error;

  }

  expect(findPostgresError(thrown)).toMatchObject({ code: "23503" });

}

async function expectNoOrganizationState(organizationId: string) {

  const [organizations, memberships, guards] = await Promise.all([
    db.select({ id: schema.organization.id }).from(schema.organization).where(eq(schema.organization.id, organizationId)),
    db.select({ id: schema.member.id }).from(schema.member).where(eq(schema.member.organizationId, organizationId)),
    db.select({ id: schema.organizationOwnerGuard.organizationId }).from(schema.organizationOwnerGuard)
      .where(eq(schema.organizationOwnerGuard.organizationId, organizationId)),
  ]);

  expect([organizations, memberships, guards]).toEqual([[], [], []]);

}

function newOrganizationId() {

  const id = `creation-owner-${randomUUID()}`;

  temporaryOrganizationIds.push(id);

  return id;

}

async function waitForBlockedSession(blockerPid: number, blockedPid: number, timeoutMs = 4_000) {

  const deadline = Date.now() + timeoutMs;

  let lastState: unknown;

  do {

    // Each monitor statement uses poolB autocommit; clear stats to avoid reusing
    // an earlier pg_stat_activity snapshot while waiting for the real lock.
    await connection!.poolB.query("SELECT pg_stat_clear_snapshot()");

    const result = await connection!.poolB.query<{
      pid: number;
      state: string;
      wait_event_type: string | null;
      wait_event: string | null;
      blocking_pids: number[];
      query: string;
    }>(`
      SELECT pid, state, wait_event_type, wait_event,
             pg_blocking_pids(pid) AS blocking_pids, query
        FROM pg_stat_activity
       WHERE datname = current_database() AND pid = $1
    `, [blockedPid]);
    lastState = result.rows[0];

    const row = result.rows[0];

    if (row?.wait_event_type === "Lock" && row.blocking_pids.includes(blockerPid)) return row;

    await new Promise((resolve) => setTimeout(resolve, 25));

  } while (Date.now() < deadline);

  throw new Error(`PostgreSQL não confirmou o bloqueio esperado. blocker=${blockerPid}, blocked=${blockedPid}, state=${JSON.stringify(lastState)}`);

}

describe("invariante PostgreSQL de criação de organização (migration 0002)", () => {

  it("rejeita INSERT direto de organização sem OWNER e reverte a organização e sua guarda", async () => {

    const organizationId = newOrganizationId();

    await expectOwnerConstraintFailure(db.transaction(async (tx) => {

      await tx.insert(schema.organization).values({ id: organizationId, name: "Ownerless direct insert", slug: `creation-direct-${randomUUID()}` });

    }));

    await expectNoOrganizationState(organizationId);

  });

  it.each(["member", "admin"] as const)("rejeita organização que termina somente com papel %s", async (role) => {

    const organizationId = newOrganizationId();

    await expectOwnerConstraintFailure(db.transaction(async (tx) => {

      await tx.insert(schema.organization).values({ id: organizationId, name: `Only ${role}`, slug: `creation-${role}-${randomUUID()}` });
      await tx.insert(schema.member).values({
        id: `creation-member-${randomUUID()}`,
        organizationId,
        userId: requireFixture().actors.member.userId,
        role,
      });

    }));

    await expectNoOrganizationState(organizationId);

  });

  it("permite criar organização e OWNER na mesma transação e reconhece tokens de papel separados por vírgula", async () => {

    const organizationId = newOrganizationId();
    const ownerUserId = requireFixture().actors.owner.userId;

    await db.transaction(async (tx) => {

      await tx.insert(schema.organization).values({ id: organizationId, name: "Atomic OWNER creation", slug: `creation-valid-${randomUUID()}` });
      await tx.insert(schema.member).values({
        id: `creation-owner-member-${randomUUID()}`,
        organizationId,
        userId: ownerUserId,
        role: "admin, owner",
      });

    });

    expect(await db.select({ role: schema.member.role }).from(schema.member).where(eq(schema.member.organizationId, organizationId)))
      .toEqual([{ role: "admin, owner" }]);
    expect(await db.select({ id: schema.organizationOwnerGuard.organizationId }).from(schema.organizationOwnerGuard)
      .where(eq(schema.organizationOwnerGuard.organizationId, organizationId))).toHaveLength(1);

  });

  it("rejeita organização e OWNER criados em transações separadas", async () => {

    const organizationId = newOrganizationId();
    
    await expectOwnerConstraintFailure(db.transaction(async (tx) => {
      await tx.insert(schema.organization).values({ id: organizationId, name: "Separate OWNER transaction", slug: `creation-separate-${randomUUID()}` });
    }));
    await expectNoOrganizationState(organizationId);
    await expectForeignKeyFailure(db.insert(schema.member).values({
      id: `creation-late-owner-${randomUUID()}`,
      organizationId,
      userId: requireFixture().actors.owner.userId,
      role: "owner",
    }));
  });

  it("mantém organizações preexistentes intactas quando uma criação inválida sofre rollback", async () => {

    const current = requireFixture();
    const organizationId = newOrganizationId();
    const [beforeOrganization] = await db.select().from(schema.organization).where(eq(schema.organization.id, current.organizationId));
    const beforeOwners = await db.select({ userId: schema.member.userId, role: schema.member.role }).from(schema.member)
      .where(eq(schema.member.organizationId, current.organizationId));

    await expectOwnerConstraintFailure(db.transaction(async (tx) => {

      await tx.insert(schema.organization).values({ id: organizationId, name: "Rejected beside existing", slug: `creation-preserve-${randomUUID()}` });

    }));

    expect(await db.select().from(schema.organization).where(eq(schema.organization.id, current.organizationId))).toEqual([beforeOrganization]);
    expect(await db.select({ userId: schema.member.userId, role: schema.member.role }).from(schema.member)
      .where(eq(schema.member.organizationId, current.organizationId))).toEqual(beforeOwners);

    await expectNoOrganizationState(organizationId);

  });

  it("permite criar e eliminar a mesma organização na transação de cleanup", async () => {

    const organizationId = newOrganizationId();

    await db.transaction(async (tx) => {

      await tx.insert(schema.organization).values({ id: organizationId, name: "Transient fixture", slug: `creation-delete-${randomUUID()}` });
      await tx.delete(schema.organization).where(eq(schema.organization.id, organizationId));

    });

    await expectNoOrganizationState(organizationId);

  });

  it("preserva o serviço transacional do bootstrap com exatamente um OWNER inicial", async () => {

    const organizationId = newOrganizationId();
    const memberId = `bootstrap-owner-member-${randomUUID()}`;
    const generatedIds = [organizationId, memberId];
    const result = await createBootstrapOrganizationWithOwner({
      ownerUserId: requireFixture().actors.owner.userId,
      name: "Bootstrap under migration 0002",
      slug: `creation-bootstrap-${randomUUID()}`,
    }, () => generatedIds.shift()!);

    expect(result.organization.id).toBe(organizationId);
    expect(result.membership).toMatchObject({ id: memberId, organizationId, role: "owner" });
    expect(await db.select({ id: schema.member.id }).from(schema.member)
      .where(eq(schema.member.organizationId, organizationId))).toHaveLength(1);

  });

  it.each(["delete", "demote"] as const)("impede remoção indevida do último OWNER por %s direto", async (operation) => {

    const organizationId = newOrganizationId();
    const ownerUserId = requireFixture().actors.owner.userId;
    const memberId = `single-owner-member-${randomUUID()}`;

    await db.transaction(async (tx) => {

      await tx.insert(schema.organization).values({ id: organizationId, name: "Single OWNER", slug: `creation-last-owner-${randomUUID()}` });
      await tx.insert(schema.member).values({ id: memberId, organizationId, userId: ownerUserId, role: "owner" });

    });

    await expectOwnerConstraintFailure(db.transaction(async (tx) => {

      if (operation === "delete") {

        await tx.delete(schema.member).where(eq(schema.member.id, memberId));

      } else {

        await tx.update(schema.member).set({ role: "member" }).where(eq(schema.member.id, memberId));

      }
    }));

    expect(await db.select({ role: schema.member.role }).from(schema.member).where(eq(schema.member.id, memberId)))
      .toEqual([{ role: "owner" }]);
  });

  it.each(["delete", "demote"] as const)("serializa INSERT de OWNER concorrente com %s do último OWNER", async (operation) => {

    const current = requireFixture();
    const organizationId = newOrganizationId();
    const originalMemberId = `race-original-owner-${randomUUID()}`;
    const replacementMemberId = `race-replacement-owner-${randomUUID()}`;

    await db.transaction(async (tx) => {
      await tx.insert(schema.organization).values({ id: organizationId, name: "Concurrent OWNER creation", slug: `creation-race-${randomUUID()}` });
      await tx.insert(schema.member).values({
        id: originalMemberId,
        organizationId,
        userId: current.actors.owner.userId,
        role: "owner",
      });
    });

    const clientA = connection!.clientA;
    const clientB = connection!.clientB;

    let transactionAOpen = false;
    let transactionBOpen = false;
    let replacementInsert: Promise<unknown> | undefined;

    try {

      await clientA.query("BEGIN ISOLATION LEVEL READ COMMITTED");

      transactionAOpen = true;

      const [{ pid: blockerPid }] = (await clientA.query<{ pid: number }>("SELECT pg_backend_pid()::int AS pid")).rows;

      if (!blockerPid) throw new Error("PID da transação controladora não foi obtido.");

      if (operation === "delete") {

        await clientA.query("DELETE FROM public.member WHERE id = $1", [originalMemberId]);

      } else {

        await clientA.query("UPDATE public.member SET role = 'member' WHERE id = $1", [originalMemberId]);

      }

      await clientB.query("BEGIN ISOLATION LEVEL READ COMMITTED");

      transactionBOpen = true;
      
      const [{ pid: blockedPid }] = (await clientB.query<{ pid: number }>("SELECT pg_backend_pid()::int AS pid")).rows;
      
      if (!blockedPid) throw new Error("PID da inserção concorrente não foi obtido.");
      replacementInsert = clientB.query(
        "INSERT INTO public.member (id, organization_id, user_id, role) VALUES ($1, $2, $3, 'owner')",
        [replacementMemberId, organizationId, current.actors.member.userId],
      );

      const observed = await waitForBlockedSession(blockerPid, blockedPid);

      expect(observed.wait_event_type).toBe("Lock");
      expect(observed.blocking_pids).toContain(blockerPid);

      let commitError: unknown;

      try {

        await clientA.query("COMMIT");

        transactionAOpen = false;

      } catch (error) {

        transactionAOpen = false; // Deferred trigger error aborts this transaction.
        commitError = error;

      }

      expect(findPostgresError(commitError)).toMatchObject({ code: "23514", constraint: "organization_requires_owner" });

      await replacementInsert;
      await clientB.query("COMMIT");

      transactionBOpen = false;

      expect(await db.select({ id: schema.member.id, userId: schema.member.userId, role: schema.member.role })
        .from(schema.member).where(eq(schema.member.organizationId, organizationId)).orderBy(schema.member.id))
        .toEqual([
          { id: originalMemberId, userId: current.actors.owner.userId, role: "owner" },
          { id: replacementMemberId, userId: current.actors.member.userId, role: "owner" },
        ].sort((left, right) => left.id.localeCompare(right.id)));

    } finally {

      const cleanupErrors: unknown[] = [];

      if (transactionAOpen) {

        try { await clientA.query("ROLLBACK"); } catch (error) { cleanupErrors.push(error); }

      }

      if (replacementInsert) {

        const settled = await Promise.allSettled([replacementInsert]);
        const rejection = settled.find((result) => result.status === "rejected");

        if (rejection?.status === "rejected" && !cleanupErrors.length) cleanupErrors.push(rejection.reason);

      }

      if (transactionBOpen) {

        try { await clientB.query("ROLLBACK"); } catch (error) { cleanupErrors.push(error); }

      }

      if (cleanupErrors.length) throw new AggregateError(cleanupErrors, "Falha ao encerrar transações concorrentes da fixture.");

    }
  }, 10_000);
});
