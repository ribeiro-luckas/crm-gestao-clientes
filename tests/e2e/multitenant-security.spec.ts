import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { and, eq } from "drizzle-orm";
import * as schema from "../../src/db/schema";
import { createIsolatedConnectionPair, type IsolatedConnectionPair } from "../helpers/test-db";
import { seedTeamRbacFixture, type RbacActor } from "../helpers/team-rbac-fixture";
import { signInWithRateLimitRetry } from "../helpers/e2e-auth";

let connection: IsolatedConnectionPair;
let db: NodePgDatabase<typeof schema>;
let orgA: Awaited<ReturnType<typeof seedTeamRbacFixture>>;
let orgB: Awaited<ReturnType<typeof seedTeamRbacFixture>>;
let extraMembership: { organizationId: string; userId: string } | undefined;

test.beforeEach(async () => {
  connection = await createIsolatedConnectionPair();
  db = drizzle(connection.poolA, { schema });
  orgA = await seedTeamRbacFixture(db);
  orgB = await seedTeamRbacFixture(db);
  const [clientA] = await db.insert(schema.clients).values({ organizationId: orgA.organizationId, kind: "company", name: "A-Exclusive-Client", ownerUserId: orgA.actors.owner.userId }).returning({ id: schema.clients.id });
  const [clientB] = await db.insert(schema.clients).values({ organizationId: orgB.organizationId, kind: "company", name: "B-Exclusive-Client", ownerUserId: orgB.actors.owner.userId }).returning({ id: schema.clients.id });
  const [dealA] = await db.insert(schema.deals).values({ organizationId: orgA.organizationId, clientId: clientA.id, title: "A-Exclusive-Deal", amount: "1250.00", ownerUserId: orgA.actors.owner.userId }).returning({ id: schema.deals.id });
  const [dealB] = await db.insert(schema.deals).values({ organizationId: orgB.organizationId, clientId: clientB.id, title: "B-Exclusive-Deal", amount: "99800.00", ownerUserId: orgB.actors.owner.userId }).returning({ id: schema.deals.id });
  await db.insert(schema.tasks).values({ organizationId: orgA.organizationId, title: "A-Exclusive-Task", dueAt: new Date(Date.now() + 86400000), clientId: clientA.id, dealId: dealA.id });
  await db.insert(schema.tasks).values({ organizationId: orgB.organizationId, title: "B-Exclusive-Task", dueAt: new Date(Date.now() + 86400000), clientId: clientB.id, dealId: dealB.id });
});

test.afterEach(async () => {
  const cleanupErrors: unknown[] = [];
  const currentExtraMembership = extraMembership;
  extraMembership = undefined;
  try {
    if (currentExtraMembership) {
      try {
        await db.delete(schema.member).where(and(
          eq(schema.member.organizationId, currentExtraMembership.organizationId),
          eq(schema.member.userId, currentExtraMembership.userId),
        ));
        const remains = await db.select({ id: schema.member.id }).from(schema.member).where(and(
          eq(schema.member.organizationId, currentExtraMembership.organizationId),
          eq(schema.member.userId, currentExtraMembership.userId),
        ));
        if (remains.length) throw new Error("Membership cross-tenant da fixture persistiu após cleanup escopado.");
      } catch (error) { cleanupErrors.push(error); }
    }
    for (const fixture of [orgA, orgB]) {
      if (!fixture) continue;
      try {
        await db.transaction(async (tx) => {
          await tx.delete(schema.activities).where(eq(schema.activities.organizationId, fixture.organizationId));
          await tx.delete(schema.tasks).where(eq(schema.tasks.organizationId, fixture.organizationId));
          await tx.delete(schema.deals).where(eq(schema.deals.organizationId, fixture.organizationId));
          await tx.delete(schema.contacts).where(eq(schema.contacts.organizationId, fixture.organizationId));
          await tx.delete(schema.clients).where(eq(schema.clients.organizationId, fixture.organizationId));
          await tx.delete(schema.auditLogs).where(eq(schema.auditLogs.organizationId, fixture.organizationId));
        });
      } catch (error) { cleanupErrors.push(error); }
      try { await fixture.cleanup(); } catch (error) { cleanupErrors.push(error); }
    }
  } finally {
    if (connection) await connection.cleanup();
  }
  if (cleanupErrors.length) throw new AggregateError(cleanupErrors, "Falha na limpeza escopada das fixtures multi-tenant.");
});

