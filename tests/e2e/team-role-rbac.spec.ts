import { expect, test, type Page } from "@playwright/test";
import { and, eq } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../../src/db/schema";
import { createIsolatedConnectionPair, type IsolatedConnectionPair } from "../helpers/test-db";
import { seedTeamRbacFixture, type RbacActor } from "../helpers/team-rbac-fixture";
import { signInWithRateLimitRetry } from "../helpers/e2e-auth";

let connection: IsolatedConnectionPair;
let db: NodePgDatabase<typeof schema>;
let fixture: Awaited<ReturnType<typeof seedTeamRbacFixture>>;

test.beforeEach(async () => {
  connection = await createIsolatedConnectionPair();
  db = drizzle(connection.poolA, { schema });
  fixture = await seedTeamRbacFixture(db);
});

test.afterEach(async () => {
  if (fixture) await fixture.cleanup();
  if (connection) await connection.cleanup();
});

async function openTeamAs(page: Page, actor: RbacActor) {
  const identity = fixture.actors[actor];
  const response = await signInWithRateLimitRetry(page.request, { email: identity.email, password: identity.password }, "http://127.0.0.1:3100");
  expect(response.ok(), `login de fixture ${actor} retornou HTTP ${response.status()}`).toBeTruthy();
  await page.goto("/team");
  await expect(page.getByRole("heading", { name: "Equipe", exact: true })).toBeVisible();
}

test("OWNER vê os controles e consegue alterar o papel pela interface", async ({ page }) => {
  await openTeamAs(page, "owner");
  await expect(page.getByRole("banner").getByText("Proprietário", { exact: true })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Gerenciar" })).toBeVisible();
  const editableActors = ["admin", "member", "target"] as const;
  const roleControls = page.getByRole("combobox", { name: /^Papel de RBAC / });
  await expect(roleControls).toHaveCount(editableActors.length);
  for (const actor of editableActors) {
    const accessibleName = `Papel de RBAC ${actor} (${fixture.actors[actor].email})`;
    const roleControl = page.getByRole("combobox", { name: accessibleName, exact: true });
    await expect(roleControl, `controle acessível do membro ${actor}`).toHaveCount(1);
    await expect(roleControl).toBeVisible();
    await expect(roleControl).toBeEnabled();
  }

  const teamRegion = page.getByRole("region", { name: "Membros do workspace" });
  const targetRow = teamRegion.getByRole("row").filter({ hasText: "RBAC target" });
  await expect(targetRow).toHaveCount(1);
  await expect(targetRow).toBeVisible();
  const targetRoleControl = targetRow.getByRole("combobox", {
    name: `Papel de RBAC target (${fixture.actors.target.email})`,
    exact: true,
  });
  await expect(targetRoleControl).toHaveCount(1);
  await targetRoleControl.focus();
  await targetRoleControl.press("ArrowDown");
  await expect(targetRoleControl).toHaveValue("admin");
  const saveButton = targetRow.getByRole("button", { name: "Salvar", exact: true });
  await page.keyboard.press("Tab");
  await expect(saveButton).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(targetRow.getByRole("status")).toHaveText("Papel atualizado.");
  await expect(targetRow.getByRole("status")).toBeVisible();
  const roleBadge = targetRow.locator("span.role-pill");
  await expect(roleBadge).toHaveText("Administrador");
  await expect(roleBadge).toHaveClass(/role-pill--admin/);
  const persistedMembers = await db.select({ userId: schema.member.userId, role: schema.member.role })
    .from(schema.member).where(eq(schema.member.organizationId, fixture.organizationId));
  expect(persistedMembers).toHaveLength(5);
  const expectedRoles = new Map([
    [fixture.actors.owner.userId, "owner"],
    [fixture.actors.admin.userId, "admin"],
    [fixture.actors.member.userId, "member"],
    [fixture.actors.target.userId, "admin"],
    [fixture.actors.ownerPeer.userId, "owner"],
  ]);
  for (const person of persistedMembers) expect(person.role).toBe(expectedRoles.get(person.userId));
  const roleAudit = await db.select({ organizationId: schema.auditLogs.organizationId, actorUserId: schema.auditLogs.actorUserId, action: schema.auditLogs.action, entityType: schema.auditLogs.entityType, entityId: schema.auditLogs.entityId, details: schema.auditLogs.details })
    .from(schema.auditLogs)
    .where(and(
      eq(schema.auditLogs.organizationId, fixture.organizationId),
      eq(schema.auditLogs.actorUserId, fixture.actors.owner.userId),
      eq(schema.auditLogs.action, "update"),
      eq(schema.auditLogs.entityType, "member"),
      eq(schema.auditLogs.entityId, fixture.actors.target.memberId),
    ));
  expect(roleAudit).toEqual([{
    organizationId: fixture.organizationId,
    actorUserId: fixture.actors.owner.userId,
    action: "update",
    entityType: "member",
    entityId: fixture.actors.target.memberId,
    details: JSON.stringify({ from: "member", to: "admin" }),
  }]);
  await expect(page.getByText("Convites por e-mail ainda não estão configurados.")).toBeVisible();
});

for (const role of ["admin", "member"] as const) {
  test(`${role} vê a equipe sem controles de alteração de papel`, async ({ page }) => {
    await openTeamAs(page, role);
    await expect(page.getByRole("columnheader", { name: "Gerenciar" })).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: /^Papel de RBAC / })).toHaveCount(0);
    await expect(page.getByRole("row").filter({ hasText: "RBAC target" })).toBeVisible();
    await expect(page.getByText("Convites por e-mail ainda não estão configurados.")).toBeVisible();
  });
}
