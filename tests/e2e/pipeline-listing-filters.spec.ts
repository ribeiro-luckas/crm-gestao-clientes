import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../../src/db/schema";
import { createIsolatedConnectionPair, type IsolatedConnectionPair } from "../helpers/test-db";
import { seedTeamRbacFixture } from "../helpers/team-rbac-fixture";
import { signInWithRateLimitRetry } from "../helpers/e2e-auth";

let connection: IsolatedConnectionPair;
let db: NodePgDatabase<typeof schema>;
let orgA: Awaited<ReturnType<typeof seedTeamRbacFixture>>;
let orgB: Awaited<ReturnType<typeof seedTeamRbacFixture>>;
let clientAId: string;
let clientBId: string;
let privateDealAId: string;
let suffix: string;

test.beforeEach(async () => {
  connection = await createIsolatedConnectionPair();
  db = drizzle(connection.poolA, { schema });
  orgA = await seedTeamRbacFixture(db);
  orgB = await seedTeamRbacFixture(db);
  suffix = randomUUID().slice(0, 8);

  const clients = await db.insert(schema.clients).values([
    { organizationId: orgA.organizationId, kind: "company", name: `E2E Sales Company A ${suffix}`, status: "active", ownerUserId: orgA.actors.owner.userId },
    { organizationId: orgB.organizationId, kind: "company", name: `E2E Private Company B ${suffix}`, status: "active", ownerUserId: orgB.actors.owner.userId },
  ]).returning({ id: schema.clients.id, organizationId: schema.clients.organizationId });
  const clientA = clients.find((client) => client.organizationId === orgA.organizationId);
  const clientB = clients.find((client) => client.organizationId === orgB.organizationId);
  if (!clientA || !clientB) throw new Error("Não foi possível identificar os clientes das fixtures E2E.");
  clientAId = clientA.id;
  clientBId = clientB.id;

  const [privateDeal] = await db.insert(schema.deals).values({
    organizationId: orgA.organizationId,
    clientId: clientAId,
    title: `E2E Private Detail A ${suffix}`,
    amount: "800.00",
    ownerUserId: orgA.actors.owner.userId,
  }).returning({ id: schema.deals.id });
  privateDealAId = privateDeal.id;
});

test.afterEach(async () => {
  const errors: unknown[] = [];
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
    } catch (error) { errors.push(error); }
    try { await fixture.cleanup(); } catch (error) { errors.push(error); }
    try {
      const userIds = Object.values(fixture.actors).map((actor) => actor.userId);
      const residues = await Promise.all([
        db.select({ id: schema.organization.id }).from(schema.organization).where(eq(schema.organization.id, fixture.organizationId)),
        db.select({ id: schema.member.id }).from(schema.member).where(eq(schema.member.organizationId, fixture.organizationId)),
        db.select({ id: schema.invitation.id }).from(schema.invitation).where(eq(schema.invitation.organizationId, fixture.organizationId)),
        db.select({ organizationId: schema.organizationOwnerGuard.organizationId }).from(schema.organizationOwnerGuard).where(eq(schema.organizationOwnerGuard.organizationId, fixture.organizationId)),
        db.select({ id: schema.user.id }).from(schema.user).where(inArray(schema.user.id, userIds)),
        db.select({ id: schema.account.id }).from(schema.account).where(inArray(schema.account.userId, userIds)),
        db.select({ id: schema.session.id }).from(schema.session).where(inArray(schema.session.userId, userIds)),
        db.select({ id: schema.clients.id }).from(schema.clients).where(eq(schema.clients.organizationId, fixture.organizationId)),
        db.select({ id: schema.contacts.id }).from(schema.contacts).where(eq(schema.contacts.organizationId, fixture.organizationId)),
        db.select({ id: schema.deals.id }).from(schema.deals).where(eq(schema.deals.organizationId, fixture.organizationId)),
        db.select({ id: schema.tasks.id }).from(schema.tasks).where(eq(schema.tasks.organizationId, fixture.organizationId)),
        db.select({ id: schema.activities.id }).from(schema.activities).where(eq(schema.activities.organizationId, fixture.organizationId)),
        db.select({ id: schema.auditLogs.id }).from(schema.auditLogs).where(eq(schema.auditLogs.organizationId, fixture.organizationId)),
      ]);
      if (residues.some((rows) => rows.length)) throw new Error("Cleanup da fixture de listagem deixou resíduos.");
    } catch (error) { errors.push(error); }
  }
  if (connection) await connection.cleanup();
  if (errors.length) throw new AggregateError(errors, "Falha no cleanup isolado de Kanban e listagens.");
});

