import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, inArray } from "drizzle-orm";
import * as schema from "@/db/schema";
import { createIsolatedConnectionPair, type IsolatedConnectionPair } from "../helpers/test-db";
import { signInAndGetCookie } from "../helpers/team-rbac-fixture";
import { createBootstrapOrganizationWithOwner } from "../../scripts/lib/bootstrap-organization";

const runtime = vi.hoisted(() => ({ db: undefined as NodePgDatabase<typeof schema> | undefined }));
vi.mock("@/db", () => ({
  getDb: () => {
    if (!runtime.db) throw new Error("Banco PostgreSQL isolado não inicializado.");
    return runtime.db;
  },
}));

type Fixture = {
  userId: string;
  email: string;
  password: string;
  baselineOrganizationId: string;
  baselineMemberId: string;
  organizationIds: string[];
};

let connection: IsolatedConnectionPair | undefined;
let db: NodePgDatabase<typeof schema>;
let fixture: Fixture | undefined;
let postAuth: (request: Request) => Promise<Response>;
let restoreEnvironment: (() => void) | undefined;

beforeAll(async () => {
  
  if (process.env.DATABASE_URL) throw new Error("DATABASE_URL proibida nesta suíte.");

  connection = await createIsolatedConnectionPair();

  connection.clientA.release();

  db = drizzle(connection.poolA, { schema });

  runtime.db = db;

  const oldSecret = process.env.BETTER_AUTH_SECRET;
  const oldUrl = process.env.BETTER_AUTH_URL;

  process.env.BETTER_AUTH_SECRET = randomUUID() + randomUUID();
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

  const suffix = randomUUID();
  const userId = `bootstrap-owner-${suffix}`;
  const baselineOrganizationId = `bootstrap-existing-org-${suffix}`;
  const baselineMemberId = `bootstrap-existing-member-${suffix}`;
  const password = `Test-${randomUUID()}-Bootstrap!`;
  const email = `bootstrap-${suffix}@example.test`;
  fixture = {
    userId,
    email,
    password,
    baselineOrganizationId,
    baselineMemberId,
    organizationIds: [baselineOrganizationId],
  };

  const passwordHash = await hashPassword(password);

  await db.transaction(async (tx) => {

    await tx.insert(schema.user).values({ id: userId, name: "Bootstrap fixture", email, emailVerified: true });

    await tx.insert(schema.account).values({
      id: `bootstrap-account-${suffix}`,
      accountId: userId,
      providerId: "credential",
      userId,
      password: passwordHash,
    });
    await tx.insert(schema.organization).values({
      id: baselineOrganizationId,
      name: "Existing bootstrap tenant",
      slug: `bootstrap-existing-${suffix}`,
    });
    await tx.insert(schema.member).values({
      id: baselineMemberId,
      organizationId: baselineOrganizationId,
      userId,
      role: "owner",
    });

  });
});

afterEach(async () => {

  const current = fixture;

  fixture = undefined;

  if (!current) return;

  const errors: unknown[] = [];

  try {

    await db.transaction(async (tx) => {

      await tx.delete(schema.organization).where(inArray(schema.organization.id, current.organizationIds));
      await tx.delete(schema.session).where(eq(schema.session.userId, current.userId));
      await tx.delete(schema.account).where(eq(schema.account.userId, current.userId));
      await tx.delete(schema.user).where(eq(schema.user.id, current.userId));

    });

    await assertFixtureRemoved(current);

  } catch (error) {

    errors.push(error);

  }

  if (errors.length) throw new AggregateError(errors, "Falha na limpeza escopada da fixture de criação de organização.");

});

afterAll(async () => {

  runtime.db = undefined;

  restoreEnvironment?.();

  if (connection) await connection.cleanup();

});

function requireFixture() {

  if (!fixture) throw new Error("Fixture de bootstrap não inicializada.");

  return fixture;

}

async function assertFixtureRemoved(current: Fixture) {

  const organizations = await db.select({ id: schema.organization.id }).from(schema.organization)
    .where(inArray(schema.organization.id, current.organizationIds));
  const memberships = await db.select({ id: schema.member.id }).from(schema.member)
    .where(inArray(schema.member.organizationId, current.organizationIds));
  const guards = await db.select({ id: schema.organizationOwnerGuard.organizationId }).from(schema.organizationOwnerGuard)
    .where(inArray(schema.organizationOwnerGuard.organizationId, current.organizationIds));
  const users = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.id, current.userId));
  const accounts = await db.select({ id: schema.account.id }).from(schema.account).where(eq(schema.account.userId, current.userId));
  const sessions = await db.select({ id: schema.session.id }).from(schema.session).where(eq(schema.session.userId, current.userId));

  if (organizations.length || memberships.length || guards.length || users.length || accounts.length || sessions.length) {

    throw new Error(`Resíduos da fixture de bootstrap ${current.baselineOrganizationId}.`);

  }
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