async function signIn(request: APIRequestContext, actor: { email: string; password: string }) {
  const response = await signInWithRateLimitRetry(request, actor, "http://127.0.0.1:3100");
  expect(response.ok(), `login da fixture retornou HTTP ${response.status()}`).toBeTruthy();
}

async function openAs(page: Page, actor: RbacActor) {
  await signIn(page.request, orgA.actors[actor]);
}

for (const actor of ["owner", "admin"] as const) {
  test(`${actor} exporta somente dados do workspace ativo com cache privado`, async ({ page }) => {
    await openAs(page, actor);
    for (const [endpoint, mustContain, mustNotContain] of [
      ["/api/export/clients.csv", "A-Exclusive-Client", "B-Exclusive-Client"],
      ["/api/export/deals.csv", "A-Exclusive-Deal", "B-Exclusive-Deal"],
    ]) {
      const response = await page.request.get(endpoint);
      expect(response.status()).toBe(200);
      expect(response.headers()["cache-control"]).toContain("private");
      expect(response.headers()["cache-control"]).toContain("no-store");
      const csv = await response.text();
      expect(csv).toContain(mustContain);
      expect(csv).not.toContain(mustNotContain);
    }
  });
}

test("MEMBER e usuário sem sessão não exportam CSV", async ({ page }) => {
  await openAs(page, "member");
  for (const endpoint of ["/api/export/clients.csv", "/api/export/deals.csv"]) {
    const response = await page.request.get(endpoint, { maxRedirects: 0 });
    expect(response.status()).toBe(403);
    expect(response.headers()["content-type"] ?? "").not.toContain("text/csv");
    expect(response.headers()["cache-control"]).toContain("private, no-store");
    const body = await response.text();
    expect(body).not.toContain("A-Exclusive-");
    expect(body).not.toMatch(/stack|Error:|node_modules|\.ts:\d+/i);
  }
  expect(await db.select().from(schema.auditLogs).where(eq(schema.auditLogs.organizationId, orgA.organizationId))).toHaveLength(0);

  await page.context().clearCookies();
  for (const endpoint of ["/api/export/clients.csv", "/api/export/deals.csv"]) {
    const response = await page.request.get(endpoint, { maxRedirects: 0 });
    const status = response.status();
    const body = await response.text();
    expect(status, `Sem sessão: status original=${status}, location=${response.headers().location ?? ""}, content-type=${response.headers()["content-type"] ?? ""}, url=${response.url()}`).toBe(401);
    expect(response.headers()["content-type"] ?? "").not.toContain("text/csv");
    expect(response.headers()["cache-control"]).toContain("private, no-store");
    expect(body).not.toContain("A-Exclusive-");
    expect(body).not.toMatch(/stack|Error:|node_modules|\.ts:\d+/i);
  }
});

test("pesquisa e dashboard exibem somente registros do tenant A", async ({ page }) => {
  await openAs(page, "owner");
  await page.goto("/search?q=Exclusive");
  const clientsSection = page.locator("section").filter({ has: page.getByRole("heading", { name: "Clientes", exact: true }) });
  const dealsSection = page.locator("section").filter({ has: page.getByRole("heading", { name: "Oportunidades", exact: true }) });
  const tasksSection = page.locator("section").filter({ has: page.getByRole("heading", { name: "Tarefas", exact: true }) });
  await expect(clientsSection.getByRole("link", { name: /^A-Exclusive-Client/ })).toBeVisible();
  await expect(dealsSection.getByRole("link", { name: /^A-Exclusive-Deal/ })).toBeVisible();
  await expect(tasksSection.getByRole("link", { name: /^A-Exclusive-Task/ })).toBeVisible();
  await expect(page.getByText("B-Exclusive-Client")).toHaveCount(0);
  await expect(page.getByText("B-Exclusive-Deal")).toHaveCount(0);
  await expect(page.getByText("B-Exclusive-Task")).toHaveCount(0);
  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: /^A-Exclusive-Deal/ })).toBeVisible();
  await expect(page.getByText("B-Exclusive-Deal")).toHaveCount(0);
});

