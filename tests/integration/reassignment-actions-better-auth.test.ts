import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { and, eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { createIsolatedConnectionPair, type IsolatedConnectionPair } from "../helpers/test-db";
import { seedTeamRbacFixture, signInAndGetCookie } from "../helpers/team-rbac-fixture";

const runtime = vi.hoisted(() => ({
  db: undefined as NodePgDatabase<typeof schema> | undefined,
  cookie: "",
}));

// getDb continua retornando a conexão Drizzle/PostgreSQL real do fixture.
vi.mock("@/db", () => ({
  getDb: () => {

    if (!runtime.db) throw new Error("Banco isolado não inicializado.");

    return runtime.db;
    
  },
}));
// Apenas transporta o cookie HTTP ao contexto que Next normalmente fornece.
// A sessão, getSession, membership e decisão RBAC permanecem reais.
vi.mock("next/headers", () => ({
  headers: async () => new Headers(runtime.cookie ? { cookie: runtime.cookie } : {}),
}));
// Evita exigir o cache/request store do Next ao chamar a Server Action diretamente.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

type Fixture = Awaited<ReturnType<typeof seedTeamRbacFixture>>;
type Operation = "client" | "deal" | "task";
type ActorRole = "owner" | "admin" | "member";
type OperationRecord = { aId: string; bId: string; entityType: string };

const operations = ["client", "deal", "task"] as const;
const actors = ["admin", "member"] as const;

let connection: IsolatedConnectionPair;
let db: NodePgDatabase<typeof schema>;
let fixture: Fixture | undefined;
let organizationB = "";
let userB = "";
let userWithoutMembership = "";
let records: Record<Operation, OperationRecord>;
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

  const route = await import("@/app/api/auth/[...all]/route");

  postAuth = route.POST;

});

beforeEach(async () => {

  fixture = await seedTeamRbacFixture(db);
  organizationB = `real-auth-reassign-org-${randomUUID()}`;
  userB = `real-auth-reassign-user-${randomUUID()}`;
  userWithoutMembership = `real-auth-reassign-unmember-${randomUUID()}`;

  records = await db.transaction(async (tx) => {

    await tx.insert(schema.organization).values({ id: organizationB, name: "Reassignment tenant B", slug: `real-auth-${randomUUID()}` });
    await tx.insert(schema.user).values([
      { id: userB, name: "Tenant B user", email: `${randomUUID()}@example.test`, emailVerified: true },
      { id: userWithoutMembership, name: "No membership user", email: `${randomUUID()}@example.test`, emailVerified: true },
    ]);
    await tx.insert(schema.member).values({ id: `real-auth-member-${randomUUID()}`, organizationId: organizationB, userId: userB, role: "owner" });

    const [clientA] = await tx.insert(schema.clients).values({
      organizationId: fixture!.organizationId,
      kind: "company",
      name: "Real auth tenant A client",
      ownerUserId: fixture!.actors.owner.userId,
    }).returning({ id: schema.clients.id });
    const [dealA] = await tx.insert(schema.deals).values({
      organizationId: fixture!.organizationId,
      clientId: clientA.id,
      title: "Real auth tenant A deal",
      amount: "300.00",
      ownerUserId: fixture!.actors.owner.userId,
    }).returning({ id: schema.deals.id });
    const [taskA] = await tx.insert(schema.tasks).values({
      organizationId: fixture!.organizationId,
      title: "Real auth tenant A task",
      dueAt: new Date("2027-08-09T12:00:00Z"),
      assigneeUserId: fixture!.actors.owner.userId,
      clientId: clientA.id,
      dealId: dealA.id,
    }).returning({ id: schema.tasks.id });

    const [clientB] = await tx.insert(schema.clients).values({
      organizationId: organizationB,
      kind: "company",
      name: "Tenant B client secret",
      ownerUserId: userB,
    }).returning({ id: schema.clients.id });
    const [dealB] = await tx.insert(schema.deals).values({
      organizationId: organizationB,
      clientId: clientB.id,
      title: "Tenant B deal secret",
      amount: "800.00",
      ownerUserId: userB,
    }).returning({ id: schema.deals.id });
    const [taskB] = await tx.insert(schema.tasks).values({
      organizationId: organizationB,
      title: "Tenant B task secret",
      dueAt: new Date("2027-09-10T12:00:00Z"),
      assigneeUserId: userB,
      clientId: clientB.id,
      dealId: dealB.id,
    }).returning({ id: schema.tasks.id });

    return {
      client: { aId: clientA.id, bId: clientB.id, entityType: "client" },
      deal: { aId: dealA.id, bId: dealB.id, entityType: "deal" },
      task: { aId: taskA.id, bId: taskB.id, entityType: "task" },
    };
    
  });

  runtime.cookie = "";

});

