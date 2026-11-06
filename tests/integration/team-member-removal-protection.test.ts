import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { and, eq, inArray } from "drizzle-orm";
import * as schema from "@/db/schema";
import { createIsolatedConnectionPair, type IsolatedConnectionPair } from "../helpers/test-db";
import { seedTeamRbacFixture, signInAndGetCookie } from "../helpers/team-rbac-fixture";

const runtime = vi.hoisted(() => ({ db: undefined as NodePgDatabase<typeof schema> | undefined, cookie: "" }));

// Better Auth, Drizzle e PostgreSQL permanecem reais; getDb aponta somente ao pool isolado.
vi.mock("@/db", () => ({
  getDb: () => {
    if (!runtime.db) throw new Error("Banco isolado não inicializado.");
    return runtime.db;
  },
}));

// Apenas transporta cookies HTTP ao contexto usado por Server Actions no cenário de transferência.
vi.mock("next/headers", () => ({ headers: async () => new Headers(runtime.cookie ? { cookie: runtime.cookie } : {}) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

type Fixture = Awaited<ReturnType<typeof seedTeamRbacFixture>>;
type Entity = "client" | "deal" | "task";
type Actor = "owner" | "admin" | "member" | "target";
type Assignment = { entity: Entity; id: string; supportClientId?: string; deletedAt: Date | null; activityId: string; auditId: string };
type ExtraTenant = { organizationId: string; userIds: string[]; clientIds?: string[] };

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

  const route = await import("@/app/api/auth/[...all]/route");

  postAuth = route.POST;

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

  extraTenant = undefined;
  fixture = undefined;

  if (errors.length) throw new AggregateError(errors, "Falha ao limpar fixtures de remoção de membros.");

});

afterAll(async () => {

  runtime.cookie = "";
  runtime.db = undefined;

  restoreAuthEnvironment?.();

  if (connection) await connection.cleanup();

});

function requireFixture(): Fixture {

  if (!fixture) throw new Error("Fixture de remoção não inicializada.");

  return fixture;

}

async function signIn(actor: Actor): Promise<string> {

  const cookie = await signInAndGetCookie(postAuth, requireFixture().actors[actor]);

  runtime.cookie = cookie;

  return cookie;

}

async function removeMember(cookie: string, organizationId: string, memberId: string) {

  return postAuth(new Request("http://localhost:3000/api/auth/organization/remove-member", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:3000", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify({ organizationId, memberIdOrEmail: memberId }),
  }));

}

async function leaveMember(cookie: string, organizationId: string) {

  return postAuth(new Request("http://localhost:3000/api/auth/organization/leave", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:3000", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify({ organizationId }),
  }));

}

async function waitForBlockedMembershipDelete(blockingPid: number, timeoutMs = 6_000) {

  const deadline = Date.now() + timeoutMs;

  let latest: unknown[] = [];

  while (Date.now() < deadline) {

    await connection!.poolB.query("select pg_stat_clear_snapshot()");

    const result = await connection!.poolB.query<{ pid: number; query: string }>(
      `select pid, query
         from pg_catalog.pg_stat_activity
        where datname = current_database()
          and wait_event_type = 'Lock'
          and $1 = any(pg_blocking_pids(pid))
          and query ~* 'delete[[:space:]]+from[[:space:]]+"?member"?'`,
      [blockingPid],
    );

    latest = result.rows;

    if (result.rows.length > 0) return;

    await new Promise((resolve) => setTimeout(resolve, 20));

  }

  throw new Error(`A rota não chegou ao DELETE de membership bloqueado pelo PostgreSQL. Observado: ${JSON.stringify(latest)}`);

}

async function memberExists(organizationId: string, userId: string) {

  return (await db.select({ id: schema.member.id }).from(schema.member).where(and(
    eq(schema.member.organizationId, organizationId), eq(schema.member.userId, userId),
  ))).length === 1;

}

