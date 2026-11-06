import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { and, eq, sql } from "drizzle-orm";
import * as schema from "@/db/schema";
import { createIsolatedConnectionPair, type IsolatedConnectionPair } from "../helpers/test-db";
import { seedTeamRbacFixture } from "../helpers/team-rbac-fixture";

const runtime = vi.hoisted(() => ({ db: undefined as NodePgDatabase<typeof schema> | undefined, role: "owner", orgId: "", userId: "" }));

vi.mock("@/db", () => ({ getDb: () => {

  if (!runtime.db) throw new Error("Banco isolado não inicializado.");

  return runtime.db;

} }));
vi.mock("@/lib/workspace", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/workspace")>();
  const makeContext = (allowed: string[]) => {

    if (!allowed.includes(runtime.role)) throw new actual.WorkspaceAuthorizationError();

    return { organization: { id: runtime.orgId, name: "fixture" }, user: { id: runtime.userId, name: "fixture", email: "fixture@example.test" }, role: runtime.role };

  };

  return {
    ...actual,
    requireWorkspaceRole: async (allowed: string[]) => makeContext(allowed),
    requireApiWorkspaceRole: async (allowed: string[]) => makeContext(allowed),
  };
});

// A Server Action real precisa de executar; apenas o cache do Next requer o
// request store ausente neste teste de integração. Os demais exports preservam comportamento real.
vi.mock("next/cache", async (importOriginal) => ({
  ...await importOriginal<typeof import("next/cache")>(),
  revalidatePath: vi.fn(),
}));

let connection: IsolatedConnectionPair;
let db: NodePgDatabase<typeof schema>;
type TeamFixture = Awaited<ReturnType<typeof seedTeamRbacFixture>>;
let fixture: TeamFixture | undefined;
let orgB: string;
let userB: string;
let ids: { clientA: string; clientB: string; dealA: string; dealB: string; taskB: string; contactB: string };
let actions: typeof import("@/modules/clients/actions") & typeof import("@/modules/clients/contact-actions") & typeof import("@/modules/deals/actions") & typeof import("@/modules/tasks/actions") & typeof import("@/modules/activities/actions");

beforeAll(async () => {

  if (process.env.DATABASE_URL) throw new Error("Este teste não pode usar DATABASE_URL.");

  connection = await createIsolatedConnectionPair();
  db = drizzle(connection.poolA, { schema });

  runtime.db = db;
  process.env.BETTER_AUTH_SECRET = randomBytes(48).toString("base64url");
  process.env.BETTER_AUTH_URL = "http://localhost:3000";

  actions = { ...await import("@/modules/clients/actions"), ...await import("@/modules/clients/contact-actions"), ...await import("@/modules/deals/actions"), ...await import("@/modules/tasks/actions"), ...await import("@/modules/activities/actions") };
});

afterAll(async () => { runtime.db = undefined; if (connection) await connection.cleanup(); });

