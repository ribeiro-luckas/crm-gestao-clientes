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
let archivedClientId: string;
let archivedContactId: string;
let archivedActivityId: string;
let archivedClientName: string;
let archivedActivitySubject: string;

test.beforeEach(async () => {
  connection = await createIsolatedConnectionPair();
  db = drizzle(connection.poolA, { schema });
  orgA = await seedTeamRbacFixture(db);
  orgB = await seedTeamRbacFixture(db);

  const archivedName = `E2E Archived Company ${randomUUID()}`;
  const createdClients = await db.insert(schema.clients).values([
    { organizationId: orgA.organizationId, kind: "company", name: "E2E Contact Company A", status: "active", ownerUserId: orgA.actors.owner.userId },
    { organizationId: orgB.organizationId, kind: "company", name: "E2E Private Company B", status: "active", ownerUserId: orgB.actors.owner.userId },
    { organizationId: orgA.organizationId, kind: "company", name: archivedName, status: "inactive", ownerUserId: orgA.actors.owner.userId, deletedAt: new Date("2026-10-15T12:00:00Z") },
  ]).returning({ id: schema.clients.id, name: schema.clients.name });
  const clientA = createdClients.find((client) => client.name === "E2E Contact Company A");
  const clientB = createdClients.find((client) => client.name === "E2E Private Company B");
  const archivedClient = createdClients.find((client) => client.name === archivedName);
  if (!clientA || !clientB || !archivedClient) throw new Error("Não foi possível identificar os clientes da fixture E2E.");
  clientAId = clientA.id;
  clientBId = clientB.id;
  archivedClientId = archivedClient.id;
  archivedClientName = archivedClient.name;

  const [archivedContact] = await db.insert(schema.contacts).values({
    organizationId: orgA.organizationId,
    companyClientId: archivedClientId,
    name: `E2E Archived Contact ${randomUUID()}`,
    deletedAt: new Date("2026-10-15T12:00:00Z"),
  }).returning({ id: schema.contacts.id });
  archivedContactId = archivedContact.id;

  const [archivedActivity] = await db.insert(schema.activities).values({
    organizationId: orgA.organizationId,
    actorUserId: orgA.actors.owner.userId,
    clientId: archivedClientId,
    type: "note",
    subject: `E2E archived history ${randomUUID()}`,
    body: "Histórico preservado após arquivamento.",
  }).returning({ id: schema.activities.id, subject: schema.activities.subject });
  archivedActivityId = archivedActivity.id;
  archivedActivitySubject = archivedActivity.subject;
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
      const residues = await Promise.all([
        db.select({ id: schema.organization.id }).from(schema.organization).where(eq(schema.organization.id, fixture.organizationId)),
        db.select({ id: schema.member.id }).from(schema.member).where(eq(schema.member.organizationId, fixture.organizationId)),
        db.select({ id: schema.invitation.id }).from(schema.invitation).where(eq(schema.invitation.organizationId, fixture.organizationId)),
        db.select({ organizationId: schema.organizationOwnerGuard.organizationId }).from(schema.organizationOwnerGuard).where(eq(schema.organizationOwnerGuard.organizationId, fixture.organizationId)),
        db.select({ id: schema.user.id }).from(schema.user).where(inArray(schema.user.id, Object.values(fixture.actors).map((actor) => actor.userId))),
        db.select({ id: schema.account.id }).from(schema.account).where(inArray(schema.account.userId, Object.values(fixture.actors).map((actor) => actor.userId))),
        db.select({ id: schema.session.id }).from(schema.session).where(inArray(schema.session.userId, Object.values(fixture.actors).map((actor) => actor.userId))),
        db.select({ id: schema.clients.id }).from(schema.clients).where(eq(schema.clients.organizationId, fixture.organizationId)),
        db.select({ id: schema.contacts.id }).from(schema.contacts).where(eq(schema.contacts.organizationId, fixture.organizationId)),
        db.select({ id: schema.deals.id }).from(schema.deals).where(eq(schema.deals.organizationId, fixture.organizationId)),
        db.select({ id: schema.tasks.id }).from(schema.tasks).where(eq(schema.tasks.organizationId, fixture.organizationId)),
        db.select({ id: schema.activities.id }).from(schema.activities).where(eq(schema.activities.organizationId, fixture.organizationId)),
        db.select({ id: schema.auditLogs.id }).from(schema.auditLogs).where(eq(schema.auditLogs.organizationId, fixture.organizationId)),
      ]);
      if (residues.some((rows) => rows.length)) throw new Error("Cleanup E2E deixou resíduos na organização da fixture.");
    } catch (error) { errors.push(error); }
  }
  if (connection) await connection.cleanup();
  if (errors.length) throw new AggregateError(errors, "Falha no cleanup isolado de contatos, atividades e arquivamento.");
});