afterEach(async () => {

  const errors: unknown[] = [];
  const fixtureToClean = fixture;

  runtime.cookie = "";

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
      const authResidue = await Promise.all([userB, userWithoutMembership].map(async (userId) => {

        const accounts = await db.select({ id: schema.account.id }).from(schema.account).where(eq(schema.account.userId, userId));
        const sessions = await db.select({ id: schema.session.id }).from(schema.session).where(eq(schema.session.userId, userId));

        return accounts.length + sessions.length;

      }));

      if (organizationResidue.length || userResidue.some((rows) => rows.length) || authResidue.some(Boolean)) throw new Error("Resíduos do tenant B após cleanup.");

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
      const authResidue = await Promise.all(userIds.map(async (userId) => {

        const accounts = await db.select({ id: schema.account.id }).from(schema.account).where(eq(schema.account.userId, userId));
        const sessions = await db.select({ id: schema.session.id }).from(schema.session).where(eq(schema.session.userId, userId));

        return accounts.length + sessions.length;

      }));
      const clientResidue = await db.select({ id: schema.clients.id }).from(schema.clients).where(eq(schema.clients.organizationId, orgId));
      const dealResidue = await db.select({ id: schema.deals.id }).from(schema.deals).where(eq(schema.deals.organizationId, orgId));
      const taskResidue = await db.select({ id: schema.tasks.id }).from(schema.tasks).where(eq(schema.tasks.organizationId, orgId));
      const activityResidue = await db.select({ id: schema.activities.id }).from(schema.activities).where(eq(schema.activities.organizationId, orgId));
      const auditResidue = await db.select({ id: schema.auditLogs.id }).from(schema.auditLogs).where(eq(schema.auditLogs.organizationId, orgId));
      const memberResidue = await db.select({ id: schema.member.id }).from(schema.member).where(eq(schema.member.organizationId, orgId));

      if (organizationResidue.length || userResidue.some((rows) => rows.length) || authResidue.some(Boolean) || clientResidue.length || dealResidue.length || taskResidue.length || activityResidue.length || auditResidue.length || memberResidue.length) {

        throw new Error(`Resíduos da fixture ${orgId} após cleanup.`);

      }

    } catch (error) {

      errors.push(error);

    }
  }

  fixture = undefined;

  if (errors.length) throw new AggregateError(errors, "Falha no cleanup dos testes Better Auth/reassignment.");

});

afterAll(async () => {

  runtime.cookie = "";
  runtime.db = undefined;

  restoreAuthEnvironment?.();

  if (connection) await connection.cleanup();

});

function requireFixture(): Fixture {

  if (!fixture) throw new Error("Fixture não inicializada.");

  return fixture;

}

function record(operation: Operation, tenant: "A" | "B" = "A"): string {

  return records[operation][tenant === "A" ? "aId" : "bId"];

}

function inputFor(operation: Operation, id: string, newUserId: string | null, organizationId?: string) {

  if (operation === "client") return { clientId: id, newUserId, ...(organizationId ? { organizationId } : {}) };
  if (operation === "deal") return { dealId: id, newUserId, ...(organizationId ? { organizationId } : {}) };

  return { taskId: id, newUserId, ...(organizationId ? { organizationId } : {}) };

}