test("sign-out revoga somente a sessão atual e preserva a segunda sessão e membership", async ({ page, browser }) => {
  await openAs(page, "owner");
  const owner = orgA.actors.owner;
  const firstSessionResponse = await page.request.get("/api/auth/get-session");
  expect(firstSessionResponse.ok()).toBe(true);
  const firstSessionBody = await firstSessionResponse.json() as { session?: { id?: string }; user?: { id?: string } };
  expect(firstSessionBody.user?.id).toBe(owner.userId);
  expect(firstSessionBody.session?.id).toBeTruthy();
  const firstSessionId = firstSessionBody.session!.id!;
  const firstContextSessionCookies = await page.context().cookies("http://127.0.0.1:3100");
  expect(firstContextSessionCookies.some((cookie) => cookie.name.includes("session_token"))).toBe(true);
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Visão geral" })).toBeVisible();

  const secondContext = await browser.newContext({ baseURL: "http://127.0.0.1:3100" });
  try {
    const secondPage = await secondContext.newPage();
    await openAs(secondPage, "owner");
    const secondSessionResponse = await secondPage.request.get("/api/auth/get-session");
    expect(secondSessionResponse.ok()).toBe(true);
    const secondSessionBody = await secondSessionResponse.json() as { session?: { id?: string }; user?: { id?: string } };
    expect(secondSessionBody.user?.id).toBe(owner.userId);
    expect(secondSessionBody.session?.id).toBeTruthy();
    const secondSessionId = secondSessionBody.session!.id!;
    expect(secondSessionId).not.toBe(firstSessionId);

    const sessionsBefore = await db.select({ id: schema.session.id }).from(schema.session).where(eq(schema.session.userId, owner.userId));
    expect(new Set(sessionsBefore.map((session) => session.id))).toEqual(new Set([firstSessionId, secondSessionId]));
    const accountsBefore = await db.select({ id: schema.account.id }).from(schema.account).where(eq(schema.account.userId, owner.userId));
    const membershipsBefore = await db.select({ id: schema.member.id, organizationId: schema.member.organizationId, role: schema.member.role })
      .from(schema.member).where(eq(schema.member.userId, owner.userId));

    const signOutResponsePromise = page.waitForResponse((response) => {
      const requestUrl = new URL(response.url());
      return requestUrl.pathname === "/api/auth/sign-out" && response.request().method() === "POST";
    });
    await page.getByRole("button", { name: "Sair" }).click();
    const signOut = await signOutResponsePromise;
    const signOutBody = await signOut.json().catch(() => null) as { code?: unknown; message?: unknown } | null;
    const publicError = signOutBody && typeof signOutBody === "object"
      ? `; code=${typeof signOutBody.code === "string" ? signOutBody.code : "n/a"}; message=${typeof signOutBody.message === "string" ? signOutBody.message : "n/a"}`
      : "";
    expect(signOut.ok(), `sign-out respondeu HTTP ${signOut.status()}${publicError}`).toBe(true);
    expect(await db.select({ id: schema.session.id }).from(schema.session).where(eq(schema.session.userId, owner.userId)))
      .toEqual([{ id: secondSessionId }]);
    expect(await db.select({ id: schema.account.id }).from(schema.account).where(eq(schema.account.userId, owner.userId))).toEqual(accountsBefore);
    expect(await db.select({ id: schema.member.id, organizationId: schema.member.organizationId, role: schema.member.role })
      .from(schema.member).where(eq(schema.member.userId, owner.userId))).toEqual(membershipsBefore);

    const revokedSessionResponse = await page.request.get("/api/auth/get-session");
    expect(revokedSessionResponse.ok()).toBe(true);
    expect(await revokedSessionResponse.json()).toBeNull();
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
    const preservedSessionResponse = await secondPage.request.get("/api/auth/get-session");
    expect(preservedSessionResponse.ok()).toBe(true);
    const preservedSessionBody = await preservedSessionResponse.json() as { session?: { id?: string }; user?: { id?: string } };
    expect(preservedSessionBody.user?.id).toBe(owner.userId);
    expect(preservedSessionBody.session?.id).toBe(secondSessionId);
    await secondPage.goto("/dashboard");
    await expect(secondPage.getByRole("heading", { name: "Visão geral" })).toBeVisible();
  } finally {
    await secondContext.close();
  }
});