async function signInAsOwner(page: Page, fixture = orgA) {
  const response = await signInWithRateLimitRetry(page.request, { email: fixture.actors.owner.email, password: fixture.actors.owner.password }, "http://127.0.0.1:3100");
  expect(response.ok(), `login E2E retornou HTTP ${response.status()}`).toBe(true);
}

test("OWNER cria contato na empresa e grava auditoria com tenant e autor corretos", async ({ page }) => {
  await signInAsOwner(page);
  await page.goto(`/clients/${clientAId}`);

  const contactsPanel = page.locator("section.panel").filter({ has: page.getByRole("heading", { name: "Contatos", exact: true }) });
  await contactsPanel.getByText("Adicionar contato", { exact: true }).click();
  await contactsPanel.getByLabel("Nome").fill("Marina E2E Contact");
  await contactsPanel.getByLabel("Cargo").fill("Compras");
  await contactsPanel.getByLabel("Telefone").fill("+55 81 99999-1000");
  await contactsPanel.getByLabel("E-mail").fill("marina.contact@example.test");
  await contactsPanel.getByRole("button", { name: "Salvar contato" }).click();

  await expect(contactsPanel.getByRole("status")).toHaveText("Contato cadastrado.");
  await expect(contactsPanel.getByText("Marina E2E Contact", { exact: true })).toBeVisible();
  await expect(contactsPanel.getByText("Compras · marina.contact@example.test", { exact: true })).toBeVisible();

  const [contact] = await db.select({ id: schema.contacts.id, organizationId: schema.contacts.organizationId, companyClientId: schema.contacts.companyClientId, name: schema.contacts.name, email: schema.contacts.email, phone: schema.contacts.phone, deletedAt: schema.contacts.deletedAt })
    .from(schema.contacts).where(and(eq(schema.contacts.organizationId, orgA.organizationId), eq(schema.contacts.companyClientId, clientAId), eq(schema.contacts.name, "Marina E2E Contact")));
  expect(contact).toMatchObject({ organizationId: orgA.organizationId, companyClientId: clientAId, name: "Marina E2E Contact", email: "marina.contact@example.test", phone: "+55 81 99999-1000", deletedAt: null });

  const audit = await db.select({ organizationId: schema.auditLogs.organizationId, actorUserId: schema.auditLogs.actorUserId, action: schema.auditLogs.action, entityType: schema.auditLogs.entityType, entityId: schema.auditLogs.entityId })
    .from(schema.auditLogs).where(and(eq(schema.auditLogs.organizationId, orgA.organizationId), eq(schema.auditLogs.entityType, "contact"), eq(schema.auditLogs.entityId, contact!.id)));
  expect(audit).toEqual([{ organizationId: orgA.organizationId, actorUserId: orgA.actors.owner.userId, action: "create", entityType: "contact", entityId: contact!.id }]);
});

