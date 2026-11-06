import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { and, eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { createIsolatedConnectionPair, type IsolatedConnectionPair } from "../helpers/test-db";
import { seedTeamRbacFixture } from "../helpers/team-rbac-fixture";

const state = vi.hoisted(() => ({ db: undefined as NodePgDatabase<typeof schema> | undefined, role: "owner", orgId: "", actorId: "" }));

vi.mock("@/db", () => ({ getDb: () => { if (!state.db) throw new Error("DB isolado não inicializado"); return state.db; } }));

// O contexto/role é simulado; consultas, locks, transações e FKs usam PostgreSQL real.
vi.mock("@/lib/workspace", () => ({ requireWorkspaceRole: async (allowed: string[]) => {
  if (!state.actorId || !allowed.includes(state.role)) throw new Error("Acesso negado");
  return { organization: { id: state.orgId }, user: { id: state.actorId }, role: state.role };
} }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

let connection: IsolatedConnectionPair;
let db: NodePgDatabase<typeof schema>;
let fixture: Awaited<ReturnType<typeof seedTeamRbacFixture>>;
let orgB: string, userB: string, noMembership: string, clientA: string, clientB: string;
let reassign: typeof import("@/modules/clients/actions").reassignClientOwner;

beforeAll(async () => {

  if (process.env.DATABASE_URL) throw new Error("DATABASE_URL proibida nesta suíte.");

  connection = await createIsolatedConnectionPair(); db = drizzle(connection.poolA, { schema }); state.db = db;

  ({ reassignClientOwner: reassign } = await import("@/modules/clients/actions"));

});

beforeEach(async () => {

  fixture = await seedTeamRbacFixture(db); orgB = `reassign-org-${randomUUID()}`; userB = `reassign-user-${randomUUID()}`; noMembership = `reassign-user-${randomUUID()}`;

  await db.transaction(async (tx) => {

    await tx.insert(schema.organization).values({ id: orgB, name: "B", slug: `reassign-${randomUUID()}` });

    await tx.insert(schema.user).values([{ id: userB, name: "B user", email: `${randomUUID()}@example.test` }, { id: noMembership, name: "No member", email: `${randomUUID()}@example.test` }]);

    await tx.insert(schema.member).values({ id: `member-${randomUUID()}`, organizationId: orgB, userId: userB, role: "owner" });

    const [a] = await tx.insert(schema.clients).values({ organizationId: fixture.organizationId, kind: "person", name: "Client A", ownerUserId: fixture.actors.owner.userId }).returning({ id: schema.clients.id });
    const [b] = await tx.insert(schema.clients).values({ organizationId: orgB, kind: "person", name: "Client B", ownerUserId: userB }).returning({ id: schema.clients.id }); clientA = a.id; clientB = b.id;
    
  });
  
  state.orgId = fixture.organizationId; state.actorId = fixture.actors.owner.userId; state.role = "owner";

});

afterEach(async () => {

  const errors: unknown[] = [];

  try { await db.transaction(async (tx) => {

    for (const id of [fixture.organizationId, orgB]) {

      await tx.delete(schema.activities).where(eq(schema.activities.organizationId, id)); await tx.delete(schema.tasks).where(eq(schema.tasks.organizationId, id));

      await tx.delete(schema.deals).where(eq(schema.deals.organizationId, id)); await tx.delete(schema.contacts).where(eq(schema.contacts.organizationId, id));

      await tx.delete(schema.clients).where(eq(schema.clients.organizationId, id)); await tx.delete(schema.auditLogs).where(eq(schema.auditLogs.organizationId, id));

      await tx.delete(schema.invitation).where(eq(schema.invitation.organizationId, id)); await tx.delete(schema.member).where(eq(schema.member.organizationId, id)); await tx.delete(schema.organization).where(eq(schema.organization.id, id));

    }

    await tx.delete(schema.user).where(eq(schema.user.id, userB)); await tx.delete(schema.user).where(eq(schema.user.id, noMembership));

  }); } catch (e) {
    
    errors.push(e);
  
  }

  try {
    
    await fixture.cleanup();
  
  } catch (e) {
    
    errors.push(e);
  
  }

  if (errors.length) throw new AggregateError(errors, "Falha no cleanup da fixture de reatribuição.");

});

afterAll(async () => { state.db = undefined; if (connection) await connection.cleanup(); });

const auditRows = () => db.select().from(schema.auditLogs).where(and(eq(schema.auditLogs.organizationId, fixture.organizationId), eq(schema.auditLogs.entityId, clientA), eq(schema.auditLogs.entityType, "client")));
const owner = async (id = clientA) => (await db.select({ id: schema.clients.ownerUserId }).from(schema.clients).where(eq(schema.clients.id, id)))[0]?.id;

describe("reassignClientOwner (workspace mockado; PostgreSQL real)", () => {

  it("OWNER reatribui a membro local e grava auditoria correta", async () => {

    expect(await reassign({ clientId: clientA, newUserId: fixture.actors.target.userId })).toMatchObject({ ok: true });
    expect(await owner()).toBe(fixture.actors.target.userId);
    expect(await auditRows()).toMatchObject([{ actorUserId: fixture.actors.owner.userId, action: "reassign", details: JSON.stringify({ fromUserId: fixture.actors.owner.userId, toUserId: fixture.actors.target.userId }) }]);

  });

  it.each(["admin", "member"])("nega papel %s", async (role) => { state.role = role; await expect(reassign({ clientId: clientA, newUserId: userB })).rejects.toThrow(); expect(await owner()).toBe(fixture.actors.owner.userId); expect(await auditRows()).toHaveLength(0); });

  it("nega contexto sem sessão mockado", async () => { state.actorId = ""; await expect(reassign({ clientId: clientA, newUserId: userB })).rejects.toThrow(); });

  it("desatribui e registra auditoria", async () => { await reassign({ clientId: clientA, newUserId: null }); expect(await owner()).toBeNull(); expect((await auditRows())[0]?.action).toBe("unassign"); });

  it("rejeita membro externo, usuário sem membership e inexistente", async () => { for (const id of [userB, noMembership, `missing-${randomUUID()}`]) expect(await reassign({ clientId: clientA, newUserId: id })).toMatchObject({ ok: false }); expect(await auditRows()).toHaveLength(0); });

  it("rejeita cliente externo, arquivado, UUID inválido e não audita no-op", async () => {

    expect(await reassign({ clientId: clientB, newUserId: fixture.actors.target.userId })).toMatchObject({ ok: false }); expect(await reassign({ clientId: "bad", newUserId: null })).toMatchObject({ ok: false });

    await db.update(schema.clients).set({ deletedAt: new Date() }).where(eq(schema.clients.id, clientA)); expect(await reassign({ clientId: clientA, newUserId: fixture.actors.target.userId })).toMatchObject({ ok: false });

    expect(await auditRows()).toHaveLength(0);

  });

  it("operação sem mudança não audita", async () => { await reassign({ clientId: clientA, newUserId: fixture.actors.owner.userId }); expect(await auditRows()).toHaveLength(0); });

  it("serializa duas reatribuições concorrentes com auditoria encadeada", async () => {

    await Promise.all([reassign({ clientId: clientA, newUserId: fixture.actors.target.userId }), reassign({ clientId: clientA, newUserId: fixture.actors.admin.userId })]);

    const rows = (await auditRows()).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()); expect(rows).toHaveLength(2);
    const first = JSON.parse(rows[0].details ?? "{}"); const second = JSON.parse(rows[1].details ?? "{}"); expect(second.fromUserId).toBe(first.toUserId); expect(await owner()).toBe(second.toUserId);

  });
});