test("membership de MEMBER removida só em A mantém conta, OWNER e membership B sem acesso indevido a A", async ({ page, browser }) => {
  const actor = orgA.actors.member;
  const crossMemberId = `e2e-cross-org-${randomUUID()}`;
  await db.insert(schema.member).values({
    id: crossMemberId,
    organizationId: orgB.organizationId,
    userId: actor.userId,
    role: "member",
  });
  extraMembership = { organizationId: orgB.organizationId, userId: actor.userId };

  const ownerMembershipBefore = await db.select({ id: schema.member.id, role: schema.member.role })
    .from(schema.member).where(and(eq(schema.member.organizationId, orgA.organizationId), eq(schema.member.userId, orgA.actors.owner.userId)));
  expect(ownerMembershipBefore).toHaveLength(1);

  const [assignedClients, assignedDeals, assignedTasks] = await Promise.all([
    db.select({ id: schema.clients.id }).from(schema.clients).where(and(eq(schema.clients.organizationId, orgA.organizationId), eq(schema.clients.ownerUserId, actor.userId))),
    db.select({ id: schema.deals.id }).from(schema.deals).where(and(eq(schema.deals.organizationId, orgA.organizationId), eq(schema.deals.ownerUserId, actor.userId))),
    db.select({ id: schema.tasks.id }).from(schema.tasks).where(and(eq(schema.tasks.organizationId, orgA.organizationId), eq(schema.tasks.assigneeUserId, actor.userId))),
  ]);
  expect([assignedClients, assignedDeals, assignedTasks]).toEqual([[], [], []]);

  const tenantSnapshot = async (organizationId: string) => Promise.all([
    db.select({ id: schema.clients.id, ownerUserId: schema.clients.ownerUserId }).from(schema.clients).where(eq(schema.clients.organizationId, organizationId)),
    db.select({ id: schema.deals.id, clientId: schema.deals.clientId, ownerUserId: schema.deals.ownerUserId }).from(schema.deals).where(eq(schema.deals.organizationId, organizationId)),
    db.select({ id: schema.tasks.id, clientId: schema.tasks.clientId, dealId: schema.tasks.dealId, assigneeUserId: schema.tasks.assigneeUserId }).from(schema.tasks).where(eq(schema.tasks.organizationId, organizationId)),
  ]);
  const beforeA = await tenantSnapshot(orgA.organizationId);
  const beforeB = await tenantSnapshot(orgB.organizationId);
  const membershipsBBefore = await db.select({ id: schema.member.id, userId: schema.member.userId, role: schema.member.role })
    .from(schema.member).where(eq(schema.member.organizationId, orgB.organizationId));

  await signIn(page.request, actor);
  const sessionResponse = await page.request.get("/api/auth/get-session");
  expect(sessionResponse.ok()).toBe(true);
  const sessionBody = await sessionResponse.json() as { session?: { id?: string }; user?: { id?: string } };
  expect(sessionBody.user?.id).toBe(actor.userId);
  expect(sessionBody.session?.id).toBeTruthy();
  const memberSessionId = sessionBody.session!.id!;
  await db.update(schema.session).set({ activeOrganizationId: orgA.organizationId }).where(eq(schema.session.id, memberSessionId));

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Visão geral" })).toBeVisible();
  await expect(page.getByRole("link", { name: /A-Exclusive-Deal/ })).toBeVisible();
  await expect(page.getByText("B-Exclusive-Deal")).toHaveCount(0);

  const ownerContext = await browser.newContext({ baseURL: "http://127.0.0.1:3100" });
  try {
    const ownerPage = await ownerContext.newPage();
    await openAs(ownerPage, "owner");
    const removal = await ownerPage.request.post("/api/auth/organization/remove-member", {
      headers: { origin: "http://127.0.0.1:3100" },
      data: { organizationId: orgA.organizationId, memberIdOrEmail: actor.memberId },
    });
    expect(removal.status()).toBe(200);
  } finally {
    await ownerContext.close();
  }

  expect(await db.select({ id: schema.member.id }).from(schema.member)
    .where(and(eq(schema.member.organizationId, orgA.organizationId), eq(schema.member.userId, actor.userId))))
    .toHaveLength(0);
  expect(await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.id, actor.userId))).toHaveLength(1);
  expect(await db.select({ id: schema.account.id }).from(schema.account).where(eq(schema.account.userId, actor.userId))).toHaveLength(1);
  expect(await db.select({ id: schema.session.id }).from(schema.session).where(eq(schema.session.id, memberSessionId))).toHaveLength(1);
  expect(await db.select({ id: schema.member.id, role: schema.member.role }).from(schema.member)
    .where(and(eq(schema.member.organizationId, orgA.organizationId), eq(schema.member.userId, orgA.actors.owner.userId))))
    .toEqual(ownerMembershipBefore);
  expect(await db.select({ id: schema.member.id, userId: schema.member.userId, role: schema.member.role })
    .from(schema.member).where(eq(schema.member.organizationId, orgB.organizationId))).toEqual(membershipsBBefore);
  expect(await tenantSnapshot(orgA.organizationId)).toEqual(beforeA);
  expect(await tenantSnapshot(orgB.organizationId)).toEqual(beforeB);

  const sessionAfterRemoval = await page.request.get("/api/auth/get-session");
  expect(sessionAfterRemoval.ok()).toBe(true);
  const sessionAfterBody = await sessionAfterRemoval.json() as { session?: { id?: string }; user?: { id?: string } };
  expect(sessionAfterBody.user?.id).toBe(actor.userId);
  expect(sessionAfterBody.session?.id).toBe(memberSessionId);

  const [activeOrganizationAfterRemoval] = await db.select({ activeOrganizationId: schema.session.activeOrganizationId })
    .from(schema.session).where(eq(schema.session.id, memberSessionId));
  expect(activeOrganizationAfterRemoval?.activeOrganizationId).toBe(orgA.organizationId);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/workspace\/select\?reason=invalid/);
  const selectionRegion = page.getByRole("region", { name: "Escolha um workspace" });
  await expect(selectionRegion.getByRole("alert")).toContainText("workspace ativo não está mais disponível");
  await expect(page.getByText("A-Exclusive-Deal")).toHaveCount(0);
  await expect(page.getByText("B-Exclusive-Deal")).toHaveCount(0);
  const availableWorkspace = page.getByRole("button", { name: /RBAC Test Workspace.*Selecionar/ });
  await expect(availableWorkspace).toBeVisible();
  await availableWorkspace.click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("link", { name: /B-Exclusive-Deal/ })).toBeVisible();
  await expect(page.getByText("A-Exclusive-Deal")).toHaveCount(0);
  const [activeOrganizationAfterSelection] = await db.select({ activeOrganizationId: schema.session.activeOrganizationId })
    .from(schema.session).where(eq(schema.session.id, memberSessionId));
  expect(activeOrganizationAfterSelection?.activeOrganizationId).toBe(orgB.organizationId);

  const workspaceSwitcher = page.locator(".workspace-switcher");
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(workspaceSwitcher).toBeVisible();
  await expect(workspaceSwitcher).toHaveAccessibleName(/RBAC Test Workspace.*Trocar workspace/);
  await expect(workspaceSwitcher).toContainText("RBAC Test Workspace");

  await page.setViewportSize({ width: 390, height: 844 });
  const [clientA] = await db.select({ id: schema.clients.id }).from(schema.clients).where(eq(schema.clients.organizationId, orgA.organizationId));
  const privateClientResponse = await page.goto(`/clients/${clientA!.id}`);
  expect(privateClientResponse?.status()).toBe(404);
});