test("formulário de contato apresenta validação acessível sem criar dados", async ({ page }) => {
  await signInAsOwner(page);
  await page.goto(`/clients/${clientAId}`);

  const contactsPanel = page.locator("section.panel").filter({ has: page.getByRole("heading", { name: "Contatos", exact: true }) });
  await contactsPanel.getByText("Adicionar contato", { exact: true }).click();
  await contactsPanel.getByRole("button", { name: "Salvar contato" }).click();
  await expect(contactsPanel.getByText("Informe o nome do contato.", { exact: true })).toBeVisible();
  expect(await db.select({ id: schema.contacts.id }).from(schema.contacts).where(eq(schema.contacts.companyClientId, clientAId))).toHaveLength(0);
  expect(await db.select({ id: schema.auditLogs.id }).from(schema.auditLogs).where(and(eq(schema.auditLogs.organizationId, orgA.organizationId), eq(schema.auditLogs.entityType, "contact")))).toHaveLength(0);
});

test("registra atividade com autoria e vínculo corretos no histórico e na página de atividades", async ({ page }) => {
  await signInAsOwner(page);
  await page.goto(`/clients/${clientAId}`);

  const activityPanel = page.locator("section.panel").filter({ has: page.getByRole("heading", { name: "Registrar atividade", exact: true }) });
  await activityPanel.getByRole("button", { name: "Registrar atividade" }).click();
  await expect(activityPanel.getByText("Informe um resumo.", { exact: true })).toBeVisible();
  expect(await db.select({ id: schema.activities.id }).from(schema.activities)
    .where(and(eq(schema.activities.organizationId, orgA.organizationId), eq(schema.activities.subject, "Revisão comercial E2E")))).toHaveLength(0);
  expect(await db.select({ id: schema.auditLogs.id }).from(schema.auditLogs)
    .where(and(eq(schema.auditLogs.organizationId, orgA.organizationId), eq(schema.auditLogs.entityType, "activity")))).toHaveLength(0);

  await activityPanel.getByLabel("Tipo de atividade").selectOption("meeting");
  await activityPanel.getByLabel("Resumo").fill("Revisão comercial E2E");
  await activityPanel.getByLabel("Detalhes").fill("Alinhamento de próximos passos.");
  await activityPanel.getByRole("button", { name: "Registrar atividade" }).click();

  await expect(activityPanel.getByRole("status")).toHaveText("Atividade registrada.");
  const historyPanel = page.locator("section.panel").filter({ has: page.getByRole("heading", { name: "Histórico recente", exact: true }) });
  await expect(historyPanel.getByText("Revisão comercial E2E", { exact: true })).toBeVisible();
  await expect(historyPanel.getByText("Alinhamento de próximos passos.", { exact: true })).toBeVisible();

  const [activity] = await db.select({ id: schema.activities.id, organizationId: schema.activities.organizationId, actorUserId: schema.activities.actorUserId, clientId: schema.activities.clientId, dealId: schema.activities.dealId, type: schema.activities.type, subject: schema.activities.subject, body: schema.activities.body })
    .from(schema.activities).where(and(eq(schema.activities.organizationId, orgA.organizationId), eq(schema.activities.subject, "Revisão comercial E2E")));
  expect(activity).toMatchObject({ organizationId: orgA.organizationId, actorUserId: orgA.actors.owner.userId, clientId: clientAId, dealId: null, type: "meeting", subject: "Revisão comercial E2E", body: "Alinhamento de próximos passos." });

  const audit = await db.select({ actorUserId: schema.auditLogs.actorUserId, action: schema.auditLogs.action, entityType: schema.auditLogs.entityType, entityId: schema.auditLogs.entityId })
    .from(schema.auditLogs).where(and(eq(schema.auditLogs.organizationId, orgA.organizationId), eq(schema.auditLogs.entityType, "activity"), eq(schema.auditLogs.entityId, activity!.id)));
  expect(audit).toEqual([{ actorUserId: orgA.actors.owner.userId, action: "create", entityType: "activity", entityId: activity!.id }]);

  await page.goto(`/activities?q=${encodeURIComponent("Revisão comercial E2E")}`);
  await expect(page.getByText("Revisão comercial E2E", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "E2E Contact Company A" })).toBeVisible();
});