async function seedAssignment(entity: Entity, archived: boolean, targetUserId = requireFixture().actors.target.userId): Promise<Assignment> {

  const organizationId = requireFixture().organizationId;
  const deletedAt = archived ? new Date("2026-10-15T12:00:00.000Z") : null;

  return db.transaction(async (tx) => {

    let clientId: string | undefined;
    let dealId: string | undefined;

    if (entity === "client" || entity === "deal") {

      const [client] = await tx.insert(schema.clients).values({
        organizationId,
        kind: "company",
        name: `Removal protection ${entity} ${randomUUID()}`,
        ownerUserId: entity === "client" ? targetUserId : requireFixture().actors.owner.userId,
        ...(entity === "client" ? { deletedAt } : {}),
      }).returning({ id: schema.clients.id });
      clientId = client.id;

    }

    if (entity === "deal") {

      const [deal] = await tx.insert(schema.deals).values({
        organizationId,
        clientId: clientId!,
        title: `Removal protection deal ${randomUUID()}`,
        amount: "125.00",
        ownerUserId: targetUserId,
        deletedAt,
      }).returning({ id: schema.deals.id });
      dealId = deal.id;

    }

    if (entity === "task") {

      const [task] = await tx.insert(schema.tasks).values({
        organizationId,
        title: `Removal protection task ${randomUUID()}`,
        dueAt: new Date("2027-02-10T12:00:00.000Z"),
        assigneeUserId: targetUserId,
        deletedAt,
      }).returning({ id: schema.tasks.id });
      dealId = task.id;

    }

    const entityId = entity === "client" ? clientId! : dealId!;
    const [audit] = await tx.insert(schema.auditLogs).values({
      organizationId,
      actorUserId: targetUserId,
      action: "fixture_history",
      entityType: entity,
      entityId,
      details: JSON.stringify({ preserved: true }),
    }).returning({ id: schema.auditLogs.id });
    const [activity] = await tx.insert(schema.activities).values({
      organizationId,
      type: "note",
      subject: `Historical activity ${randomUUID()}`,
      actorUserId: targetUserId,
      ...(entity === "client" ? { clientId: entityId } : {}),
      ...(entity === "deal" ? { dealId: entityId } : {}),
      ...(entity === "task" ? { taskId: entityId } : {}),
    }).returning({ id: schema.activities.id });

    return {
      entity,
      id: entityId,
      supportClientId: entity === "deal" ? clientId : undefined,
      deletedAt,
      activityId: activity.id,
      auditId: audit.id
    };
  });
}

async function seedAllAssignments(targetUserId = requireFixture().actors.target.userId) {

  const created: Assignment[] = [];

  for (const entity of ["client", "deal", "task"] as const) {

    created.push(await seedAssignment(entity, entity !== "deal", targetUserId));

  }
  return created;
}

async function getAssignedRow(item: Assignment) {

  if (item.entity === "client") return (await db.select().from(schema.clients).where(eq(schema.clients.id, item.id)))[0];
  if (item.entity === "deal") return (await db.select().from(schema.deals).where(eq(schema.deals.id, item.id)))[0];

  return (await db.select().from(schema.tasks).where(eq(schema.tasks.id, item.id)))[0];

}

async function assignmentUserId(item: Assignment) {

  if (item.entity === "client") return (await db.select({id: schema.clients.ownerUserId }).from(schema.clients).where(eq(schema.clients.id, item.id)))[0]?.id;
  if (item.entity === "deal") return (await db.select({ id: schema.deals.ownerUserId }).from(schema.deals).where(eq(schema.deals.id, item.id)))[0]?.id;

  return (await db.select({ id: schema.tasks.assigneeUserId }).from(schema.tasks).where(eq(schema.tasks.id, item.id)))[0]?.id;

}

async function historyRows(items: Assignment[]) {

  const ids = items.map((item) => item.id);
  const organizationId = requireFixture().organizationId;
  const [audits, activities] = await Promise.all([
    db.select().from(schema.auditLogs).where(and(eq(schema.auditLogs.organizationId, organizationId), inArray(schema.auditLogs.entityId, ids))),
    db.select().from(schema.activities).where(and(eq(schema.activities.organizationId, organizationId), inArray(schema.activities.id, items.map((item) => item.activityId)))),
  ]);

  return { audits, activities };

}

