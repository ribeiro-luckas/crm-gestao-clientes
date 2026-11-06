import { expect, test, type Page } from "@playwright/test";
import { and, eq, inArray } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../../src/db/schema";
import { createIsolatedConnectionPair, type IsolatedConnectionPair } from "../helpers/test-db";
import { seedTeamRbacFixture, type RbacActor } from "../helpers/team-rbac-fixture";
import { signInWithRateLimitRetry, submitSignInFormWithRateLimitRetry } from "../helpers/e2e-auth";

const linkedTasksMessage = "Não é possível alterar o cliente desta oportunidade enquanto houver tarefas vinculadas. Reconcilie as tarefas e tente novamente.";

let connection: IsolatedConnectionPair;
let db: NodePgDatabase<typeof schema>;
let fixture: Awaited<ReturnType<typeof seedTeamRbacFixture>>;
let clientIds: { primary: string; secondary: string };
let dealId: string;

test.beforeEach(async () => {
  connection = await createIsolatedConnectionPair();
  db = drizzle(connection.poolA, { schema });
  fixture = await seedTeamRbacFixture(db);
  const [primary, secondary] = await db.insert(schema.clients).values([
    { organizationId: fixture.organizationId, kind: "company", name: "E2E Primary Client", status: "active", ownerUserId: fixture.actors.owner.userId },
    { organizationId: fixture.organizationId, kind: "company", name: "E2E Secondary Client", status: "active", ownerUserId: fixture.actors.owner.userId },
  ]).returning({ id: schema.clients.id });
  clientIds = { primary: primary.id, secondary: secondary.id };
  const [deal] = await db.insert(schema.deals).values({
    organizationId: fixture.organizationId,
    clientId: primary.id,
    title: "E2E Seed Opportunity",
    amount: "1500.00",
    ownerUserId: fixture.actors.owner.userId,
  }).returning({ id: schema.deals.id });
  dealId = deal.id;
});

test.afterEach(async () => {
  const errors: unknown[] = [];
  try {
    if (fixture) {
      try { await fixture.cleanup(); } catch (error) { errors.push(error); }
      try {
        const userIds = Object.values(fixture.actors).map((actor) => actor.userId);
        const residues = await Promise.all([
          db.select({ id: schema.organization.id }).from(schema.organization).where(eq(schema.organization.id, fixture.organizationId)),
          db.select({ id: schema.member.id }).from(schema.member).where(eq(schema.member.organizationId, fixture.organizationId)),
          db.select({ id: schema.invitation.id }).from(schema.invitation).where(eq(schema.invitation.organizationId, fixture.organizationId)),
          db.select({ id: schema.organizationOwnerGuard.organizationId }).from(schema.organizationOwnerGuard).where(eq(schema.organizationOwnerGuard.organizationId, fixture.organizationId)),
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
        if (residues.some((rows) => rows.length > 0)) throw new Error("Fixture E2E deixou resíduos depois do cleanup escopado.");
      } catch (error) { errors.push(error); }
    }
  } finally {
    if (connection) await connection.cleanup();
  }
  if (errors.length) throw new AggregateError(errors, "Falha no cleanup da fixture E2E do CRM.");
});

async function signIn(page: Page, actor: RbacActor = "owner") {
  const identity = fixture.actors[actor];
  const response = await signInWithRateLimitRetry(page.request, { email: identity.email, password: identity.password }, "http://127.0.0.1:3100");
  expect(response.ok(), `login E2E retornou HTTP ${response.status()}`).toBeTruthy();
}

test("login, logout e proteção de páginas privadas funcionam pela interface", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel(/^E-mail/).fill(fixture.actors.owner.email);
  await page.getByLabel(/^Senha/).fill("senha incorreta para teste");
  const invalidLogin = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/auth/sign-in/email" && response.request().method() === "POST");
  await page.getByRole("button", { name: "Entrar no CRM" }).click();
  expect((await invalidLogin).status()).toBe(401);
  await expect(page.locator("form.auth-form").getByRole("alert"))
    .toHaveText("Não foi possível entrar com esses dados. Confira o e-mail e a senha.");
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel(/^Senha/).fill(fixture.actors.owner.password);
  await submitSignInFormWithRateLimitRetry(page, () => page.getByRole("button", { name: "Entrar no CRM" }).click());
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "Visão geral" })).toBeVisible();

  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/tasks");
  await expect(page).toHaveURL(/\/login/);
});

