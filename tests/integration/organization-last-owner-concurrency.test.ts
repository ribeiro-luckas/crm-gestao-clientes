import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import * as schema from "@/db/schema";
import { createIsolatedConnectionPair, type IsolatedConnectionPair } from "../helpers/test-db";
import { seedTeamRbacFixture, signInAndGetCookie } from "../helpers/team-rbac-fixture";

const runtime = vi.hoisted(() => ({ db: undefined as NodePgDatabase<typeof schema> | undefined }));

vi.mock("@/db", () => ({
  getDb: () => {
    if (!runtime.db) throw new Error("Banco PostgreSQL isolado não inicializado.");
    return runtime.db;
  },
}));

type Fixture = Awaited<ReturnType<typeof seedTeamRbacFixture>>;
type Actor = "owner" | "ownerPeer";
type RaceCase = "two-leaves" | "two-removals" | "leave-and-remove";

let connection: IsolatedConnectionPair | undefined;
let db: NodePgDatabase<typeof schema>;
let fixture: Fixture | undefined;
let secondaryOrganizationId: string | undefined;
let postAuth: (request: Request) => Promise<Response>;
let restoreEnvironment: (() => void) | undefined;

beforeAll(async () => {
  
  if (process.env.DATABASE_URL) throw new Error("DATABASE_URL proibida nesta suíte.");
  
  connection = await createIsolatedConnectionPair();
  // O pool da aplicação precisa ter duas conexões disponíveis para as duas
  // requisições HTTP simultâneas; os PIDs do PostgreSQL serão monitorados via poolB.
  connection.clientA.release();
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

});

afterEach(async () => {

  const current = fixture;
  const secondaryId = secondaryOrganizationId;

  fixture = undefined;
  secondaryOrganizationId = undefined;

  const errors: unknown[] = [];

  if (secondaryId) {

    try {

      await db.transaction(async (tx) => {

        await tx.delete(schema.organization).where(eq(schema.organization.id, secondaryId));

      });

      const remaining = await db.select({ id: schema.organization.id }).from(schema.organization)
        .where(eq(schema.organization.id, secondaryId));

      if (remaining.length) throw new Error(`Organização secundária não foi removida: ${secondaryId}.`);

    } catch (error) {
      
      errors.push(error);
    
    }
  }

  if (current) {

    try {

      await current.cleanup();
      await assertFixtureRemoved(current);

    } catch (error) {
      
      errors.push(error);
    
    }
  }

  if (errors.length) throw new AggregateError(errors, "Falha na limpeza escopada da fixture de OWNER.");

});

afterAll(async () => {

  runtime.db = undefined;

  restoreEnvironment?.();

  if (connection) await connection.cleanup();

});

function requireFixture(): Fixture {

  if (!fixture) throw new Error("Fixture de concorrência não inicializada.");

  return fixture;

}

async function signIn(actor: Actor) {

  return signInAndGetCookie(postAuth, requireFixture().actors[actor]);

}

function leaveRequest(cookie: string, organizationId: string) {

  return postAuth(new Request("http://localhost:3000/api/auth/organization/leave", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:3000", cookie },
    body: JSON.stringify({ organizationId }),
  }));

}

function removeRequest(cookie: string, organizationId: string, memberId: string) {

  return postAuth(new Request("http://localhost:3000/api/auth/organization/remove-member", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:3000", cookie },
    body: JSON.stringify({ organizationId, memberIdOrEmail: memberId }),
  }));

}