beforeEach(async () => {

  const createdFixture = await seedTeamRbacFixture(db);

  fixture = createdFixture;
  orgB = `tenant-b-${randomUUID()}`;
  userB = `tenant-user-b-${randomUUID()}`;

  // Keep the organization and its first OWNER in one committed unit for the
  // deferred organization-owner invariant planned for migration 0002.
  await db.transaction(async (tx) => {
    await tx.insert(schema.organization).values({ id: orgB, name: "Tenant B", slug: `tenant-b-${randomUUID()}` });
    await tx.insert(schema.user).values({ id: userB, name: "Tenant B user", email: `${randomUUID()}@example.test`, emailVerified: true });
    await tx.insert(schema.member).values({ id: `tenant-member-${randomUUID()}`, organizationId: orgB, userId: userB, role: "owner" });
  });

  runtime.orgId = createdFixture.organizationId; runtime.userId = createdFixture.actors.owner.userId; runtime.role = "owner";
  const [clientA] = await db.insert(schema.clients).values({ organizationId: createdFixture.organizationId, kind: "company", name: "A company", ownerUserId: createdFixture.actors.owner.userId }).returning({ id: schema.clients.id });
  const [clientB] = await db.insert(schema.clients).values({ organizationId: orgB, kind: "company", name: "B secret", ownerUserId: userB }).returning({ id: schema.clients.id });
  const [dealA] = await db.insert(schema.deals).values({ organizationId: createdFixture.organizationId, clientId: clientA.id, title: "A deal", ownerUserId: createdFixture.actors.owner.userId }).returning({ id: schema.deals.id });
  const [dealB] = await db.insert(schema.deals).values({ organizationId: orgB, clientId: clientB.id, title: "B secret deal", ownerUserId: userB }).returning({ id: schema.deals.id });
  const [taskB] = await db.insert(schema.tasks).values({ organizationId: orgB, title: "B secret task", dueAt: new Date(), assigneeUserId: userB, clientId: clientB.id, dealId: dealB.id }).returning({ id: schema.tasks.id });
  const [contactB] = await db.insert(schema.contacts).values({ organizationId: orgB, companyClientId: clientB.id, name: "B contact" }).returning({ id: schema.contacts.id });
  ids = { clientA: clientA.id, clientB: clientB.id, dealA: dealA.id, dealB: dealB.id, taskB: taskB.id, contactB: contactB.id };
});

afterEach(async () => {

  const currentFixture = fixture;
  const tenantBId = orgB;
  const tenantBUserId = userB;

  fixture = undefined;

  const cleanupErrors: unknown[] = [];

  let tenantBOrganizationRemoved = false;

  if (tenantBId) {

    try {

      // Delete all B-owned dependents, its membership, and the organization in
      // one PostgreSQL transaction. The deferred OWNER check sees B absent at
      // commit, so this is whole-fixture cleanup rather than last-owner removal.
      await db.transaction(async (tx) => {

        await tx.delete(schema.activities).where(eq(schema.activities.organizationId, tenantBId));
        await tx.delete(schema.tasks).where(eq(schema.tasks.organizationId, tenantBId));
        await tx.delete(schema.deals).where(eq(schema.deals.organizationId, tenantBId));
        await tx.delete(schema.contacts).where(eq(schema.contacts.organizationId, tenantBId));
        await tx.delete(schema.clients).where(eq(schema.clients.organizationId, tenantBId));
        await tx.delete(schema.auditLogs).where(eq(schema.auditLogs.organizationId, tenantBId));
        await tx.delete(schema.invitation).where(eq(schema.invitation.organizationId, tenantBId));
        await tx.delete(schema.member).where(eq(schema.member.organizationId, tenantBId));
        await tx.delete(schema.organization).where(eq(schema.organization.id, tenantBId));

      });

      tenantBOrganizationRemoved = true;

      const [organizations, memberships, clients, deals, tasks, contacts, activities, audits, invitations, guards] = await Promise.all([
        db.select({ id: schema.organization.id }).from(schema.organization).where(eq(schema.organization.id, tenantBId)),
        db.select({ id: schema.member.id }).from(schema.member).where(eq(schema.member.organizationId, tenantBId)),
        db.select({ id: schema.clients.id }).from(schema.clients).where(eq(schema.clients.organizationId, tenantBId)),
        db.select({ id: schema.deals.id }).from(schema.deals).where(eq(schema.deals.organizationId, tenantBId)),
        db.select({ id: schema.tasks.id }).from(schema.tasks).where(eq(schema.tasks.organizationId, tenantBId)),
        db.select({ id: schema.contacts.id }).from(schema.contacts).where(eq(schema.contacts.organizationId, tenantBId)),
        db.select({ id: schema.activities.id }).from(schema.activities).where(eq(schema.activities.organizationId, tenantBId)),
        db.select({ id: schema.auditLogs.id }).from(schema.auditLogs).where(eq(schema.auditLogs.organizationId, tenantBId)),
        db.select({ id: schema.invitation.id }).from(schema.invitation).where(eq(schema.invitation.organizationId, tenantBId)),
        db.select({ id: schema.organizationOwnerGuard.organizationId }).from(schema.organizationOwnerGuard)
          .where(eq(schema.organizationOwnerGuard.organizationId, tenantBId)),
      ]);

      expect([organizations, memberships, clients, deals, tasks, contacts, activities, audits, invitations, guards])
        .toEqual([[], [], [], [], [], [], [], [], [], []]);

    } catch (error) {

      cleanupErrors.push(error);

    }
  }

  let fixtureRemoved = false;

  if (currentFixture) {

    try {

      await currentFixture.cleanup();

      const [organizations, memberships] = await Promise.all([
        db.select({ id: schema.organization.id }).from(schema.organization)
          .where(eq(schema.organization.id, currentFixture.organizationId)),
        db.select({ id: schema.member.id }).from(schema.member)
          .where(eq(schema.member.organizationId, currentFixture.organizationId)),
      ]);

      expect([organizations, memberships]).toEqual([[], []]);

      fixtureRemoved = true;

    } catch (error) {

      cleanupErrors.push(error);

    }
  }

  if (tenantBUserId && tenantBOrganizationRemoved && fixtureRemoved) {

    try {

      await db.transaction(async (tx) => {

        await tx.delete(schema.account).where(eq(schema.account.userId, tenantBUserId));
        await tx.delete(schema.session).where(eq(schema.session.userId, tenantBUserId));
        await tx.delete(schema.user).where(eq(schema.user.id, tenantBUserId));

      });
      const [users, accounts, sessions] = await Promise.all([
        db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.id, tenantBUserId)),
        db.select({ id: schema.account.id }).from(schema.account).where(eq(schema.account.userId, tenantBUserId)),
        db.select({ id: schema.session.id }).from(schema.session).where(eq(schema.session.userId, tenantBUserId)),
      ]);

      expect([users, accounts, sessions]).toEqual([[], [], []]);

    } catch (error) {

      cleanupErrors.push(error);

    }
  }

  if (cleanupErrors.length) {

    throw new AggregateError(cleanupErrors, "Falha no cleanup transacional e escopado das fixtures multi-tenant.");

  }
});