async function signInAs(page: Page, fixture: Awaited<ReturnType<typeof seedTeamRbacFixture>>, actor: "owner" | "member" = "owner") {
  const identity = fixture.actors[actor];
  const response = await signInWithRateLimitRetry(page.request, { email: identity.email, password: identity.password }, "http://127.0.0.1:3100");
  expect(response.ok(), `login E2E retornou HTTP ${response.status()}`).toBe(true);
}

async function tableColumnTexts(page: Page, columnIndex: number) {
  const rows = await page.getByRole("row").all();
  return Promise.all(rows.slice(1).map(async (row) => (await row.getByRole("cell").nth(columnIndex).innerText()).trim()));
}

async function expectDealCount(page: Page, count: number) {
  const summary = page.locator(".deal-summary-bar > span").filter({ hasText: "encontradas" });
  await expect(summary).toHaveCount(1);
  const label = count === 1 ? "oportunidade encontrada" : "oportunidades encontradas";
  await expect(summary.locator("strong")).toHaveText(String(count));
  await expect(summary).toContainText(label);
}

test("muda etapa com validação, teclado, persistência e auditoria", async ({ page }) => {
  await signInAs(page, orgA);
  const [deal] = await db.insert(schema.deals).values({
    organizationId: orgA.organizationId,
    clientId: clientAId,
    title: `E2E Stage Change ${suffix}`,
    amount: "1250.00",
    stage: "new_lead",
    ownerUserId: orgA.actors.owner.userId,
  }).returning({ id: schema.deals.id });

  await page.goto(`/deals/${deal.id}`);
  const stagePanel = page.locator("section.panel").filter({ has: page.getByRole("heading", { name: "Atualizar etapa", exact: true }) });
  const stageSelect = page.getByLabel("Etapa da oportunidade");
  await stageSelect.selectOption("lost");
  await stagePanel.getByRole("button", { name: "Atualizar etapa" }).click();
  await expect(stagePanel.getByRole("alert")).toHaveText("Informe o motivo da perda.");
  expect(await db.select({ stage: schema.deals.stage, closedAt: schema.deals.closedAt, lossReason: schema.deals.lossReason })
    .from(schema.deals).where(eq(schema.deals.id, deal.id)))
    .toEqual([{ stage: "new_lead", closedAt: null, lossReason: null }]);
  expect(await db.select({ id: schema.auditLogs.id }).from(schema.auditLogs)
    .where(and(eq(schema.auditLogs.organizationId, orgA.organizationId), eq(schema.auditLogs.entityType, "deal"), eq(schema.auditLogs.entityId, deal.id), eq(schema.auditLogs.action, "stage_change"))))
    .toHaveLength(0);

  await stageSelect.selectOption("qualification");
  await stageSelect.focus();
  await page.keyboard.press("Tab");
  const updateButton = stagePanel.getByRole("button", { name: "Atualizar etapa" });
  await expect(updateButton).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(stagePanel.getByRole("status")).toHaveText("Etapa atualizada.");

  expect(await db.select({ stage: schema.deals.stage, closedAt: schema.deals.closedAt, lossReason: schema.deals.lossReason })
    .from(schema.deals).where(eq(schema.deals.id, deal.id)))
    .toEqual([{ stage: "qualification", closedAt: null, lossReason: null }]);
  const audit = await db.select({ actorUserId: schema.auditLogs.actorUserId, action: schema.auditLogs.action, details: schema.auditLogs.details })
    .from(schema.auditLogs).where(and(eq(schema.auditLogs.organizationId, orgA.organizationId), eq(schema.auditLogs.entityType, "deal"), eq(schema.auditLogs.entityId, deal.id), eq(schema.auditLogs.action, "stage_change")));
  expect(audit).toHaveLength(1);
  expect(audit[0]?.actorUserId).toBe(orgA.actors.owner.userId);
  expect(audit[0]?.details).toContain('"from":"new_lead"');
  expect(audit[0]?.details).toContain('"to":"qualification"');

  await page.reload();
  await expect(stageSelect).toHaveValue("qualification");
  await stageSelect.selectOption("lost");
  await page.getByLabel("Motivo da perda").fill("Sem aderência ao perfil do cliente");
  await stagePanel.getByRole("button", { name: "Atualizar etapa" }).click();
  await expect(stagePanel.getByRole("status")).toHaveText("Etapa atualizada.");

  expect(await db.select({ stage: schema.deals.stage, closedAt: schema.deals.closedAt, lossReason: schema.deals.lossReason })
    .from(schema.deals).where(eq(schema.deals.id, deal.id)))
    .toEqual([{ stage: "lost", closedAt: expect.any(Date), lossReason: "Sem aderência ao perfil do cliente" }]);
  const finalAudit = await db.select({ actorUserId: schema.auditLogs.actorUserId, details: schema.auditLogs.details })
    .from(schema.auditLogs).where(and(eq(schema.auditLogs.organizationId, orgA.organizationId), eq(schema.auditLogs.entityType, "deal"), eq(schema.auditLogs.entityId, deal.id), eq(schema.auditLogs.action, "stage_change")));
  expect(finalAudit).toHaveLength(2);
  expect(finalAudit.map((row) => row.actorUserId)).toEqual([orgA.actors.owner.userId, orgA.actors.owner.userId]);
  expect(finalAudit.map((row) => row.details)).toEqual(expect.arrayContaining([
    expect.stringContaining('"to":"qualification"'),
    expect.stringContaining('"to":"lost"'),
  ]));
  await page.reload();
  await expect(stageSelect).toHaveValue("lost");
  await expect(page.getByText("Sem aderência ao perfil do cliente", { exact: true })).toBeVisible();
});

