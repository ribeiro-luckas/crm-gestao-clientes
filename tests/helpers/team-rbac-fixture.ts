import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { eq, inArray } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../../src/db/schema";

type TestDb = NodePgDatabase<typeof schema>;
export type RbacActor = "owner" | "admin" | "member" | "target" | "ownerPeer";

export async function seedTeamRbacFixture(db: TestDb) {
  
  const suffix = randomUUID();
  const organizationId = `rbac-org-${suffix}`;
  const actors: Record<RbacActor, { userId: string; email: string; password: string; memberId: string }> = {
    owner: actor("owner"), admin: actor("admin"), member: actor("member"),
    target: actor("target"), ownerPeer: actor("owner-peer"),
  };
  const rows = (Object.entries(actors) as [RbacActor, typeof actors.owner][]).map(([key, value]) => ({
    user: { id: value.userId, name: `RBAC ${key}`, email: value.email, emailVerified: true },
    account: { id: `account-${value.userId}`, accountId: value.userId, providerId: "credential", userId: value.userId, password: value.password },
    member: { id: value.memberId, organizationId, userId: value.userId, role: key === "owner" || key === "ownerPeer" ? "owner" : key === "admin" ? "admin" : "member" },
  }));

  const accounts = await Promise.all(rows.map(async (row) => ({ ...row.account, password: await hashPassword(row.account.password) })));

  await db.transaction(async (tx) => {

    await tx.insert(schema.organization).values({ id: organizationId, name: "RBAC Test Workspace", slug: `rbac-${suffix}` });
    await tx.insert(schema.user).values(rows.map((row) => row.user));
    await tx.insert(schema.account).values(accounts);
    await tx.insert(schema.member).values(rows.map((row) => row.member));

  });

  return {
    organizationId,
    actors,
    cleanup: async () => {

      const userIds = Object.values(actors).map((value) => value.userId);

      await db.transaction(async (tx) => {
        await tx.delete(schema.activities).where(eq(schema.activities.organizationId, organizationId));
        await tx.delete(schema.tasks).where(eq(schema.tasks.organizationId, organizationId));
        await tx.delete(schema.deals).where(eq(schema.deals.organizationId, organizationId));
        await tx.delete(schema.contacts).where(eq(schema.contacts.organizationId, organizationId));
        await tx.delete(schema.clients).where(eq(schema.clients.organizationId, organizationId));
        await tx.delete(schema.auditLogs).where(eq(schema.auditLogs.organizationId, organizationId));
        await tx.delete(schema.invitation).where(eq(schema.invitation.organizationId, organizationId));
        await tx.delete(schema.member).where(eq(schema.member.organizationId, organizationId));
        await tx.delete(schema.organization).where(eq(schema.organization.id, organizationId));
        await tx.delete(schema.account).where(inArray(schema.account.userId, userIds));
        await tx.delete(schema.session).where(inArray(schema.session.userId, userIds));
        await tx.delete(schema.user).where(inArray(schema.user.id, userIds));
      });
      
    },
  };

  function actor(name: string) {

    return { userId: `rbac-user-${name}-${suffix}`, email: `rbac-${name}-${suffix}@example.test`, password: `Test-${randomUUID()}-Rbac!`, memberId: `rbac-member-${name}-${suffix}` };

  }
}

export async function signInAndGetCookie(post: (request: Request) => Promise<Response>, actor: { email: string; password: string }) {

  const response = await post(new Request("http://localhost:3000/api/auth/sign-in/email", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:3000" },
    body: JSON.stringify({ email: actor.email, password: actor.password }),
  }));

  if (!response.ok) throw new Error(`Sessão de teste não criada (HTTP ${response.status}).`);

  const cookie = response.headers.getSetCookie().map((entry) => entry.split(";", 1)[0]).find((entry) => entry.startsWith("better-auth.session_token="));

  if (!cookie) throw new Error("Better Auth não retornou o cookie de sessão esperado.");

  return cookie;

}