test("sessão expirada e identificador de sessão inválido não acessam o workspace", async ({ page }) => {
  await openAs(page, "owner");
  await db.update(schema.session).set({ expiresAt: new Date(Date.now() - 60_000) }).where(eq(schema.session.userId, orgA.actors.owner.userId));
  for (const endpoint of ["/api/export/clients.csv", "/api/export/deals.csv"]) {
    const response = await page.request.get(endpoint, { maxRedirects: 0 });
    expect(response.status()).toBe(401);
    expect(response.headers()["content-type"] ?? "").not.toContain("text/csv");
    expect(response.headers()["cache-control"]).toContain("private, no-store");
    expect(await response.text()).not.toMatch(/stack|Error:|node_modules|\.ts:\d+/i);
  }
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/login/);
  await page.context().clearCookies();
  await page.context().addCookies([{ name: "better-auth.session_token", value: "invalid-session-id", domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Lax" }]);
  for (const endpoint of ["/api/export/clients.csv", "/api/export/deals.csv"]) {
    const response = await page.request.get(endpoint, { maxRedirects: 0 });
    expect(response.status()).toBe(401);
    expect(response.headers()["content-type"] ?? "").not.toContain("text/csv");
    expect(response.headers()["cache-control"]).toContain("private, no-store");
    expect(await response.text()).not.toMatch(/stack|Error:|node_modules|\.ts:\d+/i);
  }
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/login/);
});

test("workspace ativo inválido exige nova seleção e não renderiza o fallback de A", async ({ page }) => {
  await openAs(page, "owner");
  await db.update(schema.organization).set({ name: "SEC-01C Workspace A" }).where(eq(schema.organization.id, orgA.organizationId));
  await db.update(schema.session).set({ activeOrganizationId: orgB.organizationId }).where(eq(schema.session.userId, orgA.actors.owner.userId));
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/workspace\/select\?reason=invalid/);
  await expect(page.getByRole("heading", { name: "Escolha um workspace" })).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("workspace ativo não está mais disponível");
  await expect(page.getByRole("button", { name: /SEC-01C Workspace A/ })).toBeVisible();
  await expect(page.getByText("A-Exclusive-Deal")).toHaveCount(0);
  await expect(page.getByText("B-Exclusive-Deal")).toHaveCount(0);
});