test("Kanban combina busca e etapa, ordena por previsão e ignora etapa inválida", async ({ page }) => {
  const earlyTitle = `E2E Pipeline ${suffix} Early`;
  const lateTitle = `E2E Pipeline ${suffix} Late`;
  const otherStageTitle = `E2E Pipeline ${suffix} Negotiation`;
  await db.insert(schema.deals).values([
    { organizationId: orgA.organizationId, clientId: clientAId, title: lateTitle, amount: "500.00", stage: "qualification", expectedCloseAt: "2032-02-01", ownerUserId: orgA.actors.owner.userId },
    { organizationId: orgA.organizationId, clientId: clientAId, title: earlyTitle, amount: "400.00", stage: "qualification", expectedCloseAt: "2032-01-01", ownerUserId: orgA.actors.owner.userId },
    { organizationId: orgA.organizationId, clientId: clientAId, title: otherStageTitle, amount: "300.00", stage: "negotiation", expectedCloseAt: "2031-12-01", ownerUserId: orgA.actors.owner.userId },
    { organizationId: orgB.organizationId, clientId: clientBId, title: `E2E Private Pipeline ${suffix}`, amount: "900.00", stage: "qualification", ownerUserId: orgB.actors.owner.userId },
  ]);

  await signInAs(page, orgA);
  await page.goto("/deals");
  await page.getByLabel("Buscar oportunidades").fill(`E2E Pipeline ${suffix}`);
  await page.getByLabel("Filtrar por etapa").selectOption("qualification");
  await page.getByRole("button", { name: "Filtrar" }).click();

  const qualificationColumn = page.getByRole("region", { name: "Qualificação" });
  await expect(qualificationColumn.getByRole("heading", { level: 3 })).toHaveText([earlyTitle, lateTitle]);
  await expect(page.getByRole("region", { name: "Negociação" }).getByRole("heading", { level: 3 })).toHaveCount(0);
  await expect(page.getByText(otherStageTitle, { exact: true })).toHaveCount(0);
  await expect(page.getByText(`E2E Private Pipeline ${suffix}`, { exact: true })).toHaveCount(0);

  await page.goto(`/deals?q=${encodeURIComponent(`E2E Pipeline ${suffix}`)}&stage=invalid`);
  await expectDealCount(page, 3);
  await expect(page.getByText(earlyTitle, { exact: true })).toBeVisible();
  await expect(page.getByText(lateTitle, { exact: true })).toBeVisible();
  await expect(page.getByText(otherStageTitle, { exact: true })).toBeVisible();

  await page.goto(`/deals?q=${encodeURIComponent(`missing-${suffix}`)}`);
  await expectDealCount(page, 0);
  for (const stage of ["Novo lead", "Qualificação", "Proposta", "Negociação", "Ganho", "Perdido"]) {
    await expect(page.getByRole("region", { name: stage })).toBeVisible();
  }

  await page.goto(`/search?q=${encodeURIComponent(`E2E Private Pipeline ${suffix}`)}`);
  await expect(page.getByText(`E2E Private Pipeline ${suffix}`, { exact: true })).toHaveCount(0);
  await expect(page.getByText("Nenhuma oportunidade corresponde à busca.", { exact: true })).toBeVisible();
  await page.goto("/search?q=x");
  await expect(page.getByText("Digite ao menos 2 caracteres", { exact: true })).toBeVisible();
});