async function runAction(operation: Operation, id: string, newUserId: string | null, organizationId?: string): Promise<unknown> {

  const input = inputFor(operation, id, newUserId, organizationId);

  if (operation === "client") {

    const { reassignClientOwner } = await import("@/modules/clients/actions");

    return reassignClientOwner(input);

  }

  if (operation === "deal") {

    const { reassignDealOwner } = await import("@/modules/deals/actions");

    return reassignDealOwner(input);

  }

  const { reassignTaskAssignee } = await import("@/modules/tasks/actions");

  return reassignTaskAssignee(input);

}

async function signIn(actor: ActorRole) {

  const cookie = await signInAndGetCookie(postAuth, requireFixture().actors[actor]);

  runtime.cookie = cookie;

  return cookie;

}

async function currentRecord(operation: Operation, id: string): Promise<unknown> {

  if (operation === "client") return (await db.select().from(schema.clients).where(eq(schema.clients.id, id)))[0];
  if (operation === "deal") return (await db.select().from(schema.deals).where(eq(schema.deals.id, id)))[0];

  return (await db.select().from(schema.tasks).where(eq(schema.tasks.id, id)))[0];

}

async function assignedUser(operation: Operation, id: string): Promise<string | null | undefined> {

  if (operation === "client") return (await db.select({ userId: schema.clients.ownerUserId }).from(schema.clients).where(eq(schema.clients.id, id)))[0]?.userId;
  if (operation === "deal") return (await db.select({ userId: schema.deals.ownerUserId }).from(schema.deals).where(eq(schema.deals.id, id)))[0]?.userId;

  return (await db.select({ userId: schema.tasks.assigneeUserId }).from(schema.tasks).where(eq(schema.tasks.id, id)))[0]?.userId;

}

async function auditRows(operation: Operation, id: string, organizationId = requireFixture().organizationId) {

  return db.select().from(schema.auditLogs).where(and(
    eq(schema.auditLogs.organizationId, organizationId),
    eq(schema.auditLogs.entityType, records[operation].entityType),
    eq(schema.auditLogs.entityId, id),
  ));

}

async function databaseSessionId(userId: string): Promise<string> {

  const rows = await db.select({ id: schema.session.id }).from(schema.session).where(eq(schema.session.userId, userId));

  if (rows.length !== 1) throw new Error(`Esperada uma sessão Better Auth para o usuário temporário; encontradas ${rows.length}.`);

  return rows[0].id;

}