function requireFixture(): TeamFixture {

  if (!fixture) throw new Error("Fixture multi-tenant não foi inicializada.");

  return fixture;

}

describe("isolamento multi-tenant por Server Actions e restrições PostgreSQL", () => {

  it("não lê nem altera cliente externo via ação e não cria auditoria da recusa", async () => {

    const currentFixture = requireFixture();
    const { updateClient } = actions;
    const result = await updateClient(ids.clientB, { kind: "company", name: "Invadido", status: "active" });

    expect(result.ok).toBe(false);
    expect((await db.select().from(schema.clients).where(eq(schema.clients.id, ids.clientB)))[0]?.name).toBe("B secret");
    expect(await db.select().from(schema.auditLogs).where(eq(schema.auditLogs.organizationId, currentFixture.organizationId))).toHaveLength(0);

  });

  it("nega alteração de oportunidade e status de tarefa de B", async () => {

    expect((await actions.updateDeal(ids.dealB, { clientId: ids.clientA, title: "hack", amount: "1", expectedCloseAt: "" })).ok).toBe(false);
    expect((await actions.setTaskStatus({ taskId: ids.taskB, status: "done" })).ok).toBe(false);
    expect((await db.select().from(schema.deals).where(eq(schema.deals.id, ids.dealB)))[0]?.title).toBe("B secret deal");
    expect((await db.select().from(schema.tasks).where(eq(schema.tasks.id, ids.taskB)))[0]?.status).toBe("todo");

  });

  it("bloqueia por ação e FK associação a cliente de outro tenant", async () => {

    const currentFixture = requireFixture();
    const contact = await actions.createContact({ companyClientId: ids.clientB, name: "intruso" });

    expect(contact.ok).toBe(false);

    await expect(db.insert(schema.deals).values({ organizationId: currentFixture.organizationId, clientId: ids.clientB, title: "cross" })).rejects.toThrow();
    await expect(db.insert(schema.contacts).values({ organizationId: currentFixture.organizationId, companyClientId: ids.clientB, name: "cross" })).rejects.toThrow();

  });

  it("bloqueia associações externas em atividade e tarefa pela aplicação e pelo banco", async () => {

    const currentFixture = requireFixture();

    expect((await actions.createActivity({ clientId: ids.clientB, type: "note", subject: "cross" })).ok).toBe(false);
    expect((await actions.createActivity({ dealId: ids.dealB, type: "note", subject: "cross" })).ok).toBe(false);
    expect((await actions.createTask({ title: "cross", priority: "normal", dueAt: new Date().toISOString(), clientId: ids.clientB })).ok).toBe(false);

    await expect(db.insert(schema.tasks).values({ organizationId: currentFixture.organizationId, title: "cross", dueAt: new Date(), clientId: ids.clientB })).rejects.toThrow();
    await expect(db.insert(schema.activities).values({ organizationId: currentFixture.organizationId, type: "note", subject: "cross", actorUserId: currentFixture.actors.owner.userId, clientId: ids.clientB })).rejects.toThrow();

  });
  it("rejeita M-01 no banco e mantém a Server Action vinculada ao usuário da sessão", async () => {

    const currentFixture = requireFixture();
    const [clientBefore] = await db.select({ id: schema.clients.id, ownerUserId: schema.clients.ownerUserId }).from(schema.clients)
      .where(and(eq(schema.clients.id, ids.clientA), eq(schema.clients.organizationId, currentFixture.organizationId)));
    const [tenantBBefore] = await db.select({ id: schema.clients.id, ownerUserId: schema.clients.ownerUserId }).from(schema.clients)
      .where(and(eq(schema.clients.id, ids.clientB), eq(schema.clients.organizationId, orgB)));
    
    let directError: unknown;

    try {

      await db.insert(schema.clients).values({ organizationId: currentFixture.organizationId, kind: "person", name: "M01 direct", ownerUserId: userB });

    } catch (error) {

      directError = error;

    }

    expect(findPostgresError(directError)).toEqual({ code: "23503", constraint: "clients_owner_member_assignment_fk" });
    expect(await db.select({ id: schema.clients.id }).from(schema.clients)
      .where(and(eq(schema.clients.organizationId, currentFixture.organizationId), eq(schema.clients.name, "M01 direct")))).toHaveLength(0);
    expect(await db.select({ id: schema.clients.id, ownerUserId: schema.clients.ownerUserId }).from(schema.clients)
      .where(and(eq(schema.clients.id, ids.clientA), eq(schema.clients.organizationId, currentFixture.organizationId)))).toEqual([clientBefore]);
    expect(await db.select({ id: schema.clients.id, ownerUserId: schema.clients.ownerUserId }).from(schema.clients)
      .where(and(eq(schema.clients.id, ids.clientB), eq(schema.clients.organizationId, orgB)))).toEqual([tenantBBefore]);

    const result = await actions.createClient({ kind: "person", name: "Action actor", status: "prospect", ownerUserId: userB });

    expect(result.ok).toBe(true);

    if (!result.ok || !result.id) throw new Error("A Server Action não criou o registro esperado.");

    const [stored] = await db.select().from(schema.clients).where(and(eq(schema.clients.id, result.id), eq(schema.clients.organizationId, currentFixture.organizationId)));

    expect(stored).toBeDefined();
    expect(stored?.ownerUserId).toBe(currentFixture.actors.owner.userId);
    expect(stored?.ownerUserId).not.toBe(userB);
    expect(await db.select().from(schema.clients).where(and(eq(schema.clients.id, result.id), eq(schema.clients.organizationId, orgB)))).toHaveLength(0);

  });

  it("rejeita atribuição após saída, preserva registros e mantém auditoria histórica do usuário", async () => {

    const currentFixture = requireFixture();
    const activeMemberId = currentFixture.actors.target.userId;
    const [activeMemberClient] = await db.insert(schema.clients).values({ organizationId: currentFixture.organizationId, kind: "person", name: "member active", ownerUserId: activeMemberId }).returning({ id: schema.clients.id });

    expect(activeMemberClient.id).toBeTruthy();

    await db.update(schema.clients).set({ ownerUserId: null })
      .where(and(eq(schema.clients.organizationId, currentFixture.organizationId), eq(schema.clients.id, activeMemberClient.id)));
    await db.delete(schema.member).where(and(eq(schema.member.organizationId, currentFixture.organizationId), eq(schema.member.userId, activeMemberId)));

    let removedAssignmentError: unknown;

    try {

      await db.insert(schema.clients).values({ organizationId: currentFixture.organizationId, kind: "person", name: "member removed", ownerUserId: activeMemberId });

    } catch (error) {

      removedAssignmentError = error;

    }

    expect(findPostgresError(removedAssignmentError)).toEqual({ code: "23503", constraint: "clients_owner_member_assignment_fk" });
    expect(await db.select({ id: schema.clients.id }).from(schema.clients)
      .where(and(eq(schema.clients.organizationId, currentFixture.organizationId), eq(schema.clients.name, "member removed")))).toHaveLength(0);
    expect(await db.select({ ownerUserId: schema.clients.ownerUserId }).from(schema.clients)
      .where(and(eq(schema.clients.organizationId, currentFixture.organizationId), eq(schema.clients.id, activeMemberClient.id))))
      .toEqual([{ ownerUserId: null }]);
    expect(await db.select({ ownerUserId: schema.clients.ownerUserId }).from(schema.clients)
      .where(and(eq(schema.clients.organizationId, orgB), eq(schema.clients.id, ids.clientB))))
      .toEqual([{ ownerUserId: userB }]);

    await db.insert(schema.auditLogs).values({ organizationId: currentFixture.organizationId, actorUserId: activeMemberId, action: "historical", entityType: "client", entityId: activeMemberClient.id });

    expect(await db.select().from(schema.auditLogs).where(and(eq(schema.auditLogs.organizationId, currentFixture.organizationId), eq(schema.auditLogs.actorUserId, activeMemberId)))).toHaveLength(1);
  });
  
  it("preserva a reprodução I-01 antes da FK e exige rejeição depois da instalação; mantém isolamento entre tenants", async () => {

    const currentFixture = requireFixture();
    const [second] = await db.insert(schema.clients).values({ organizationId: currentFixture.organizationId, kind: "company", name: "A2" }).returning({ id: schema.clients.id });
    const [inconsistentDeal] = await db.insert(schema.deals).values({ organizationId: currentFixture.organizationId, clientId: second.id, title: "A2 deal" }).returning({ id: schema.deals.id });
    const catalog = await db.execute(sql`
      select exists (
        select 1 from pg_catalog.pg_constraint
        where conrelid = 'public.tasks'::regclass
          and conname = 'tasks_deal_client_consistency_fk'
          and contype = 'f'
      ) as installed
    `);
    const integrityInstalled = Boolean((catalog.rows[0] as { installed?: boolean } | undefined)?.installed);

    let directInsertError: unknown;

    try {

      await db.insert(schema.tasks).values({ organizationId: currentFixture.organizationId, title: "I01 direct", dueAt: new Date(), clientId: ids.clientA, dealId: inconsistentDeal.id });

    } catch (error) {

      directInsertError = error;

    }

    if (integrityInstalled) {

      expect(findPostgresError(directInsertError)).toEqual({ code: "23503", constraint: "tasks_deal_client_consistency_fk" });
      expect(await db.select({ id: schema.tasks.id }).from(schema.tasks)
        .where(and(eq(schema.tasks.organizationId, currentFixture.organizationId), eq(schema.tasks.title, "I01 direct")))).toHaveLength(0);

    } else {

      expect(directInsertError).toBeUndefined();
      expect(await db.select({ id: schema.tasks.id }).from(schema.tasks)
        .where(and(eq(schema.tasks.organizationId, currentFixture.organizationId), eq(schema.tasks.title, "I01 direct")))).toHaveLength(1);

    }
    
    const taskAuditBefore = await db.select({ id: schema.auditLogs.id }).from(schema.auditLogs)
      .where(and(eq(schema.auditLogs.organizationId, currentFixture.organizationId), eq(schema.auditLogs.entityType, "task")));
    
      expect((await actions.createTask({ title: "I01 action", priority: "normal", dueAt: new Date().toISOString(), clientId: ids.clientA, dealId: inconsistentDeal.id })).ok).toBe(false);
    expect(await db.select({ id: schema.tasks.id }).from(schema.tasks)
      .where(and(eq(schema.tasks.organizationId, currentFixture.organizationId), eq(schema.tasks.title, "I01 action")))).toHaveLength(0);
    expect(await db.select({ id: schema.auditLogs.id }).from(schema.auditLogs)
      .where(and(eq(schema.auditLogs.organizationId, currentFixture.organizationId), eq(schema.auditLogs.entityType, "task")))).toEqual(taskAuditBefore);
    
      await expect(db.insert(schema.tasks).values({ organizationId: currentFixture.organizationId, title: "I01 cross tenant", dueAt: new Date(), clientId: ids.clientA, dealId: ids.dealB })).rejects.toThrow();
  });
  it("mapeia RESTRICT da I-01 sem mutação parcial e permite atualizar após reconciliar tarefas", async () => {

    const currentFixture = requireFixture();
    const constraint = await db.execute(sql`
      select convalidated as validated from pg_catalog.pg_constraint
      where conrelid = 'public.tasks'::regclass and conname = 'tasks_deal_client_consistency_fk'
    `);

    expect((constraint.rows[0] as { validated?: boolean } | undefined)?.validated).toBe(true);

    const [clientA2] = await db.insert(schema.clients).values({ organizationId: currentFixture.organizationId, kind: "company", name: "I01 replacement client" }).returning({ id: schema.clients.id });
    const [activeTask] = await db.insert(schema.tasks).values({
      organizationId: currentFixture.organizationId, title: "I01 linked active", dueAt: new Date(),
      clientId: ids.clientA, dealId: ids.dealA, assigneeUserId: currentFixture.actors.owner.userId,
    }).returning({ id: schema.tasks.id });
    const [archivedTask] = await db.insert(schema.tasks).values({
      organizationId: currentFixture.organizationId, title: "I01 linked archived", dueAt: new Date(),
      clientId: ids.clientA, dealId: ids.dealA, assigneeUserId: currentFixture.actors.owner.userId, deletedAt: new Date(),
    }).returning({ id: schema.tasks.id });

    const [dealBefore] = await db.select({ clientId: schema.deals.clientId, title: schema.deals.title }).from(schema.deals)
      .where(and(eq(schema.deals.id, ids.dealA), eq(schema.deals.organizationId, currentFixture.organizationId)));
    const tenantBBefore = await db.select({ deal: schema.deals.clientId, task: schema.tasks.clientId })
      .from(schema.deals).innerJoin(schema.tasks, eq(schema.tasks.dealId, schema.deals.id))
      .where(and(eq(schema.deals.id, ids.dealB), eq(schema.deals.organizationId, orgB), eq(schema.tasks.id, ids.taskB)));
    const auditBefore = await db.select({ id: schema.auditLogs.id }).from(schema.auditLogs)
      .where(and(eq(schema.auditLogs.organizationId, currentFixture.organizationId), eq(schema.auditLogs.entityType, "deal"), eq(schema.auditLogs.entityId, ids.dealA)));

    const rejected = await actions.updateDeal(ids.dealA, { clientId: clientA2.id, title: "must not commit", amount: "12.00", expectedCloseAt: "" });

    expect(rejected).toEqual({
      ok: false,
      code: "DEAL_HAS_LINKED_TASKS",
      message: "Não é possível alterar o cliente desta oportunidade enquanto houver tarefas vinculadas. Reconcilie as tarefas e tente novamente.",
    });
    expect(JSON.stringify(rejected)).not.toMatch(/23001|tasks_deal_client_consistency_fk|postgres|Failed query|stack/i);
    expect(await db.select({ clientId: schema.deals.clientId, title: schema.deals.title }).from(schema.deals).where(eq(schema.deals.id, ids.dealA)))
      .toEqual([dealBefore]);
    expect(await db.select({ id: schema.tasks.id, clientId: schema.tasks.clientId, deletedAt: schema.tasks.deletedAt }).from(schema.tasks)
      .where(sql`${schema.tasks.id} in (${activeTask.id}::uuid, ${archivedTask.id}::uuid)`))
      .toEqual(expect.arrayContaining([
        { id: activeTask.id, clientId: ids.clientA, deletedAt: null },
        { id: archivedTask.id, clientId: ids.clientA, deletedAt: expect.any(Date) },
      ]));
    expect(await db.select({ id: schema.auditLogs.id }).from(schema.auditLogs)
      .where(and(eq(schema.auditLogs.organizationId, currentFixture.organizationId), eq(schema.auditLogs.entityType, "deal"), eq(schema.auditLogs.entityId, ids.dealA))))
      .toEqual(auditBefore);
    expect(await db.select({ deal: schema.deals.clientId, task: schema.tasks.clientId })
      .from(schema.deals).innerJoin(schema.tasks, eq(schema.tasks.dealId, schema.deals.id))
      .where(and(eq(schema.deals.id, ids.dealB), eq(schema.deals.organizationId, orgB), eq(schema.tasks.id, ids.taskB))))
      .toEqual(tenantBBefore);

    // RESTRICT é imediato: desvincular permite alterar o deal; depois os pares válidos podem ser restabelecidos.
    await db.update(schema.tasks).set({ clientId: null }).where(sql`${schema.tasks.id} in (${activeTask.id}::uuid, ${archivedTask.id}::uuid)`);

    const accepted = await actions.updateDeal(ids.dealA, { clientId: clientA2.id, title: "updated after reconciliation", amount: "12.00", expectedCloseAt: "" });

    expect(accepted).toMatchObject({ ok: true, id: ids.dealA });

    await db.update(schema.tasks).set({ clientId: clientA2.id }).where(sql`${schema.tasks.id} in (${activeTask.id}::uuid, ${archivedTask.id}::uuid)`);

    expect(await db.select({ clientId: schema.deals.clientId }).from(schema.deals).where(eq(schema.deals.id, ids.dealA)))
      .toEqual([{ clientId: clientA2.id }]);
    expect(await db.select({ clientId: schema.tasks.clientId }).from(schema.tasks)
      .where(sql`${schema.tasks.id} in (${activeTask.id}::uuid, ${archivedTask.id}::uuid)`))
      .toEqual(expect.arrayContaining([{ clientId: clientA2.id }, { clientId: clientA2.id }]));
  });

  it("converte a corrida após a validação em conflito I-01 sem auditoria parcial", async () => {

    const currentFixture = requireFixture();
    const [clientA2] = await db.insert(schema.clients).values({ organizationId: currentFixture.organizationId, kind: "company", name: "I01 concurrent client" }).returning({ id: schema.clients.id });
    const [task] = await db.insert(schema.tasks).values({
      organizationId: currentFixture.organizationId, title: "I01 concurrent child", dueAt: new Date(),
      clientId: ids.clientA, dealId: ids.dealA, assigneeUserId: currentFixture.actors.owner.userId,
    }).returning({ id: schema.tasks.id });

    const blocker = connection.clientA;
    
    let blockerTransactionOpen = false;
    let actionResult: Promise<{ kind: "result"; value: Awaited<ReturnType<typeof actions.updateDeal>> } | { kind: "error"; error: unknown }> | undefined;

    try {

      await blocker.query("begin");

      blockerTransactionOpen = true;

      const blockerPid = (await blocker.query<{ pid: number }>("select pg_backend_pid() as pid")).rows[0]!.pid;

      await blocker.query("select id from public.tasks where id=$1 for update", [task.id]);

      actionResult = actions.updateDeal(ids.dealA, { clientId: clientA2.id, title: "concurrent update", amount: "12.00", expectedCloseAt: "" }).then(
        (value) => ({ kind: "result" as const, value }),
        (error: unknown) => ({ kind: "error" as const, error }),
      );
      
      await waitForBlockedDealUpdate(connection.poolB, blockerPid);
      await blocker.query("commit");

      blockerTransactionOpen = false;

      const outcome = await actionResult;

      expect(outcome.kind).toBe("result");

      if (outcome.kind === "result") expect(outcome.value).toMatchObject({ ok: false, code: "DEAL_HAS_LINKED_TASKS" });

      expect(await db.select({ clientId: schema.deals.clientId }).from(schema.deals).where(eq(schema.deals.id, ids.dealA)))
        .toEqual([{ clientId: ids.clientA }]);
      expect(await db.select({ clientId: schema.tasks.clientId }).from(schema.tasks).where(eq(schema.tasks.id, task.id)))
        .toEqual([{ clientId: ids.clientA }]);
      expect(await db.select({ id: schema.auditLogs.id }).from(schema.auditLogs)
        .where(and(eq(schema.auditLogs.organizationId, currentFixture.organizationId), eq(schema.auditLogs.entityType, "deal"), eq(schema.auditLogs.entityId, ids.dealA))))
        .toHaveLength(0);

    } finally {

      if (blockerTransactionOpen) await blocker.query("rollback").catch(() => undefined);

      if (actionResult) await actionResult;

    }
  }, 15_000);

  it("respeita o papel MEMBER na ação de exportação via política compartilhada", async () => {

    const currentFixture = requireFixture();

    runtime.role = "member";

    const { GET: exportClients } = await import("@/app/api/export/clients.csv/route");
    const response = await exportClients(new Request("http://localhost:3000/api/export/clients.csv"));

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(403);
    expect(response.headers.get("content-type")).not.toContain("text/csv");
    expect(await response.text()).not.toContain("B secret");
    expect(await db.select().from(schema.auditLogs).where(eq(schema.auditLogs.organizationId, currentFixture.organizationId))).toHaveLength(0);

  });
});