describe("criação transacional do workspace inicial", () => {

  it("confirma a organização e exatamente sua membership OWNER na mesma operação", async () => {

    const current = requireFixture();
    const organizationId = randomUUID();
    const memberId = randomUUID();
    const generatedIds = [organizationId, memberId];

    current.organizationIds.push(organizationId);

    const before = await db.select().from(schema.organization)
      .where(eq(schema.organization.id, current.baselineOrganizationId));
    const created = await createBootstrapOrganizationWithOwner({
      ownerUserId: current.userId,
      name: "Bootstrap atomic workspace",
      slug: `bootstrap-atomic-${randomUUID()}`,
    }, () => generatedIds.shift()!);

    expect(created.organization.id).toBe(organizationId);
    expect(created.membership).toMatchObject({
      id: memberId,
      organizationId,
      userId: current.userId,
      role: "owner",
    });
    expect(await db.select().from(schema.member).where(eq(schema.member.organizationId, organizationId)))
      .toEqual([expect.objectContaining({ id: memberId, userId: current.userId, role: "owner" })]);
    expect(await db.select({ id: schema.organizationOwnerGuard.organizationId }).from(schema.organizationOwnerGuard)
      .where(eq(schema.organizationOwnerGuard.organizationId, organizationId))).toHaveLength(1);
    expect(await db.select().from(schema.organization).where(eq(schema.organization.id, current.baselineOrganizationId)))
      .toEqual(before);
      
  });

  it("reverte organização e linha de guarda se o INSERT da membership falhar", async () => {

    const current = requireFixture();
    const organizationId = randomUUID();

    current.organizationIds.push(organizationId);

    let generated = 0;

    const createId = () => {

      generated += 1;

      return generated === 1 ? organizationId : current.baselineMemberId;

    };

    let thrown: unknown;

    try {

      await createBootstrapOrganizationWithOwner({

        ownerUserId: current.userId,
        name: "Should roll back",
        slug: `bootstrap-rollback-${randomUUID()}`,
      }, createId);

    } catch (error) {

      thrown = error;

    }

    expect(generated).toBe(2);
    expect(findPostgresError(thrown)).toMatchObject({ code: "23505", constraint: "member_pkey" });
    expect(await db.select({ id: schema.organization.id }).from(schema.organization)
      .where(eq(schema.organization.id, organizationId))).toHaveLength(0);
    expect(await db.select({ id: schema.organizationOwnerGuard.organizationId }).from(schema.organizationOwnerGuard)
      .where(eq(schema.organizationOwnerGuard.organizationId, organizationId))).toHaveLength(0);
    expect(await db.select().from(schema.member).where(eq(schema.member.id, current.baselineMemberId)))
      .toEqual([expect.objectContaining({ organizationId: current.baselineOrganizationId, userId: current.userId, role: "owner" })]);

  });

  it("falha com slug duplicado sem alterar a organização preexistente", async () => {

    const current = requireFixture();
    const [baseline] = await db.select().from(schema.organization)
      .where(eq(schema.organization.id, current.baselineOrganizationId));
    const attemptedOrganizationId = randomUUID();
    current.organizationIds.push(attemptedOrganizationId);

    let thrown: unknown;

    try {

      await createBootstrapOrganizationWithOwner({

        ownerUserId: current.userId,
        name: "Duplicate slug",
        slug: baseline!.slug,
      }, () => attemptedOrganizationId);

    } catch (error) {

      thrown = error;

    }

    expect(findPostgresError(thrown)).toMatchObject({ code: "23505" });
    expect(await db.select().from(schema.organization).where(eq(schema.organization.id, current.baselineOrganizationId)))
      .toEqual([baseline]);
    expect(await db.select({ id: schema.organization.id }).from(schema.organization)
      .where(eq(schema.organization.id, attemptedOrganizationId))).toHaveLength(0);
    expect(await db.select({ id: schema.organizationOwnerGuard.organizationId }).from(schema.organizationOwnerGuard)
      .where(eq(schema.organizationOwnerGuard.organizationId, attemptedOrganizationId))).toHaveLength(0);
  });

  it("não cria organização se o usuário OWNER não existir", async () => {

    const createId = vi.fn(() => randomUUID());

    await expect(createBootstrapOrganizationWithOwner({
      ownerUserId: `missing-user-${randomUUID()}`,
      name: "No owner user",
      slug: `bootstrap-no-user-${randomUUID()}`,
    }, createId)).rejects.toThrow("O usuário OWNER do bootstrap não existe.");

    expect(createId).not.toHaveBeenCalled();

  });

  it("mantém o endpoint Better Auth indisponível para criação por usuário autenticado", async () => {

    const current = requireFixture();
    const cookie = await signInAndGetCookie(postAuth, current);
    const slug = `user-create-denied-${randomUUID()}`;
    const response = await postAuth(new Request("http://localhost:3000/api/auth/organization/create", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:3000", cookie },
      body: JSON.stringify({ name: "Must remain disabled", slug }),
    }));

    expect(response.status).toBe(403);
    expect(await db.select({ id: schema.organization.id }).from(schema.organization)
      .where(eq(schema.organization.slug, slug))).toHaveLength(0);
    expect(await db.select({ id: schema.organization.id }).from(schema.organization)
      .where(eq(schema.organization.id, current.baselineOrganizationId))).toHaveLength(1);
  });

});