test("registros arquivados ficam fora das listagens sem apagar contatos ou histórico", async ({ page }) => {
  await signInAsOwner(page);
  const archivedContactBefore = await db.select({ id: schema.contacts.id, companyClientId: schema.contacts.companyClientId, deletedAt: schema.contacts.deletedAt })
    .from(schema.contacts).where(eq(schema.contacts.id, archivedContactId));
  const archivedActivityBefore = await db.select({ id: schema.activities.id, clientId: schema.activities.clientId, subject: schema.activities.subject })
    .from(schema.activities).where(eq(schema.activities.id, archivedActivityId));
  expect(archivedContactBefore).toHaveLength(1);
  expect(archivedActivityBefore).toHaveLength(1);

  await page.goto("/clients");
  await expect(page.getByText(archivedClientName, { exact: true })).toHaveCount(0);
  await page.goto(`/clients?q=${encodeURIComponent(archivedClientName)}`);
  await expect(page.getByText("Nenhum cliente encontrado", { exact: true })).toBeVisible();
  const archivedClientResponse = await page.goto(`/clients/${archivedClientId}`);
  expect(archivedClientResponse?.status()).toBe(404);

  await page.goto(`/activities?q=${encodeURIComponent(archivedActivitySubject)}`);
  await expect(page.getByText(archivedActivitySubject, { exact: true })).toBeVisible();
  await expect(page.getByText(archivedClientName, { exact: true })).toHaveCount(0);
  expect(await db.select({ id: schema.clients.id, deletedAt: schema.clients.deletedAt }).from(schema.clients).where(eq(schema.clients.id, archivedClientId)))
    .toEqual([{ id: archivedClientId, deletedAt: expect.any(Date) }]);
  expect(await db.select({ id: schema.contacts.id, companyClientId: schema.contacts.companyClientId, deletedAt: schema.contacts.deletedAt }).from(schema.contacts).where(eq(schema.contacts.id, archivedContactId)))
    .toEqual([{ id: archivedContactId, companyClientId: archivedClientId, deletedAt: expect.any(Date) }]);
  expect(await db.select({ id: schema.activities.id, clientId: schema.activities.clientId }).from(schema.activities).where(eq(schema.activities.id, archivedActivityId)))
    .toEqual([{ id: archivedActivityId, clientId: archivedClientId }]);
});

test("não revela cliente, contato ou atividade de outra organização", async ({ page }) => {
  const [privateContact] = await db.insert(schema.contacts).values({
    organizationId: orgB.organizationId,
    companyClientId: clientBId,
    name: "E2E Private Contact B",
  }).returning({ id: schema.contacts.id });
  await db.insert(schema.activities).values({
    organizationId: orgB.organizationId,
    actorUserId: orgB.actors.owner.userId,
    clientId: clientBId,
    type: "note",
    subject: "E2E Private Activity B",
  });

  await signInAsOwner(page);
  const foreignClientResponse = await page.goto(`/clients/${clientBId}`);
  expect(foreignClientResponse?.status()).toBe(404);
  await expect(page.getByText("E2E Private Contact B", { exact: true })).toHaveCount(0);

  await page.goto(`/activities?q=${encodeURIComponent("E2E Private Activity B")}`);
  await expect(page.getByText("Nenhuma atividade encontrada", { exact: true })).toBeVisible();
  await expect(page.getByText("E2E Private Activity B", { exact: true })).toHaveCount(0);
  expect(await db.select({ id: schema.contacts.id, organizationId: schema.contacts.organizationId, companyClientId: schema.contacts.companyClientId })
    .from(schema.contacts).where(eq(schema.contacts.id, privateContact.id)))
    .toEqual([{ id: privateContact.id, organizationId: orgB.organizationId, companyClientId: clientBId }]);
});
