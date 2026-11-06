import { expect, test, type Page } from "@playwright/test";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, inArray } from "drizzle-orm";
import * as schema from "../../src/db/schema";
import { createIsolatedConnectionPair, type IsolatedConnectionPair } from "../helpers/test-db";
import { seedTeamRbacFixture, type RbacActor } from "../helpers/team-rbac-fixture";
import { signInWithRateLimitRetry } from "../helpers/e2e-auth";

let connection: IsolatedConnectionPair;
let db: NodePgDatabase<typeof schema>;
let fixture: Awaited<ReturnType<typeof seedTeamRbacFixture>>;
let clientIds: string[] = [];
let dealId = "";
let taskId = "";
let archivedAt: Date;

async function waitForRequestResponse(request: import("@playwright/test").Request | undefined) {
  if (!request) return;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      request.response(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("A Server Action não respondeu após liberar a requisição interceptada.")), 10_000);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

test.beforeEach(async () => {
  connection = await createIsolatedConnectionPair();
  db = drizzle(connection.poolA, { schema });
  fixture = await seedTeamRbacFixture(db);
  archivedAt = new Date("2026-10-15T12:00:00.000Z");

  const [activeClient, archivedClient] = await db.insert(schema.clients).values([
    { organizationId: fixture.organizationId, kind: "company", name: "Transfer active client", ownerUserId: fixture.actors.member.userId },
    { organizationId: fixture.organizationId, kind: "company", name: "Transfer archived client", ownerUserId: fixture.actors.member.userId, deletedAt: archivedAt },
  ]).returning({ id: schema.clients.id });
  clientIds = [activeClient.id, archivedClient.id];
  const [deal] = await db.insert(schema.deals).values({
    organizationId: fixture.organizationId,
    clientId: activeClient.id,
    title: "Transfer opportunity",
    amount: "1250.00",
    ownerUserId: fixture.actors.member.userId,
  }).returning({ id: schema.deals.id });
  dealId = deal.id;
  const [task] = await db.insert(schema.tasks).values({
    organizationId: fixture.organizationId,
    title: "Transfer task",
    dueAt: new Date("2027-08-09T12:00:00.000Z"),
    clientId: activeClient.id,
    dealId: deal.id,
    assigneeUserId: fixture.actors.member.userId,
  }).returning({ id: schema.tasks.id });
  taskId = task.id;
});

test.afterEach(async () => {
  const errors: unknown[] = [];
  if (fixture) {
    try { await fixture.cleanup(); } catch (error) { errors.push(error); }
    try {
      const userIds = Object.values(fixture.actors).map((actor) => actor.userId);
      const residues = await Promise.all([
        db.select({ id: schema.organization.id }).from(schema.organization).where(eq(schema.organization.id, fixture.organizationId)),
        db.select({ id: schema.member.id }).from(schema.member).where(eq(schema.member.organizationId, fixture.organizationId)),
        db.select({ id: schema.invitation.id }).from(schema.invitation).where(eq(schema.invitation.organizationId, fixture.organizationId)),
        db.select({ id: schema.account.id }).from(schema.account).where(inArray(schema.account.userId, userIds)),
        db.select({ id: schema.session.id }).from(schema.session).where(inArray(schema.session.userId, userIds)),
        db.select({ id: schema.user.id }).from(schema.user).where(inArray(schema.user.id, userIds)),
        db.select({ id: schema.clients.id }).from(schema.clients).where(eq(schema.clients.organizationId, fixture.organizationId)),
        db.select({ id: schema.deals.id }).from(schema.deals).where(eq(schema.deals.organizationId, fixture.organizationId)),
        db.select({ id: schema.tasks.id }).from(schema.tasks).where(eq(schema.tasks.organizationId, fixture.organizationId)),
        db.select({ id: schema.activities.id }).from(schema.activities).where(eq(schema.activities.organizationId, fixture.organizationId)),
        db.select({ id: schema.auditLogs.id }).from(schema.auditLogs).where(eq(schema.auditLogs.organizationId, fixture.organizationId)),
      ]);
      if (residues.some((rows) => rows.length > 0)) throw new Error("Resíduos da fixture de transferência após cleanup.");
    } catch (error) {
      errors.push(error);
    }
  }
  if (connection) {
    for (const client of [connection.clientA, connection.clientB]) {
      try { client.release(); } catch (error) { errors.push(error); }
    }
    const poolResults = await Promise.allSettled([connection.poolA.end(), connection.poolB.end()]);
    for (const result of poolResults) if (result.status === "rejected") errors.push(result.reason);
  }
  clientIds = [];
  dealId = "";
  taskId = "";
  if (errors.length) throw new AggregateError(errors, "Falha na limpeza da fixture de transferência da equipe.");
});