test("usuário multi-workspace escolhe e troca explicitamente, também em mobile", async ({ page }) => {
  const owner = orgA.actors.owner;
  await db.update(schema.organization).set({ name: "SEC-01C Workspace A" }).where(eq(schema.organization.id, orgA.organizationId));
  await db.update(schema.organization).set({ name: "SEC-01C Workspace B" }).where(eq(schema.organization.id, orgB.organizationId));
  const extraMemberId = `sec01c-cross-member-${randomUUID()}`;
  await db.insert(schema.member).values({
    id: extraMemberId,
    organizationId: orgB.organizationId,
    userId: owner.userId,
    role: "member",
  });
  extraMembership = { organizationId: orgB.organizationId, userId: owner.userId };

  await page.setViewportSize({ width: 390, height: 844 });
  await openAs(page, "owner");
  const [session] = await db.select({ id: schema.session.id }).from(schema.session).where(eq(schema.session.userId, owner.userId));
  expect(session).toBeDefined();
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/workspace\/select\?reason=required/);
  const workspaceButtons = page.getByRole("button", { name: /Selecionar/ });
  await expect(workspaceButtons).toHaveCount(2);
  await expect(page.getByRole("button", { name: /SEC-01C Workspace A/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /SEC-01C Workspace B/ })).toBeVisible();
  await expect(page.getByText("A-Exclusive-Client")).toHaveCount(0);
  await expect(page.getByText("B-Exclusive-Client")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: /SEC-01C Workspace A/ })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: /SEC-01C Workspace B/ })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("B-Exclusive-Deal")).toBeVisible();
  await expect(page.getByText("A-Exclusive-Deal")).toHaveCount(0);
  const [activeB] = await db.select({ activeOrganizationId: schema.session.activeOrganizationId })
    .from(schema.session).where(eq(schema.session.id, session!.id));
  expect(activeB?.activeOrganizationId).toBe(orgB.organizationId);

  await page.setViewportSize({ width: 1440, height: 900 });
  const workspaceSwitcher = page.locator(".workspace-switcher");
  await expect(workspaceSwitcher).toHaveAccessibleName(/SEC-01C Workspace B.*Trocar workspace/);
  await expect(workspaceSwitcher).toContainText("SEC-01C Workspace B");

  await page.goto("/settings");
  await page.getByRole("link", { name: "Trocar workspace", exact: true }).click();
  await page.getByRole("button", { name: /SEC-01C Workspace A/ }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("A-Exclusive-Deal")).toBeVisible();
  await expect(page.getByText("B-Exclusive-Deal")).toHaveCount(0);
  const [activeA] = await db.select({ activeOrganizationId: schema.session.activeOrganizationId })
    .from(schema.session).where(eq(schema.session.id, session!.id));
  expect(activeA?.activeOrganizationId).toBe(orgA.organizationId);
  await page.goto("/dashboard");
  await expect(workspaceSwitcher).toHaveAccessibleName(/SEC-01C Workspace A.*Trocar workspace/);
  await expect(workspaceSwitcher).toContainText("SEC-01C Workspace A");

  await db.update(schema.session).set({ activeOrganizationId: `sec01c-unrecognized-${randomUUID()}` })
    .where(eq(schema.session.id, session!.id));
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/workspace\/select\?reason=invalid/);
  await expect(page.getByText("A-Exclusive-Deal")).toHaveCount(0);
  await expect(page.getByText("B-Exclusive-Deal")).toHaveCount(0);
  await page.getByRole("button", { name: /SEC-01C Workspace B/ }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("B-Exclusive-Deal")).toBeVisible();
});