test("navegação e áreas roláveis permanecem acessíveis nas larguras alvo", async ({ page }) => {
  await signInAs(page, orgA);

  for (const width of [390, 320, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto("/deals");

    const pageWidth = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(pageWidth.content, `overflow horizontal em ${width}px no Kanban`).toBeLessThanOrEqual(pageWidth.viewport);

    // O nome acessível preserva o separador entre o nó de texto e o span do ponto.
    const brandName = width <= 820 ? "rota ." : "rota . CRM COMERCIAL";
    const brand = page.getByRole("link", { name: brandName, exact: true });
    await expect(brand).toHaveAccessibleName(brandName);
    await expect(brand).toHaveAttribute("href", "/");
    const skipLink = page.getByRole("link", { name: "Pular para o conteúdo", exact: true });
    await page.keyboard.press("Tab");
    await expect(skipLink).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(brand).toBeFocused();

    const workspaceSwitcher = page.locator(".workspace-switcher");
    if (width > 820) {
      await page.keyboard.press("Tab");
      await expect(workspaceSwitcher).toBeVisible();
      await expect(workspaceSwitcher).toBeFocused();
      await expect(workspaceSwitcher).toHaveAccessibleName(/RBAC Test Workspace.*Trocar workspace/);
      await expect(workspaceSwitcher).toHaveCSS("outline-style", "solid");
    } else {
      await expect(workspaceSwitcher).toBeHidden();
    }

    const navigationNames = ["Visão geral", "Clientes", "Oportunidades", "Tarefas", "Atividades", "Equipe", "Configurações", "Ajuda"];
    for (const name of navigationNames) {
      const link = page.getByRole("link", { name, exact: true });
      await expect(link).toBeVisible();
      await page.keyboard.press("Tab");
      await expect(link).toBeFocused();
      if (name === "Visão geral") {
        await expect(link).toHaveCSS("outline-style", "solid");
        const outlineWidth = await link.evaluate((element) => Number.parseFloat(getComputedStyle(element).outlineWidth));
        expect(outlineWidth).toBeGreaterThanOrEqual(3);
      }
    }
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Pesquisar no CRM" })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(page.getByRole("link", { name: "Ajuda", exact: true })).toBeFocused();
    for (let index = navigationNames.length - 2; index >= 0; index -= 1) {
      await page.keyboard.press("Shift+Tab");
      await expect(page.getByRole("link", { name: navigationNames[index], exact: true })).toBeFocused();
    }
    if (width > 820) {
      await page.keyboard.press("Shift+Tab");
      await expect(workspaceSwitcher).toBeFocused();
    }
    await page.keyboard.press("Shift+Tab");
    await expect(brand).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(skipLink).toBeFocused();

    const kanban = page.getByRole("region", { name: "Funil de oportunidades por etapa" });
    await expect(kanban).toHaveCount(1);
    await expect(kanban.getByRole("region")).toHaveCount(6);
    await expect(kanban.getByRole("heading", { level: 2 })).toHaveCount(6);
    await kanban.focus();
    await expect(kanban).toBeFocused();
    const stageControl = page.getByRole("combobox", { name: "Etapa da oportunidade" }).first();
    await stageControl.focus();
    await expect(stageControl).toBeFocused();

    if (width <= 768) {
      const board = page.locator(".board-scroll");
      expect(await board.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
    }

    await page.goto("/clients");
    await expect(page.getByRole("table")).toBeVisible();
    const clientPageWidth = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(clientPageWidth.content, `overflow horizontal em ${width}px na tabela de clientes`).toBeLessThanOrEqual(clientPageWidth.viewport);
  }
});

test("filtros de clientes combinam busca e status; paginação preserva ordem e não duplica registros", async ({ page }) => {
  const prefix = `E2E Page ${suffix}`;
  const generatedNames = Array.from({ length: 22 }, (_, index) => `${prefix} ${String(index + 1).padStart(2, "0")}`);
  const clientValues: (typeof schema.clients.$inferInsert)[] = generatedNames.map((name, index) => ({
    organizationId: orgA.organizationId,
    kind: "company",
    name,
    status: "prospect",
    ownerUserId: orgA.actors.owner.userId,
    updatedAt: new Date(Date.UTC(2026, 0, index + 1)),
  }));
  clientValues.push({
    organizationId: orgA.organizationId,
    kind: "company",
    name: `${prefix} Active Only`,
    status: "active",
    ownerUserId: orgA.actors.owner.userId,
    updatedAt: new Date(Date.UTC(2026, 1, 1)),
  });
  await db.insert(schema.clients).values(clientValues);

  await signInAs(page, orgA);
  await page.goto(`/clients?q=${encodeURIComponent(prefix)}&status=prospect&page=not-a-number`);
  await expect(page.getByText("Mostrando 1–20 de 22", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Anterior" })).toHaveCount(0);
  await expect(page.getByText("Anterior", { exact: true })).toHaveClass(/is-disabled/);
  await expect(page.getByRole("row")).toHaveCount(21);
  await expect(page.getByText(`${prefix} Active Only`, { exact: true })).toHaveCount(0);
  const firstPageRows = await tableColumnTexts(page, 0);
  expect(firstPageRows.map((row) => row.split("\n")[0])).toEqual(generatedNames.slice().reverse().slice(0, 20));

  const nextPage = page.getByRole("link", { name: "Próxima" });
  await nextPage.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Mostrando 21–22 de 22", { exact: true })).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(3);
  const secondPageRows = await tableColumnTexts(page, 0);
  expect(secondPageRows.map((row) => row.split("\n")[0])).toEqual(generatedNames.slice(0, 2).reverse());

  const allNames = [...firstPageRows, ...secondPageRows].map((row) => row.split("\n")[0]);
  expect(new Set(allNames).size).toBe(22);
  expect(new Set(allNames)).toEqual(new Set(generatedNames));

  const previousPage = page.getByRole("link", { name: "Anterior" });
  await previousPage.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Mostrando 1–20 de 22", { exact: true })).toBeVisible();
});

test("filtros de tarefas combinam texto, status e vencimento com ordenação ascendente", async ({ page }) => {
  const prefix = `E2E Task ${suffix}`;
  const titles = {
    overdue: `${prefix} Overdue`,
    early: `${prefix} Upcoming Early`,
    late: `${prefix} Upcoming Late`,
    done: `${prefix} Done`,
  };
  await db.insert(schema.tasks).values([
    { organizationId: orgA.organizationId, title: titles.overdue, dueAt: new Date("2025-01-01T12:00:00Z"), status: "todo", clientId: clientAId },
    { organizationId: orgA.organizationId, title: titles.early, dueAt: new Date("2032-01-01T12:00:00Z"), status: "todo", clientId: clientAId },
    { organizationId: orgA.organizationId, title: titles.late, dueAt: new Date("2032-02-01T12:00:00Z"), status: "todo", clientId: clientAId },
    { organizationId: orgA.organizationId, title: titles.done, dueAt: new Date("2032-03-01T12:00:00Z"), status: "done", clientId: clientAId },
    { organizationId: orgB.organizationId, title: `E2E Private Task ${suffix}`, dueAt: new Date("2032-01-02T12:00:00Z"), status: "todo", clientId: clientBId },
  ]);

  await signInAs(page, orgA);
  await page.goto(`/tasks?q=${encodeURIComponent(prefix)}&filter=upcoming&status=todo`);
  const tasksTable = page.getByRole("table");
  await expect(tasksTable.getByRole("row")).toHaveCount(3);
  expect((await tableColumnTexts(page, 1)).map((row) => row.split("\n")[0])).toEqual([titles.early, titles.late]);
  await expect(page.getByText(titles.overdue, { exact: true })).toHaveCount(0);
  await expect(page.getByText(titles.done, { exact: true })).toHaveCount(0);
  await expect(page.getByText(`E2E Private Task ${suffix}`, { exact: true })).toHaveCount(0);

  await page.goto(`/tasks?q=${encodeURIComponent(prefix)}&filter=overdue&status=done`);
  await expect(page.getByText("Nenhuma tarefa encontrada", { exact: true })).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(0);
});

test("rota de oportunidade redireciona sem sessão e oculta oportunidade de outro workspace", async ({ page }) => {
  const [protectedDeal] = await db.select({ stage: schema.deals.stage }).from(schema.deals).where(eq(schema.deals.id, privateDealAId));
  const auditBefore = await db.select({ id: schema.auditLogs.id }).from(schema.auditLogs)
    .where(and(eq(schema.auditLogs.organizationId, orgA.organizationId), eq(schema.auditLogs.entityType, "deal"), eq(schema.auditLogs.entityId, privateDealAId)));

  const unauthenticatedResponse = await page.goto(`/deals/${privateDealAId}`);
  expect(unauthenticatedResponse?.status()).toBe(200);
  await expect(page).toHaveURL(/\/login/);

  await signInAs(page, orgB);
  const foreignResponse = await page.goto(`/deals/${privateDealAId}`);
  expect(foreignResponse?.status()).toBe(404);
  expect(await db.select({ stage: schema.deals.stage }).from(schema.deals).where(eq(schema.deals.id, privateDealAId)))
    .toEqual([protectedDeal]);
  expect(await db.select({ id: schema.auditLogs.id }).from(schema.auditLogs)
    .where(and(eq(schema.auditLogs.organizationId, orgA.organizationId), eq(schema.auditLogs.entityType, "deal"), eq(schema.auditLogs.entityId, privateDealAId))))
    .toEqual(auditBefore);
});