async function openTeamAs(page: Page, actor: RbacActor) {
  const identity = fixture.actors[actor];
  const response = await signInWithRateLimitRetry(page.request, { email: identity.email, password: identity.password }, "http://127.0.0.1:3100");
  expect(response.ok(), `login da fixture ${actor} retornou HTTP ${response.status()}`).toBeTruthy();
  await page.goto("/team");
  await expect(page.getByRole("heading", { name: "Equipe", exact: true })).toBeVisible();
}

test("OWNER revisa, cancela e confirma a transferência com resultado persistido", async ({ page }) => {
  await openTeamAs(page, "owner");
  await expect(page.getByRole("heading", { name: "Transferir responsabilidades" })).toBeVisible();
  const source = page.getByLabel("Membro de origem");
  const destination = page.getByLabel("Novo responsável");
  await source.selectOption(fixture.actors.member.userId);
  await expect(page.getByText("3 ativos · 1 arquivados")).toBeVisible();
  await expect(page.getByText("Selecione um destino para continuar.", { exact: true })).toBeVisible();

  await destination.selectOption(fixture.actors.target.userId);
  await expect(page.getByText("Destino: RBAC target")).toBeVisible();
  const reviewButton = page.getByRole("button", { name: "Revisar transferência" });
  await reviewButton.click();
  const dialog = page.getByRole("dialog", { name: "Confirmar transferência" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("RBAC member");
  await expect(dialog).toContainText("RBAC target");
  await expect(dialog).toContainText("Os registros arquivados continuarão arquivados");

  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(reviewButton).toBeFocused();
  expect((await db.select({ ownerUserId: schema.clients.ownerUserId }).from(schema.clients).where(eq(schema.clients.id, clientIds[0])))[0].ownerUserId).toBe(fixture.actors.member.userId);

  await page.getByRole("button", { name: "Revisar transferência" }).click();
  const reopenedDialog = page.getByRole("dialog", { name: "Confirmar transferência" });
  const confirmButton = reopenedDialog.getByRole("button", { name: "Confirmar transferência" });
  await confirmButton.focus();
  await confirmButton.press("Enter");
  await expect(page.getByRole("status")).toContainText("Transferência concluída: 2 clientes, 1 oportunidade e 1 tarefa. Total: 4.");

  const clients = await db.select({ id: schema.clients.id, ownerUserId: schema.clients.ownerUserId, deletedAt: schema.clients.deletedAt }).from(schema.clients).where(eq(schema.clients.organizationId, fixture.organizationId));
  expect(clients).toHaveLength(2);
  expect(clients.every((client) => client.ownerUserId === fixture.actors.target.userId)).toBe(true);
  expect(clients.find((client) => client.deletedAt !== null)?.deletedAt?.getTime()).toBe(archivedAt.getTime());
  expect((await db.select({ ownerUserId: schema.deals.ownerUserId }).from(schema.deals).where(eq(schema.deals.id, dealId)))[0].ownerUserId).toBe(fixture.actors.target.userId);
  expect((await db.select({ assigneeUserId: schema.tasks.assigneeUserId }).from(schema.tasks).where(eq(schema.tasks.id, taskId)))[0].assigneeUserId).toBe(fixture.actors.target.userId);
  await expect(page.getByRole("row").filter({ hasText: "RBAC target" }).locator(".responsibility-count--total")).toHaveText("4");
});

test("desabilita confirmação enquanto a requisição está em andamento", async ({ page }) => {
  await openTeamAs(page, "owner");
  await page.getByLabel("Membro de origem").selectOption(fixture.actors.member.userId);
  await page.getByLabel("Novo responsável").selectOption(fixture.actors.target.userId);
  await page.getByRole("button", { name: "Revisar transferência" }).click();

  let releaseRequest = () => {};
  const requestGate = new Promise<void>((resolve) => { releaseRequest = resolve; });
  let actionRequestCount = 0;
  let actionRequest: import("@playwright/test").Request | undefined;
  const actionRequestSeen = page.waitForRequest(
    (request) => request.method() === "POST" && Boolean(request.headers()["next-action"]),
    { timeout: 5_000 },
  );
  await page.route("**/team**", async (route) => {
    const request = route.request();
    if (request.method() === "POST" && request.headers()["next-action"]) {
      actionRequestCount += 1;
      actionRequest = request;
      await requestGate;
    }
    await route.continue();
  });

  try {
    const dialog = page.getByRole("dialog", { name: "Confirmar transferência" });
    const confirm = dialog.getByRole("button", { name: "Confirmar transferência" });
    await confirm.click();
    actionRequest = await actionRequestSeen;
    const pendingButton = dialog.getByRole("button", { name: "Transferindo…", exact: true });
    await expect(pendingButton).toBeDisabled();
    await expect(pendingButton).toHaveText("Transferindo…");
    expect(actionRequestCount).toBe(1);
  } finally {
    releaseRequest();
    try {
      await waitForRequestResponse(actionRequest);
    } finally {
      await page.unroute("**/team**");
    }
  }
  await expect(page.getByRole("status")).toContainText("Total: 4.");
});

test("OWNER pode deixar atribuições sem responsável", async ({ page }) => {
  await openTeamAs(page, "owner");
  await page.getByLabel("Membro de origem").selectOption(fixture.actors.member.userId);
  await page.getByLabel("Novo responsável").selectOption("__unassigned__");
  await page.getByRole("button", { name: "Revisar transferência" }).click();
  const dialog = page.getByRole("dialog", { name: "Confirmar transferência" });
  await expect(dialog).toContainText("Sem responsável");
  await dialog.getByRole("button", { name: "Confirmar transferência" }).click();
  await expect(page.getByRole("status")).toContainText("Total: 4.");

  expect((await db.select({ ownerUserId: schema.clients.ownerUserId }).from(schema.clients).where(eq(schema.clients.organizationId, fixture.organizationId))).every((row) => row.ownerUserId === null)).toBe(true);
  expect((await db.select({ ownerUserId: schema.deals.ownerUserId }).from(schema.deals).where(eq(schema.deals.id, dealId)))[0].ownerUserId).toBeNull();
  expect((await db.select({ assigneeUserId: schema.tasks.assigneeUserId }).from(schema.tasks).where(eq(schema.tasks.id, taskId)))[0].assigneeUserId).toBeNull();
});

test("erro de membership não exibe sucesso nem altera dados", async ({ page }) => {
  await openTeamAs(page, "owner");
  await db.delete(schema.member).where(eq(schema.member.id, fixture.actors.target.memberId));
  await page.getByLabel("Membro de origem").selectOption(fixture.actors.member.userId);
  await page.getByLabel("Novo responsável").selectOption(fixture.actors.target.userId);
  await page.getByRole("button", { name: "Revisar transferência" }).click();
  await page.getByRole("dialog", { name: "Confirmar transferência" }).getByRole("button", { name: "Confirmar transferência" }).click();
  const transferError = page.locator(".assignment-transfer-dialog [role='alert']");
  await expect(transferError).toHaveText("Não foi possível concluir. Confirme se a origem e o destino ainda pertencem a esta equipe e tente novamente.");
  await expect(page.getByRole("status")).toHaveCount(0);
  expect((await db.select({ ownerUserId: schema.clients.ownerUserId }).from(schema.clients).where(eq(schema.clients.organizationId, fixture.organizationId))).every((row) => row.ownerUserId === fixture.actors.member.userId)).toBe(true);
  expect(await db.select({ id: schema.auditLogs.id }).from(schema.auditLogs).where(eq(schema.auditLogs.organizationId, fixture.organizationId))).toHaveLength(0);
});

for (const role of ["admin", "member"] as const) {
  test(`${role} não recebe os controles administrativos de transferência`, async ({ page }) => {
    await openTeamAs(page, role);
    await expect(page.getByRole("heading", { name: "Responsabilidades por pessoa" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Transferir responsabilidades" })).toHaveCount(0);
    await expect(page.getByLabel("Membro de origem")).toHaveCount(0);
  });
}