test("sessão de usuário com uma membership recupera seleção ausente sem ambiguidades", async ({ page }) => {
  await openAs(page, "owner");
  const [session] = await db.select({ id: schema.session.id }).from(schema.session)
    .where(eq(schema.session.userId, orgA.actors.owner.userId));
  expect(session).toBeDefined();
  await db.update(schema.session).set({ activeOrganizationId: null }).where(eq(schema.session.id, session!.id));

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Visão geral" })).toBeVisible();
  const [storedSession] = await db.select({ activeOrganizationId: schema.session.activeOrganizationId })
    .from(schema.session).where(eq(schema.session.id, session!.id));
  expect(storedSession?.activeOrganizationId).toBe(orgA.organizationId);
});

test("usuário sem membership não acessa o CRM e recebe orientação sem redirecionamento circular", async ({ page }) => {
  const actor = orgA.actors.target;
  await db.delete(schema.member).where(and(
    eq(schema.member.organizationId, orgA.organizationId),
    eq(schema.member.userId, actor.userId),
  ));
  await openAs(page, "target");
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/workspace\/select\?reason=no-workspaces/);
  await expect(page.getByRole("alert")).toContainText("Sua conta ainda não está vinculada a um workspace");
  await expect(page.getByText("Nenhum workspace está associado à sua conta.")).toBeVisible();
  await expect(page.getByText("A-Exclusive-Deal")).toHaveCount(0);
  await expect(page.getByText("B-Exclusive-Deal")).toHaveCount(0);
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login/);
});