describe("Server Actions de reatribuição com sessão e workspace Better Auth reais", () => {

  it.each(operations)("OWNER autenticado reatribui %s no próprio workspace", async (operation) => {

    const { actors: testActors, organizationId } = requireFixture();

    await signIn("owner");

    expect(await runAction(operation, record(operation), testActors.target.userId)).toMatchObject({ ok: true });
    expect(await assignedUser(operation, record(operation))).toBe(testActors.target.userId);
    expect(await auditRows(operation, record(operation))).toMatchObject([{
      organizationId,
      actorUserId: testActors.owner.userId,
      action: "reassign",
      entityType: records[operation].entityType,
      entityId: record(operation),
      details: JSON.stringify({ fromUserId: testActors.owner.userId, toUserId: testActors.target.userId }),
    }]);

  });

  it.each(actors.flatMap((actor) => operations.map((operation) => ({ actor, operation }))))(
    "$actor autenticado é rejeitado ao reatribuir $operation sem alterar registro nem auditar",
    async ({ actor, operation }) => {

      const before = await currentRecord(operation, record(operation));

      await signIn(actor);
      await expect(runAction(operation, record(operation), requireFixture().actors.target.userId)).rejects.toThrow();

      expect(await currentRecord(operation, record(operation))).toEqual(before);
      expect(await auditRows(operation, record(operation))).toHaveLength(0);

    },
  );

  it.each(operations)("sem sessão Better Auth não autoriza reatribuição de %s", async (operation) => {

    const before = await currentRecord(operation, record(operation));

    runtime.cookie = "";

    await expect(runAction(operation, record(operation), null)).rejects.toThrow();

    expect(await currentRecord(operation, record(operation))).toEqual(before);
    expect(await auditRows(operation, record(operation))).toHaveLength(0);

  });

  it.each(operations)("sessão revogada não autoriza reatribuição de %s", async (operation) => {

    const { actors: testActors } = requireFixture();
    const staleCookie = await signIn("owner");
    const revokeResponse = await postAuth(new Request("http://localhost:3000/api/auth/sign-out", {
      method: "POST",
      headers: { origin: "http://localhost:3000", cookie: staleCookie },
    }));

    expect(revokeResponse.ok).toBe(true);
    expect(await db.select({ id: schema.session.id }).from(schema.session).where(eq(schema.session.userId, testActors.owner.userId))).toHaveLength(0);

    runtime.cookie = staleCookie;

    const before = await currentRecord(operation, record(operation));

    await expect(runAction(operation, record(operation), testActors.target.userId)).rejects.toThrow();

    expect(await currentRecord(operation, record(operation))).toEqual(before);
    expect(await auditRows(operation, record(operation))).toHaveLength(0);

  });

  it.each(operations)("usuário removido do workspace não reatribui %s", async (operation) => {

    const { actors: testActors, organizationId } = requireFixture();

    await signIn("owner");

    // Com as FKs M-01, é necessário remover as atribuições antes da saída do
    // membro. Mantemos os registros para verificar que a ação não os altera.
    await db.update(schema.tasks).set({ assigneeUserId: null })
      .where(and(eq(schema.tasks.organizationId, organizationId), eq(schema.tasks.assigneeUserId, testActors.owner.userId)));
    await db.update(schema.deals).set({ ownerUserId: null })
      .where(and(eq(schema.deals.organizationId, organizationId), eq(schema.deals.ownerUserId, testActors.owner.userId)));
    await db.update(schema.clients).set({ ownerUserId: null })
      .where(and(eq(schema.clients.organizationId, organizationId), eq(schema.clients.ownerUserId, testActors.owner.userId)));
    await db.delete(schema.member).where(and(eq(schema.member.organizationId, organizationId), eq(schema.member.userId, testActors.owner.userId)));

    const before = await currentRecord(operation, record(operation));

    await expect(runAction(operation, record(operation), testActors.target.userId)).rejects.toThrow();

    expect(await currentRecord(operation, record(operation))).toEqual(before);
    expect(await auditRows(operation, record(operation))).toHaveLength(0);

  });

  it.each(operations)("activeOrganizationId adulterado não libera registro de outro tenant em %s", async (operation) => {

    const { actors: testActors } = requireFixture();

    await signIn("owner");

    const sessionId = await databaseSessionId(testActors.owner.userId);

    await db.update(schema.session).set({ activeOrganizationId: organizationB }).where(eq(schema.session.id, sessionId));

    const beforeA = await currentRecord(operation, record(operation, "A"));
    const beforeB = await currentRecord(operation, record(operation, "B"));

    await expect(runAction(operation, record(operation, "B"), testActors.target.userId, organizationB)).rejects.toThrow();

    expect(await currentRecord(operation, record(operation, "A"))).toEqual(beforeA);
    expect(await currentRecord(operation, record(operation, "B"))).toEqual(beforeB);
    expect(await auditRows(operation, record(operation, "A"))).toHaveLength(0);
    expect(await auditRows(operation, record(operation, "B"), organizationB)).toHaveLength(0);

  });

  it("rollback de reassignClientOwner persiste responsável anterior e nenhuma auditoria", async () => {

    const { actors: testActors } = requireFixture();

    await signIn("owner");

    const clientId = record("client");
    const before = await currentRecord("client", clientId);
    const realDb = runtime.db!;

    runtime.db = withAuditInsertFailure(db);

    let failure: unknown;

    try {

      await runAction("client", clientId, testActors.target.userId);

    } catch (error) {

      failure = error;

    } finally {

      runtime.db = realDb;

    }

    expect(findNotNullViolation(failure)).toMatchObject({ code: "23502", table: "audit_logs", column: "action" });
    expect(await currentRecord("client", clientId)).toEqual(before);
    expect(await auditRows("client", clientId)).toHaveLength(0);

  });
});

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