async function expectProtectedRemoval(cookie: string, items: Assignment[]) {

  const target = requireFixture().actors.target;
  const organizationId = requireFixture().organizationId;
  const beforeRows = await Promise.all(items.map(getAssignedRow));

  for (let index = 0; index < items.length; index += 1) {

    expect(beforeRows[index]?.deletedAt).toEqual(items[index]?.deletedAt);

  }

  const beforeHistory = await historyRows(items);
  const response = await removeMember(cookie, organizationId, target.memberId);
  const body = await response.json() as { code?: string; message?: string };

  expect(response.status).toBe(409);
  expect(body.code).toBe("MEMBER_HAS_ASSIGNMENTS");
  expect(body.message).toContain("responsabilidades atribuídas");
  expect(await memberExists(organizationId, target.userId)).toBe(true);
  expect(await Promise.all(items.map(getAssignedRow))).toEqual(beforeRows);
  expect(await historyRows(items)).toEqual(beforeHistory);
  expect(JSON.stringify(body)).not.toContain("stack");

  return body;

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
    await tx.delete(schema.session).where(inArray(schema.session.userId, userIds));
    await tx.delete(schema.account).where(inArray(schema.account.userId, userIds));
    await tx.delete(schema.organization).where(eq(schema.organization.id, organizationId));
    await tx.delete(schema.user).where(inArray(schema.user.id, userIds));
  });

}

async function assertTenantRemoved(organizationId: string, userIds: string[]) {

  const [orgs, members, clients, contacts, deals, tasks, activities, audits, invitations, accounts, sessions, users] = await Promise.all([
    db.select({ id: schema.organization.id }).from(schema.organization).where(eq(schema.organization.id, organizationId)),
    db.select({ id: schema.member.id }).from(schema.member).where(eq(schema.member.organizationId, organizationId)),
    db.select({ id: schema.clients.id }).from(schema.clients).where(eq(schema.clients.organizationId, organizationId)),
    db.select({ id: schema.contacts.id }).from(schema.contacts).where(eq(schema.contacts.organizationId, organizationId)),
    db.select({ id: schema.deals.id }).from(schema.deals).where(eq(schema.deals.organizationId, organizationId)),
    db.select({ id: schema.tasks.id }).from(schema.tasks).where(eq(schema.tasks.organizationId, organizationId)),
    db.select({ id: schema.activities.id }).from(schema.activities).where(eq(schema.activities.organizationId, organizationId)),
    db.select({ id: schema.auditLogs.id }).from(schema.auditLogs).where(eq(schema.auditLogs.organizationId, organizationId)),
    db.select({ id: schema.invitation.id }).from(schema.invitation).where(eq(schema.invitation.organizationId, organizationId)),
    db.select({ id: schema.account.id }).from(schema.account).where(inArray(schema.account.userId, userIds)),
    db.select({ id: schema.session.id }).from(schema.session).where(inArray(schema.session.userId, userIds)),
    db.select({ id: schema.user.id }).from(schema.user).where(inArray(schema.user.id, userIds)),
  ]);
  if ([orgs, members, clients, contacts, deals, tasks, activities, audits, invitations, accounts, sessions, users].some((rows) => rows.length > 0)) {

    throw new Error(`Resíduos encontrados na fixture isolada ${organizationId}.`);
    
  }
}