test("OWNER cria e edita cliente usando os formulários acessíveis", async ({ page }) => {
  await signIn(page);
  await page.goto("/clients/new");
  await page.getByLabel(/^Nome/).fill("E2E Created Client");
  await page.getByLabel("Status", { exact: true }).selectOption("prospect");
  await page.getByLabel(/^E-mail/).fill("e2e-client@example.test");
  await page.getByRole("button", { name: "Salvar cliente" }).click();
  await expect(page.getByRole("heading", { name: "E2E Created Client", level: 1 })).toBeVisible();

  await page.getByRole("link", { name: "Editar" }).click();
  await page.getByLabel(/^Nome/).fill("E2E Edited Client");
  await page.getByLabel("Status", { exact: true }).selectOption("active");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByRole("heading", { name: "E2E Edited Client", level: 1 })).toBeVisible();
  await expect(page.getByText("Ativo", { exact: true })).toBeVisible();

  const [persisted] = await db.select({ name: schema.clients.name, status: schema.clients.status, ownerUserId: schema.clients.ownerUserId })
    .from(schema.clients).where(and(eq(schema.clients.organizationId, fixture.organizationId), eq(schema.clients.name, "E2E Edited Client")));
  expect(persisted).toEqual({ name: "E2E Edited Client", status: "active", ownerUserId: fixture.actors.owner.userId });
});

test("OWNER cria e edita oportunidade sem vínculo dependente", async ({ page }) => {
  await signIn(page);
  await page.goto("/deals/new");
  await page.getByLabel(/^Cliente relacionado/).selectOption(clientIds.primary);
  await page.getByLabel(/^Nome da oportunidade/).fill("E2E Created Opportunity");
  await page.getByLabel(/^Valor estimado/).fill("2400.50");
  await page.getByLabel(/^Previsão de fechamento/).fill("2027-12-30");
  await page.getByRole("button", { name: "Criar oportunidade" }).click();
  await expect(page.getByRole("heading", { name: "E2E Created Opportunity", level: 1 })).toBeVisible();

  await page.getByRole("link", { name: "Editar" }).click();
  await page.getByLabel(/^Cliente relacionado/).selectOption(clientIds.secondary);
  await page.getByLabel(/^Nome da oportunidade/).fill("E2E Edited Opportunity");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByRole("heading", { name: "E2E Edited Opportunity", level: 1 })).toBeVisible();
  await expect(page.getByText("E2E Secondary Client", { exact: true })).toBeVisible();

  const [persisted] = await db.select({ clientId: schema.deals.clientId, title: schema.deals.title })
    .from(schema.deals).where(and(eq(schema.deals.organizationId, fixture.organizationId), eq(schema.deals.title, "E2E Edited Opportunity")));
  expect(persisted).toEqual({ clientId: clientIds.secondary, title: "E2E Edited Opportunity" });
});

test("I-01 informa o bloqueio visualmente e permite salvar após reconciliação explícita", async ({ page }) => {
  await signIn(page);
  const [activeTask, archivedTask] = await db.insert(schema.tasks).values([
    { organizationId: fixture.organizationId, title: "E2E Active Dependency", dueAt: new Date("2035-06-15T12:00:00Z"), clientId: clientIds.primary, dealId, assigneeUserId: fixture.actors.owner.userId },
    { organizationId: fixture.organizationId, title: "E2E Archived Dependency", dueAt: new Date("2035-06-16T12:00:00Z"), clientId: clientIds.primary, dealId, assigneeUserId: fixture.actors.owner.userId, deletedAt: new Date() },
  ]).returning({ id: schema.tasks.id });
  const dealBefore = await db.select({ clientId: schema.deals.clientId, title: schema.deals.title, amount: schema.deals.amount })
    .from(schema.deals).where(eq(schema.deals.id, dealId));
  const auditBefore = await db.select({ id: schema.auditLogs.id }).from(schema.auditLogs)
    .where(and(eq(schema.auditLogs.organizationId, fixture.organizationId), eq(schema.auditLogs.entityType, "deal"), eq(schema.auditLogs.entityId, dealId)));

  await page.goto(`/deals/${dealId}/edit`);
  await page.getByLabel(/^Cliente relacionado/).selectOption(clientIds.secondary);
  await page.getByLabel(/^Nome da oportunidade/).fill("Must not commit");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.locator("form.form-panel").getByRole("alert")).toHaveText(linkedTasksMessage);
  expect(await db.select({ clientId: schema.deals.clientId, title: schema.deals.title, amount: schema.deals.amount }).from(schema.deals).where(eq(schema.deals.id, dealId)))
    .toEqual(dealBefore);
  expect(await db.select({ id: schema.tasks.id, clientId: schema.tasks.clientId, deletedAt: schema.tasks.deletedAt }).from(schema.tasks)
    .where(inArray(schema.tasks.id, [activeTask.id, archivedTask.id])))
    .toEqual(expect.arrayContaining([
      { id: activeTask.id, clientId: clientIds.primary, deletedAt: null },
      { id: archivedTask.id, clientId: clientIds.primary, deletedAt: expect.any(Date) },
    ]));
  expect(await db.select({ id: schema.auditLogs.id }).from(schema.auditLogs)
    .where(and(eq(schema.auditLogs.organizationId, fixture.organizationId), eq(schema.auditLogs.entityType, "deal"), eq(schema.auditLogs.entityId, dealId))))
    .toEqual(auditBefore);

  await db.update(schema.tasks).set({ clientId: null }).where(inArray(schema.tasks.id, [activeTask.id, archivedTask.id]));
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByRole("heading", { name: "Must not commit", level: 1 })).toBeVisible();
  await db.update(schema.tasks).set({ clientId: clientIds.secondary }).where(inArray(schema.tasks.id, [activeTask.id, archivedTask.id]));
  expect(await db.select({ clientId: schema.deals.clientId }).from(schema.deals).where(eq(schema.deals.id, dealId)))
    .toEqual([{ clientId: clientIds.secondary }]);
});