function findPostgresError(error: unknown): { code?: string; constraint?: string } | undefined {

  const seen = new Set<unknown>();

  let candidate: unknown = error;
  let fallback: { code?: string; constraint?: string } | undefined;

  while (candidate && typeof candidate === "object" && !seen.has(candidate)) {

    seen.add(candidate);

    const value = candidate as { code?: unknown; constraint?: unknown; cause?: unknown };

    if (typeof value.code === "string") {

      const found = {
        code: value.code,
        constraint: typeof value.constraint === "string" ? value.constraint : undefined,
      };

      if (found.constraint) return found;

      fallback ??= found;

    }

    candidate = value.cause;

  }

  return fallback;

}

async function waitForBlockedDealUpdate(pool: IsolatedConnectionPair["poolB"], blockerPid: number, timeoutMs = 5_000) {

  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {

    const waiting = await pool.query<{ pid: number }>(
      `select pid from pg_catalog.pg_stat_activity
       where datname = current_database() and state = 'active' and wait_event_type = 'Lock'
         and $1 = any(pg_blocking_pids(pid)) and query ~* '^update[[:space:]]+"deals"'`,
      [blockerPid],
    );

    if (waiting.rows.length > 0) return;

    await new Promise((resolve) => setTimeout(resolve, 20));

  }

  throw new Error("PostgreSQL não observou a Server Action bloqueada pela referência de tarefa concorrente.");

}