async function ownerCount(organizationId: string) {

  const [row] = await db.select({ total: count() }).from(schema.member).where(and(
    eq(schema.member.organizationId, organizationId),
    sql`EXISTS (
      SELECT 1 FROM unnest(string_to_array(coalesce(${schema.member.role}, ''), ',')) AS role_token(value)
      WHERE lower(btrim(role_token.value)) = 'owner'
    )`,
  ));

  return row?.total ?? 0;

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

async function expectInvariantFailureAtCommit(statement: string, values: unknown[]) {

  const client = await connection!.poolB.connect();

  let failure: unknown;

  try {
    await client.query("BEGIN");
    await client.query(statement, values);

    try {

      await client.query("COMMIT");

    } catch (error) {

      failure = error;

      try { await client.query("ROLLBACK"); } catch { /* preserve the commit failure */ }

    }
  } catch (error) {

    failure = error;
    
    try { await client.query("ROLLBACK"); } catch { /* preserve the statement failure */ }

  } finally {

    client.release();

  }

  const postgresError = findPostgresError(failure);

  expect(postgresError).toEqual({ code: "23514", constraint: "organization_requires_owner" });

}

async function membershipSnapshot(organizationId: string) {

  return db.select().from(schema.member).where(eq(schema.member.organizationId, organizationId)).orderBy(asc(schema.member.id));

}

async function beginOwnerDeleteGate() {

  const client = connection!.clientB;

  await client.query("BEGIN");

  try {

    const pidResult = await client.query<{ pid: number }>("SELECT pg_backend_pid() AS pid");
    const { organizationId, actors } = requireFixture();
    const locked = await client.query<{ id: string }>(
      'SELECT id FROM "member" WHERE organization_id = $1 AND id = ANY($2::text[]) ORDER BY id FOR UPDATE',
      [organizationId, [actors.owner.memberId, actors.ownerPeer.memberId]],
    );
    
    if (locked.rowCount !== 2) throw new Error("Não foi possível bloquear as duas memberships OWNER da fixture.");

    return { client, pid: pidResult.rows[0]!.pid };

  } catch (error) {

    await client.query("ROLLBACK");

    throw error;

  }
}

type BlockedSession = { pid: number; state: string; wait_event_type: string | null; wait_event: string | null; blocking_pids: number[]; query: string };

async function waitForBlockedOwnerDeletes(blockingPid: number, expected: number, timeoutMs = 4000) {

  const deadline = Date.now() + timeoutMs;

  let latest: BlockedSession[] = [];

  while (Date.now() < deadline) {

    // Cada observação é uma consulta autocommit independente; pg_stat_clear_snapshot
    // evita reutilizar o snapshot estatístico da iteração anterior.
    await connection!.poolB.query("SELECT pg_stat_clear_snapshot()");

    const result = await connection!.poolB.query<BlockedSession>(
      `SELECT a.pid, a.state, a.wait_event_type, a.wait_event,
              pg_blocking_pids(a.pid) AS blocking_pids, a.query
         FROM pg_stat_activity a
        WHERE a.datname = current_database()
          AND a.wait_event_type = 'Lock'
          AND $1 = ANY(pg_blocking_pids(a.pid))
          AND a.query ~* 'delete[[:space:]]+from[[:space:]]+"?member"?'`,
      [blockingPid],
    );

    latest = result.rows;

    if (new Set(latest.map((row) => row.pid)).size >= expected) return latest;

    // Polling apenas permite observar a condição; a evidência é o lock reportado pelo PostgreSQL.
    await new Promise((resolve) => setTimeout(resolve, 20));

  }

  throw new Error(`PostgreSQL não mostrou ${expected} DELETEs de membership bloqueados pelo PID ${blockingPid}. Observado: ${JSON.stringify(latest)}`);

}

async function assertFixtureRemoved(current: Fixture) {

  const orgRows = await db.select({ id: schema.organization.id }).from(schema.organization).where(eq(schema.organization.id, current.organizationId));
  const memberRows = await db.select({ id: schema.member.id }).from(schema.member).where(eq(schema.member.organizationId, current.organizationId));
  const guardRows = await db.select({ id: schema.organizationOwnerGuard.organizationId }).from(schema.organizationOwnerGuard)
    .where(eq(schema.organizationOwnerGuard.organizationId, current.organizationId));
  const ids = Object.values(current.actors).map((actor) => actor.userId);
  const userRows = await db.select({ id: schema.user.id }).from(schema.user).where(inArray(schema.user.id, ids));
  const accountRows = await db.select({ id: schema.account.id }).from(schema.account).where(inArray(schema.account.userId, ids));
  const sessionRows = await db.select({ id: schema.session.id }).from(schema.session).where(inArray(schema.session.userId, ids));

  if (orgRows.length || memberRows.length || guardRows.length || userRows.length || accountRows.length || sessionRows.length) {

    throw new Error(`Resíduos na fixture de concorrência ${current.organizationId}.`);

  }
}

async function runControlledRace(scenario: RaceCase) {

  const current = requireFixture();
  const cookieA = await signIn("owner");
  const cookieB = await signIn("ownerPeer");
  const gate = await beginOwnerDeleteGate();
  const operations: Promise<Response>[] = [];

  let observationError: unknown;
  let releaseError: unknown;

  try {

    if (scenario === "two-leaves") {

      operations.push(leaveRequest(cookieA, current.organizationId), leaveRequest(cookieB, current.organizationId));

    } else if (scenario === "two-removals") {

      operations.push(
        removeRequest(cookieA, current.organizationId, current.actors.ownerPeer.memberId),
        removeRequest(cookieB, current.organizationId, current.actors.owner.memberId),
      );

    } else {

      // O OWNER A sai por leave e, em paralelo, usa sua autorização OWNER para remover B.
      operations.push(
        leaveRequest(cookieA, current.organizationId),
        removeRequest(cookieA, current.organizationId, current.actors.ownerPeer.memberId),
      );

    }

    await waitForBlockedOwnerDeletes(gate.pid, 2);
    
  } catch (error) {

    observationError = error;

  } finally {

    // A transação controladora não altera dados; ROLLBACK libera os dois row locks
    // inclusive quando a observação ou uma asserção falha.
    try { await gate.client.query("ROLLBACK"); } catch (error) { releaseError = error; }

  }

  const results = await Promise.allSettled(operations);

  if (observationError || releaseError) throw new AggregateError([observationError, releaseError].filter(Boolean), "Falha ao observar ou liberar o lock controlado.");

  const rejected = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");

  if (rejected.length) throw new AggregateError(rejected.map((result) => result.reason), "Uma requisição Better Auth falhou durante a corrida controlada.");

  return (results as PromiseFulfilledResult<Response>[]).map((result) => result.value);

}

describe("Better Auth: concorrência na proteção do último OWNER", () => {

  it.each([
    ["duas saídas voluntárias", "two-leaves"],
    ["duas remoções administrativas", "two-removals"],
    ["saída voluntária e remoção administrativa", "leave-and-remove"],
  ] as const)("serializa %s sem deixar a organização sem OWNER", async (_label, scenario) => {

    const { organizationId, actors } = requireFixture();

    expect(await ownerCount(organizationId)).toBe(2);

    const before = await membershipSnapshot(organizationId);
    const organizationBefore = await db.select().from(schema.organization).where(eq(schema.organization.id, organizationId));

    const responses = await runControlledRace(scenario);

    expect(responses).toHaveLength(2);

    const successfulResponses = responses.filter((response) => response.ok);
    const rejectedResponses = responses.filter((response) => !response.ok);

    // Once the guard migration is applied, one operation may commit and the
    // serialized one must fail at PostgreSQL commit-time validation.
    expect(successfulResponses.length).toBeGreaterThanOrEqual(1);
    expect(rejectedResponses.length).toBeGreaterThanOrEqual(1);

    for (const response of rejectedResponses) {

      expect(response.status).toBe(409);
      expect(response.headers.get("cache-control")).toContain("no-store");

      const body = await response.json();

      expect(body).toEqual({
        code: "ORGANIZATION_REQUIRES_OWNER",
        message: "A organização precisa manter pelo menos um proprietário.",
      });

      const internalDetails = JSON.stringify(body).replace("ORGANIZATION_REQUIRES_OWNER", "");

      expect(internalDetails).not.toMatch(/23514|organization_requires_owner|Failed query|stack/i);

    }

    const ownersRemaining = await ownerCount(organizationId);
    const after = await membershipSnapshot(organizationId);

    expect(await db.select().from(schema.organization).where(eq(schema.organization.id, organizationId))).toEqual(organizationBefore);
    expect(after.length).toBeLessThan(before.length);
    expect(ownersRemaining).toBeGreaterThanOrEqual(1);
    expect(after.find((row) => row.userId === actors.admin.userId)?.role).toBe("admin");
    expect(after.find((row) => row.userId === actors.member.userId)?.role).toBe("member");
    expect(await db.select({ id: schema.user.id }).from(schema.user).where(inArray(schema.user.id, [actors.owner.userId, actors.ownerPeer.userId]))).toHaveLength(2);
    expect(await db.select({ id: schema.account.id }).from(schema.account).where(inArray(schema.account.userId, [actors.owner.userId, actors.ownerPeer.userId]))).toHaveLength(2);
    expect(await db.select({ id: schema.session.id }).from(schema.session).where(inArray(schema.session.userId, [actors.owner.userId, actors.ownerPeer.userId]))).toHaveLength(2);
    
  }, 15000);

  it("rejeita isoladamente leave e remove-member quando resta somente um OWNER", async () => {

    const { organizationId, actors } = requireFixture();

    await db.delete(schema.member).where(and(eq(schema.member.organizationId, organizationId), eq(schema.member.userId, actors.ownerPeer.userId)));

    const cookie = await signIn("owner");
    const leaveResponse = await leaveRequest(cookie, organizationId);

    expect(leaveResponse.status).toBe(400);
    expect((await leaveResponse.json() as { message?: string }).message?.toLowerCase()).toContain("only owner");

    const removeResponse = await removeRequest(cookie, organizationId, actors.owner.memberId);

    expect(removeResponse.status).toBe(400);
    expect((await removeResponse.json() as { message?: string }).message?.toLowerCase()).toContain("only owner");
    expect(await ownerCount(organizationId)).toBe(1);
    expect(await membershipSnapshot(organizationId)).toEqual(expect.arrayContaining([
      expect.objectContaining({ userId: actors.owner.userId, role: "owner" }),
    ]));
    expect(await db.select({ id: schema.organization.id }).from(schema.organization).where(eq(schema.organization.id, organizationId))).toHaveLength(1);

  });

  it("rejeita DELETE direto do último OWNER no commit e preserva a membership", async () => {

    const { organizationId, actors } = requireFixture();

    await db.delete(schema.member).where(and(
      eq(schema.member.organizationId, organizationId),
      eq(schema.member.userId, actors.ownerPeer.userId),
    ));

    expect(await ownerCount(organizationId)).toBe(1);

    await expectInvariantFailureAtCommit(
      'DELETE FROM "member" WHERE organization_id = $1 AND user_id = $2',
      [organizationId, actors.owner.userId],
    );

    expect(await ownerCount(organizationId)).toBe(1);
    expect(await db.select().from(schema.member).where(and(
      eq(schema.member.organizationId, organizationId),
      eq(schema.member.userId, actors.owner.userId),
    ))).toEqual([expect.objectContaining({ role: "owner" })]);

  });

  it("rejeita UPDATE direto que remova o papel OWNER de todos os proprietários", async () => {

    const { organizationId, actors } = requireFixture();

    await expectInvariantFailureAtCommit(
      'UPDATE "member" SET role = $2 WHERE organization_id = $1 AND role = $3',
      [organizationId, "member", "owner"],
    );

    expect(await ownerCount(organizationId)).toBe(2);

    const memberships = await membershipSnapshot(organizationId);

    expect(memberships.filter((row) => row.role === "owner").map((row) => row.userId).sort())
      .toEqual([actors.owner.userId, actors.ownerPeer.userId].sort());
    expect(memberships.find((row) => row.userId === actors.admin.userId)?.role).toBe("admin");
    expect(memberships.find((row) => row.userId === actors.member.userId)?.role).toBe("member");

  });

  it("permite remover diretamente um OWNER enquanto outro permanece e preserva demais papéis", async () => {

    const { organizationId, actors } = requireFixture();
    const client = await connection!.poolB.connect();

    try {

      await client.query("BEGIN");
      await client.query('DELETE FROM "member" WHERE organization_id = $1 AND user_id = $2', [organizationId, actors.ownerPeer.userId]);
      await client.query("COMMIT");

    } catch (error) {

      try {
        
        await client.query("ROLLBACK");

      } catch {
        
        /* preserve original failure */ }
      throw error;

    } finally {

      client.release();

    }

    expect(await ownerCount(organizationId)).toBe(1);

    const memberships = await membershipSnapshot(organizationId);

    expect(memberships.find((row) => row.userId === actors.owner.userId)?.role).toBe("owner");
    expect(memberships.find((row) => row.userId === actors.admin.userId)?.role).toBe("admin");
    expect(memberships.find((row) => row.userId === actors.member.userId)?.role).toBe("member");
  });

  it("rejeita mover por DML os OWNERs da organização para outra e reverte a instrução", async () => {

    const { organizationId, actors } = requireFixture();
    const suffix = randomBytes(12).toString("hex");
    
    secondaryOrganizationId = `last-owner-destination-${suffix}`;

    await db.transaction(async (tx) => {

      await tx.insert(schema.organization).values({
        id: secondaryOrganizationId!,
        name: "Temporary OWNER destination",
        slug: `last-owner-destination-${suffix}`,
      });
      await tx.insert(schema.member).values({
        id: `last-owner-destination-member-${suffix}`,
        organizationId: secondaryOrganizationId!,
        userId: actors.target.userId,
        role: "owner",
      });
    });

    await expectInvariantFailureAtCommit(
      'UPDATE "member" SET organization_id = $2 WHERE organization_id = $1 AND role = $3',
      [organizationId, secondaryOrganizationId, "owner"],
    );

    expect(await ownerCount(organizationId)).toBe(2);
    expect(await db.select({ id: schema.member.id }).from(schema.member).where(and(
      eq(schema.member.organizationId, secondaryOrganizationId),
      inArray(schema.member.userId, [actors.owner.userId, actors.ownerPeer.userId]),
    ))).toHaveLength(0);

  });
});