test("cria e conclui tarefa pela interface", async ({ page }) => {
  await signIn(page);
  await page.goto("/tasks/new");
  await page.getByLabel(/^Título/).fill("E2E Follow-up Task");
  await page.getByLabel(/^Prioridade/).selectOption("high");
  await page.getByLabel(/^Vencimento/).fill("2035-06-15T09:30");
  await page.getByLabel(/^Cliente relacionado/).selectOption(clientIds.primary);
  await page.getByLabel(/^Oportunidade relacionada/).selectOption(dealId);
  await page.getByRole("button", { name: "Criar tarefa" }).click();
  await expect(page).toHaveURL(/\/tasks$/);

  const taskRow = page.getByRole("row").filter({ hasText: "E2E Follow-up Task" });
  await expect(taskRow).toBeVisible();
  await taskRow.getByRole("button", { name: "Marcar tarefa como concluída" }).click();
  await expect(taskRow.getByLabel("Tarefa concluída")).toBeVisible();
  const [persisted] = await db.select({ status: schema.tasks.status, clientId: schema.tasks.clientId, dealId: schema.tasks.dealId })
    .from(schema.tasks).where(and(eq(schema.tasks.organizationId, fixture.organizationId), eq(schema.tasks.title, "E2E Follow-up Task")));
  expect(persisted).toEqual({ status: "done", clientId: clientIds.primary, dealId });
});

test("OWNER não remove membro que ainda possui responsabilidade atribuída", async ({ page }) => {
  await signIn(page);
  const [assignedClient] = await db.insert(schema.clients).values({
    organizationId: fixture.organizationId, kind: "company", name: "E2E Protected Assignment", ownerUserId: fixture.actors.target.userId,
  }).returning({ id: schema.clients.id });

  const response = await page.request.post("/api/auth/organization/remove-member", {
    headers: { origin: "http://127.0.0.1:3100" },
    data: { organizationId: fixture.organizationId, memberIdOrEmail: fixture.actors.target.memberId },
  });
  expect(response.status()).toBe(409);
  const body = await response.json() as { code: string; message: string };
  expect(body.code).toBe("MEMBER_HAS_ASSIGNMENTS");
  expect(body.message).toContain("Transfira ou remova essas atribuições antes de retirá-lo da equipe.");
  expect(body.message).toContain("clientes: 1, oportunidades: 0, tarefas: 0");
  expect(JSON.stringify(body)).not.toMatch(/23001|member_assignment_fk|postgres|stack|Failed query/i);
  expect(await db.select({ id: schema.member.id }).from(schema.member)
    .where(and(eq(schema.member.organizationId, fixture.organizationId), eq(schema.member.userId, fixture.actors.target.userId))))
    .toHaveLength(1);
  expect(await db.select({ ownerUserId: schema.clients.ownerUserId }).from(schema.clients).where(eq(schema.clients.id, assignedClient.id)))
    .toEqual([{ ownerUserId: fixture.actors.target.userId }]);

  await page.context().clearCookies();
  await signIn(page, "member");
  const denied = await page.request.post("/api/auth/organization/remove-member", {
    headers: { origin: "http://127.0.0.1:3100" },
    data: { organizationId: fixture.organizationId, memberIdOrEmail: fixture.actors.target.memberId },
  });
  expect(denied.status()).toBe(401);
  expect(await denied.text()).not.toMatch(/postgres|stack|Failed query|member_assignment_fk/i);
  expect(await db.select({ id: schema.member.id }).from(schema.member)
    .where(and(eq(schema.member.organizationId, fixture.organizationId), eq(schema.member.userId, fixture.actors.target.userId))))
    .toHaveLength(1);
});