describe("Better Auth: proteção HTTP da remoção administrativa de membros", () => {

  it.each([
    ["remoção administrativa", "remove-member"],
    ["saída voluntária", "leave"],
  ] as const)("converte a corrida M-01 em HTTP 409 na %s", async (_label, operationType) => {

    const current = requireFixture();
    const target = current.actors.target;
    const cookie = await signIn(operationType === "leave" ? "target" : "owner");
    const gate = connection!.clientB;

    let gateTransactionOpen = false;
    let pendingRequest: Promise<{ kind: "response"; response: Response } | { kind: "error"; error: unknown }> | undefined;

    try {

      await gate.query("begin");

      gateTransactionOpen = true;

      const gatePid = (await gate.query<{ pid: number }>("select pg_backend_pid() as pid")).rows[0]!.pid;
      const locked = await gate.query(
        "select id from public.member where organization_id=$1 and user_id=$2 for no key update",
        [current.organizationId, target.userId],
      );

      expect(locked.rowCount).toBe(1);

      const request = operationType === "leave"
        ? leaveMember(cookie, current.organizationId)
        : removeMember(cookie, current.organizationId, target.memberId);
      pendingRequest = request.then(
        (response) => ({ kind: "response" as const, response }),
        (error: unknown) => ({ kind: "error" as const, error }),
      );

      // Wait for the actual Better Auth DELETE to block on the held membership row.
      await waitForBlockedMembershipDelete(gatePid);

      const assignmentResult = await gate.query<{ id: string }>(
        "insert into public.clients (organization_id,kind,name,owner_user_id) values ($1,'company',$2,$3) returning id",
        [current.organizationId, `M-01 race ${randomUUID()}`, target.userId],
      );
      const assignment = assignmentResult.rows[0];

      await gate.query("commit");

      gateTransactionOpen = false;

      const result = await pendingRequest;

      if (result.kind === "error") throw result.error;

      expect(result.response.status).toBe(409);
      expect(result.response.headers.get("cache-control")).toBe("private, no-store");

      const body = await result.response.json();

      expect(body).toEqual({
        code: "MEMBER_HAS_ASSIGNMENTS",
        message: "Este membro ainda possui responsabilidades atribuídas. Transfira ou remova as atribuições antes de continuar.",
      });
      expect(JSON.stringify(body)).not.toMatch(/23001|member_assignment_fk|Failed query|stack|postgres/i);
      expect(await memberExists(current.organizationId, target.userId)).toBe(true);
      expect(await db.select({ id: schema.clients.id, ownerUserId: schema.clients.ownerUserId }).from(schema.clients)
        .where(eq(schema.clients.id, assignment!.id))).toEqual([{ id: assignment!.id, ownerUserId: target.userId }]);

    } finally {

      if (gateTransactionOpen) await gate.query("rollback").catch(() => undefined);

      // The request rejection is observed immediately and the request is settled before afterEach cleanup.
      if (pendingRequest) await pendingRequest;

    }
  }, 15_000);

  it.each([
    ["cliente ativo", "client", false],
    ["oportunidade ativa", "deal", false],
    ["tarefa ativa", "task", false],
    ["cliente arquivado", "client", true],
    ["oportunidade arquivada", "deal", true],
    ["tarefa arquivada", "task", true],
  ] as const)("bloqueia remoção quando há %s atribuído", async (_label, entity, archived) => {

    const assignment = await seedAssignment(entity, archived);
    const cookie = await signIn("owner");

    await expectProtectedRemoval(cookie, [assignment]);

  });

  it("bloqueia remoção quando há responsabilidades nas três entidades", async () => {

    const created = await seedAllAssignments();
    const cookie = await signIn("owner");
    const body = await expectProtectedRemoval(cookie, created);

    expect(body.message).toContain("clientes: 1");
    expect(body.message).toContain("oportunidades: 1");
    expect(body.message).toContain("tarefas: 1");

  });

  it("OWNER remove membro sem responsabilidades e mantém histórico de auditoria", async () => {

    const { organizationId, actors } = requireFixture();
    const [historicAudit] = await db.insert(schema.auditLogs).values({
      organizationId,
      actorUserId: actors.target.userId,
      action: "historic_member_event",
      entityType: "member",
      entityId: actors.target.memberId,
      details: "preserve-after-removal",
    }).returning({ id: schema.auditLogs.id });

    const cookie = await signIn("owner");
    const response = await removeMember(cookie, organizationId, actors.target.memberId);

    expect(response.status).toBe(200);
    expect(await memberExists(organizationId, actors.target.userId)).toBe(false);
    expect(await db.select({ id: schema.auditLogs.id }).from(schema.auditLogs).where(eq(schema.auditLogs.id, historicAudit.id))).toHaveLength(1);
    expect(await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.id, actors.target.userId))).toHaveLength(1);

  });

  it("ADMIN conserva a permissão member.delete configurada no Better Auth", async () => {

    const { organizationId, actors } = requireFixture();
    const cookie = await signIn("admin");
    const response = await removeMember(cookie, organizationId, actors.target.memberId);

    expect(response.status).toBe(200);
    expect(await memberExists(organizationId, actors.target.userId)).toBe(false);

  });

  it("rejeita MEMBER sem permissão e preserva a membership", async () => {

    const { organizationId, actors } = requireFixture();
    const cookie = await signIn("member");
    const response = await removeMember(cookie, organizationId, actors.target.memberId);

    expect(response.status).toBe(401);
    expect(await memberExists(organizationId, actors.target.userId)).toBe(true);

  });

  it("rejeita requisição sem sessão", async () => {

    const { organizationId, actors } = requireFixture();
    const response = await removeMember("", organizationId, actors.target.memberId);

    expect(response.status).toBe(401);
    expect(await memberExists(organizationId, actors.target.userId)).toBe(true);

  });

  it("rejeita sessão revogada pelo endpoint real de sign-out", async () => {

    const { organizationId, actors } = requireFixture();
    const cookie = await signIn("owner");
    const signOut = await postAuth(new Request("http://localhost:3000/api/auth/sign-out", {
      method: "POST", headers: { origin: "http://localhost:3000", cookie },
    }));

    expect(signOut.ok).toBe(true);

    const response = await removeMember(cookie, organizationId, actors.target.memberId);

    expect(response.status).toBe(401);
    expect(await memberExists(organizationId, actors.target.userId)).toBe(true);

  });

  it("usa a organização explicitamente autorizada mesmo quando difere da organização ativa", async () => {

    const { actors } = requireFixture();
    const organizationId = `removal-tenant-b-${randomUUID()}`;
    const targetUserId = `removal-target-b-${randomUUID()}`;
    const targetMemberId = `removal-member-b-${randomUUID()}`;

    extraTenant = { organizationId, userIds: [targetUserId] };

    await db.transaction(async (tx) => {

      await tx.insert(schema.organization).values({ id: organizationId, name: "Removal tenant B", slug: `removal-b-${randomUUID()}` });
      await tx.insert(schema.user).values({ id: targetUserId, name: "Tenant B target", email: `${randomUUID()}@example.test`, emailVerified: true });
      await tx.insert(schema.member).values([
        { id: `removal-owner-b-${randomUUID()}`, organizationId, userId: actors.owner.userId, role: "owner" },
        { id: targetMemberId, organizationId, userId: targetUserId, role: "member" },
      ]);

      const [tenantBClient] = await tx.insert(schema.clients).values({ organizationId, kind: "company", name: "Tenant B assignment", ownerUserId: targetUserId }).returning({ id: schema.clients.id });

      await tx.insert(schema.auditLogs).values({ organizationId, actorUserId: targetUserId, action: "fixture_history", entityType: "client", entityId: tenantBClient.id });

      extraTenant = { organizationId, userIds: [targetUserId], clientIds: [tenantBClient.id] };

    });

    const cookie = await signIn("owner");
    const response = await removeMember(cookie, organizationId, targetMemberId);
    const body = await response.json() as { code?: string; message?: string };

    expect(response.status).toBe(409);
    expect(body.code).toBe("MEMBER_HAS_ASSIGNMENTS");
    expect(body.message).toContain("clientes: 1");
    expect(await memberExists(organizationId, targetUserId)).toBe(true);
    expect(await db.select({ ownerUserId: schema.clients.ownerUserId }).from(schema.clients).where(eq(schema.clients.id, extraTenant!.clientIds![0]!)))
      .toEqual([{ ownerUserId: targetUserId }]);
    expect(await db.select({ id: schema.auditLogs.id }).from(schema.auditLogs).where(eq(schema.auditLogs.organizationId, organizationId))).toHaveLength(1);

  });

  it("não permite consultar nem remover membro de tenant sem membership do solicitante", async () => {

    const { organizationId: activeOrganizationId, actors } = requireFixture();
    const organizationId = `removal-unauthorized-b-${randomUUID()}`;
    const targetUserId = `removal-unauthorized-user-${randomUUID()}`;
    const targetMemberId = `removal-unauthorized-member-${randomUUID()}`;

    extraTenant = { organizationId, userIds: [targetUserId] };

    await db.transaction(async (tx) => {

      await tx.insert(schema.organization).values({ id: organizationId, name: "Unauthorized removal tenant", slug: `removal-unauth-${randomUUID()}` });
      await tx.insert(schema.user).values({ id: targetUserId, name: "Private target", email: `${randomUUID()}@example.test`, emailVerified: true });
      await tx.insert(schema.member).values([
        { id: `removal-owner-b-${randomUUID()}`, organizationId, userId: actors.ownerPeer.userId, role: "owner" },
        { id: targetMemberId, organizationId, userId: targetUserId, role: "member" },
      ]);

      const [privateClient] = await tx.insert(schema.clients).values({ organizationId, kind: "company", name: "Private assignment", ownerUserId: targetUserId }).returning({ id: schema.clients.id });

      await tx.insert(schema.auditLogs).values({ organizationId, actorUserId: targetUserId, action: "fixture_history", entityType: "client", entityId: privateClient.id });

      extraTenant = { organizationId, userIds: [targetUserId], clientIds: [privateClient.id] };

    });

    const cookie = await signIn("owner");

    await db.update(schema.session).set({ activeOrganizationId: activeOrganizationId }).where(eq(schema.session.userId, actors.owner.userId));

    const sessionResponse = await postAuth(new Request("http://localhost:3000/api/auth/get-session", { headers: { cookie } }));
    const sessionBody = await sessionResponse.json() as { session?: { activeOrganizationId?: string | null } };

    expect(sessionBody.session?.activeOrganizationId).toBe(activeOrganizationId);

    const response = await removeMember(cookie, organizationId, targetMemberId);
    const body = await response.text();

    expect(response.status).toBe(400);
    expect(body).not.toContain("MEMBER_HAS_ASSIGNMENTS");
    expect(body).not.toContain("Private assignment");
    expect(await memberExists(organizationId, targetUserId)).toBe(true);
    expect(await db.select({ ownerUserId: schema.clients.ownerUserId }).from(schema.clients).where(eq(schema.clients.id, extraTenant!.clientIds![0]!)))
      .toEqual([{ ownerUserId: targetUserId }]);
    expect(await db.select({ id: schema.auditLogs.id }).from(schema.auditLogs).where(eq(schema.auditLogs.organizationId, organizationId))).toHaveLength(1);

  });

  it("permite remover após transferência real de todas as atribuições", async () => {

    const { organizationId, actors } = requireFixture();
    const created = await seedAllAssignments();
    const cookie = await signIn("owner");
    const transfer = await transferMemberAssignments({ fromUserId: actors.target.userId, toUserId: actors.owner.userId });

    expect(transfer).toMatchObject({ ok: true, counts: { clients: 1, deals: 1, tasks: 1, total: 3 } });

    for (const item of created) expect(await assignmentUserId(item)).toBe(actors.owner.userId);

    const response = await removeMember(cookie, organizationId, actors.target.memberId);

    expect(response.status).toBe(200);
    expect(await memberExists(organizationId, actors.target.userId)).toBe(false);

    const auditRows = await db.select().from(schema.auditLogs).where(and(
      eq(schema.auditLogs.organizationId, organizationId), inArray(schema.auditLogs.entityId, created.map((item) => item.id)),
    ));

    expect(auditRows).toHaveLength(6);
    expect(auditRows.filter((row) => row.action === "reassign")).toHaveLength(3);
    expect(auditRows.filter((row) => row.action === "fixture_history")).toHaveLength(3);

  });
});
