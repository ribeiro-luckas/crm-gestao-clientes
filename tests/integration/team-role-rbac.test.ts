import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { and, eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { member } from "@/db/schema/auth";
import { organizationRoles } from "@/lib/organization-access";
import { createIsolatedConnectionPair, type IsolatedConnectionPair } from "../helpers/test-db";
import { seedTeamRbacFixture, signInAndGetCookie } from "../helpers/team-rbac-fixture";

const runtime = vi.hoisted(() => ({ db: undefined as NodePgDatabase<typeof schema> | undefined }));

vi.mock("@/db", () => ({
  getDb: () => {
    if (!runtime.db) throw new Error("A conexão PostgreSQL isolada ainda não foi inicializada.");
    return runtime.db;
  },
}));

let connection: IsolatedConnectionPair;
let db: NodePgDatabase<typeof schema>;
let fixture: Awaited<ReturnType<typeof seedTeamRbacFixture>>;
let post: (request: Request) => Promise<Response>;

beforeAll(async () => {

  if (process.env.DATABASE_URL) throw new Error("Este teste não pode usar DATABASE_URL.");

  connection = await createIsolatedConnectionPair();
  db = drizzle(connection.poolA, { schema });

  runtime.db = db;

  process.env.BETTER_AUTH_SECRET = randomBytes(48).toString("base64url");
  process.env.BETTER_AUTH_URL = "http://localhost:3000";

  const route = await import("@/app/api/auth/[...all]/route");

  post = route.POST;

});

afterAll(async () => {

  runtime.db = undefined;

  if (connection) await connection.cleanup();

});

beforeEach(async () => {

  fixture = await seedTeamRbacFixture(db);

});

afterEach(async () => {

  if (fixture) await fixture.cleanup();

});

async function updateAs(actor: "owner" | "admin" | "member", target: "target" | "ownerPeer", role: string) {

  const cookie = await signInAndGetCookie(post, fixture.actors[actor]);

  return post(new Request("http://localhost:3000/api/auth/organization/update-member-role", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:3000", cookie },
    body: JSON.stringify({ organizationId: fixture.organizationId, memberId: fixture.actors[target].memberId, role }),
  }));

}

async function storedRole(target: "owner" | "target" | "ownerPeer") {

  const [row] = await db.select({ role: member.role }).from(member).where(and(
    eq(member.organizationId, fixture.organizationId), eq(member.userId, fixture.actors[target].userId),
  ));

  return row?.role;

}

describe("Better Auth Organization: RBAC de alteração de papel via handler HTTP real", () => {

  it("nega ADMIN com HTTP 403 e mantém o membro inalterado", async () => {

    const response = await updateAs("admin", "target", "admin");

    expect(response.status).toBe(403);
    expect(await storedRole("target")).toBe("member");

  });

  it("permite OWNER alterar outro membro e persiste a função correta", async () => {

    const response = await updateAs("owner", "target", "admin");

    expect(response.status).toBe(200);
    expect(await storedRole("target")).toBe("admin");
    expect(await storedRole("owner")).toBe("owner");

    const audits = await db.select({
      organizationId: schema.auditLogs.organizationId,
      actorUserId: schema.auditLogs.actorUserId,
      action: schema.auditLogs.action,
      entityType: schema.auditLogs.entityType,
      entityId: schema.auditLogs.entityId,
      details: schema.auditLogs.details,
    }).from(schema.auditLogs).where(and(
      eq(schema.auditLogs.organizationId, fixture.organizationId),
      eq(schema.auditLogs.entityType, "member"),
      eq(schema.auditLogs.entityId, fixture.actors.target.memberId),
    ));

    expect(audits).toEqual([{
      organizationId: fixture.organizationId,
      actorUserId: fixture.actors.owner.userId,
      action: "update",
      entityType: "member",
      entityId: fixture.actors.target.memberId,
      details: JSON.stringify({ from: "member", to: "admin" }),
    }]);

  });

  it("nega que OWNER altere a própria função sem modificar o banco", async () => {

    const cookie = await signInAndGetCookie(post, fixture.actors.owner);
    const response = await post(new Request("http://localhost:3000/api/auth/organization/update-member-role", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:3000", cookie },
      body: JSON.stringify({ organizationId: fixture.organizationId, memberId: fixture.actors.owner.memberId, role: "member" }),
    }));

    expect(response.status).toBe(403);
    expect(await storedRole("owner")).toBe("owner");

  });

  it("nega MEMBER com HTTP 403 e mantém o destino inalterado", async () => {

    const response = await updateAs("member", "target", "admin");

    expect(response.status).toBe(403);
    expect(await storedRole("target")).toBe("member");

  });

  it("mantém no papel ADMIN as permissões administrativas de equipe e convites", () => {

    expect(organizationRoles.admin.authorize({ team: ["create", "update", "delete"] }).success).toBe(true);
    expect(organizationRoles.admin.authorize({ invitation: ["create", "cancel"] }).success).toBe(true);
    expect(organizationRoles.admin.authorize({ member: ["update"] }).success).toBe(true);

  });

  it("impede que OWNER altere ou rebaixe outro OWNER", async () => {

    const response = await updateAs("owner", "ownerPeer", "member");

    expect(response.status).toBe(403);
    expect(await storedRole("ownerPeer")).toBe("owner");

  });

  it("impede que OWNER atribua o papel OWNER a outro membro", async () => {

    const response = await updateAs("owner", "target", "owner");

    expect(response.status).toBe(403);
    expect(await storedRole("target")).toBe("member");

  });
});
