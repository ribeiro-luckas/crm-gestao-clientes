import { mkdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { eq, inArray } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../../src/db/schema";
import { createIsolatedConnectionPair, type IsolatedConnectionPair } from "../helpers/test-db";
import { seedTeamRbacFixture } from "../helpers/team-rbac-fixture";
import { signInWithRateLimitRetry } from "../helpers/e2e-auth";

const viewports = [
  { width: 1440, height: 900 },
  { width: 768, height: 900 },
  { width: 390, height: 900 },
  { width: 320, height: 900 },
] as const;

const shellLinks = ["Visão geral", "Clientes", "Oportunidades", "Tarefas", "Atividades", "Equipe", "Configurações", "Ajuda"];

type AccessibleRole = "link" | "button" | "textbox" | "searchbox" | "combobox";
type ControlCheck = { role: AccessibleRole; name: string; enabled?: boolean; withinRowText?: string };
type AuditRoute = { key: string; path: string; heading: string; controls: ControlCheck[] };
type Theme = "light" | "dark";

let connection: IsolatedConnectionPair | undefined;
let db: NodePgDatabase<typeof schema> | undefined;
let fixture: Awaited<ReturnType<typeof seedTeamRbacFixture>> | undefined;
let companyClientId = "";
let openDealId = "";
let dealTitle = "";
let clientTitle = "";
let routes: AuditRoute[] = [];

const evidenceDirectory = join(process.cwd(), "test-results", "ux-visual-audit");

test.describe("UX-01.1 — matriz visual, layout e axe", () => {
  test.beforeAll(async () => {
    connection = await createIsolatedConnectionPair();
    db = drizzle(connection.poolA, { schema });
    fixture = await seedTeamRbacFixture(db);

    const suffix = randomUUID().slice(0, 8);
    clientTitle = `UX Visual Company ${suffix}`;
    const seededClients = await db.insert(schema.clients).values([
      {
        organizationId: fixture.organizationId,
        kind: "company",
        name: clientTitle,
        email: `ux-company-${suffix}@example.test`,
        phone: "+55 81 90000-0001",
        status: "active",
        source: "Fixture UX-01.1",
        notes: "Registro sintético para inspeção visual.",
        ownerUserId: fixture.actors.owner.userId,
      },
      {
        organizationId: fixture.organizationId,
        kind: "person",
        name: `UX Visual Person ${suffix}`,
        email: `ux-person-${suffix}@example.test`,
        status: "prospect",
        ownerUserId: fixture.actors.owner.userId,
      },
    ]).returning({ id: schema.clients.id, kind: schema.clients.kind });
    const company = seededClients.find((client) => client.kind === "company");
    if (!company) throw new Error("A fixture visual não criou o cliente empresarial.");
    companyClientId = company.id;

    await db.insert(schema.contacts).values({
      organizationId: fixture.organizationId,
      companyClientId,
      name: `UX Contact ${suffix}`,
      title: "Pessoa de contato sintética",
      email: `ux-contact-${suffix}@example.test`,
      phone: "+55 81 90000-0002",
    });

    const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const dealDefinitions = [
      { stage: "new_lead", title: `UX Visual Lead ${suffix}`, amount: "1200.00", expectedCloseAt: dueDate },
      { stage: "qualification", title: `UX Visual Qualification ${suffix}`, amount: "2400.00", expectedCloseAt: dueDate },
      { stage: "proposal", title: `UX Visual Proposal ${suffix}`, amount: "3600.00", expectedCloseAt: dueDate },
      { stage: "negotiation", title: `UX Visual Negotiation ${suffix}`, amount: "4800.00", expectedCloseAt: dueDate },
      { stage: "won", title: `UX Visual Won ${suffix}`, amount: "6000.00", expectedCloseAt: dueDate, closedAt: new Date() },
      { stage: "lost", title: `UX Visual Lost ${suffix}`, amount: "7200.00", expectedCloseAt: dueDate, lossReason: "Resultado sintético", closedAt: new Date() },
    ] as const;
    const dealRows = await db.insert(schema.deals).values(dealDefinitions.map((deal) => ({
      ...deal,
      organizationId: fixture!.organizationId,
      clientId: companyClientId,
      ownerUserId: fixture!.actors.owner.userId,
    }))).returning({ id: schema.deals.id, stage: schema.deals.stage, title: schema.deals.title });
    const openDeal = dealRows.find((deal) => deal.stage === "qualification");
    if (!openDeal) throw new Error("A fixture visual não criou uma oportunidade aberta.");
    openDealId = openDeal.id;
    dealTitle = openDeal.title;

    const now = Date.now();
    await db.insert(schema.tasks).values([
      {
        organizationId: fixture.organizationId,
        title: `UX Visual Upcoming ${suffix}`,
        description: "Tarefa sintética futura para auditoria.",
        priority: "high",
        status: "todo",
        dueAt: new Date(now + 2 * 24 * 60 * 60 * 1000),
        assigneeUserId: fixture.actors.owner.userId,
        clientId: companyClientId,
        dealId: openDealId,
      },
      {
        organizationId: fixture.organizationId,
        title: `UX Visual Overdue ${suffix}`,
        description: "Tarefa sintética vencida para auditoria.",
        priority: "normal",
        status: "todo",
        dueAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
        assigneeUserId: fixture.actors.owner.userId,
        clientId: companyClientId,
        dealId: openDealId,
      },
    ]);

    await db.insert(schema.activities).values([
      {
        organizationId: fixture.organizationId,
        type: "meeting",
        subject: `UX Visual Meeting ${suffix}`,
        body: "Reunião sintética futura para auditoria.",
        occurredAt: new Date(now + 3 * 24 * 60 * 60 * 1000),
        actorUserId: fixture.actors.owner.userId,
        clientId: companyClientId,
        dealId: openDealId,
      },
      {
        organizationId: fixture.organizationId,
        type: "note",
        subject: `UX Visual Note ${suffix}`,
        body: "Nota sintética para auditoria.",
        occurredAt: new Date(now - 60 * 60 * 1000),
        actorUserId: fixture.actors.owner.userId,
        clientId: companyClientId,
      },
    ]);

    routes = [
      { key: "dashboard", path: "/dashboard", heading: "Visão geral", controls: [{ role: "link", name: "Nova oportunidade" }, { role: "link", name: "Ver oportunidades" }] },
      { key: "clients", path: "/clients", heading: "Clientes", controls: [{ role: "searchbox", name: "Pesquisar clientes" }, { role: "combobox", name: "Filtrar por status" }, { role: "link", name: "Novo cliente" }] },
      { key: "client-detail", path: `/clients/${companyClientId}`, heading: clientTitle, controls: [{ role: "link", name: "Editar" }, { role: "button", name: "Registrar atividade" }] },
      { key: "client-new", path: "/clients/new", heading: "Cadastrar cliente", controls: [{ role: "combobox", name: "Tipo de cliente" }, { role: "textbox", name: "Nome" }, { role: "button", name: "Salvar cliente" }] },
      { key: "client-edit", path: `/clients/${companyClientId}/edit`, heading: "Editar cliente", controls: [{ role: "combobox", name: "Tipo de cliente", enabled: false }, { role: "textbox", name: "Nome" }, { role: "button", name: "Salvar alterações" }] },
      { key: "kanban", path: "/deals", heading: "Oportunidades", controls: [{ role: "searchbox", name: "Buscar oportunidades" }, { role: "combobox", name: "Filtrar por etapa" }, { role: "link", name: "Nova oportunidade" }] },
      { key: "deal-detail", path: `/deals/${openDealId}`, heading: dealTitle, controls: [{ role: "link", name: "Editar" }, { role: "combobox", name: "Etapa da oportunidade" }, { role: "button", name: "Atualizar etapa" }] },
      { key: "deal-new", path: `/deals/new?clientId=${companyClientId}`, heading: "Criar oportunidade", controls: [{ role: "combobox", name: "Cliente relacionado" }, { role: "textbox", name: "Nome da oportunidade" }, { role: "button", name: "Criar oportunidade" }] },
      { key: "deal-edit", path: `/deals/${openDealId}/edit`, heading: "Editar oportunidade", controls: [{ role: "combobox", name: "Cliente relacionado" }, { role: "textbox", name: "Nome da oportunidade" }, { role: "button", name: "Salvar alterações" }] },
      { key: "tasks", path: "/tasks", heading: "Tarefas", controls: [{ role: "searchbox", name: "Buscar tarefas" }, { role: "combobox", name: "Filtrar por vencimento" }, { role: "link", name: "Nova tarefa" }] },
      { key: "task-new", path: "/tasks/new", heading: "Criar tarefa", controls: [{ role: "textbox", name: "Título" }, { role: "combobox", name: "Prioridade" }, { role: "button", name: "Criar tarefa" }] },
      { key: "activities", path: "/activities", heading: "Atividades", controls: [{ role: "searchbox", name: "Buscar atividades" }, { role: "button", name: "Pesquisar" }] },
      { key: "team", path: "/team", heading: "Equipe", controls: [{ role: "combobox", name: `Papel de RBAC admin (${fixture.actors.admin.email})`, withinRowText: "RBAC admin" }] },
      { key: "search", path: "/search?q=UX%20Visual", heading: "Buscar no CRM", controls: [{ role: "searchbox", name: "Termo de busca" }, { role: "button", name: "Pesquisar" }] },
      { key: "settings", path: "/settings", heading: "Configurações", controls: [{ role: "button", name: "Claro" }, { role: "button", name: "Escuro" }] },
    ];
  });

  test.afterAll(async () => {
    const errors: unknown[] = [];
    try {
      if (fixture) {
        try { await fixture.cleanup(); } catch (error) { errors.push(error); }
        try {
          if (!db) throw new Error("Conexão Drizzle ausente durante a verificação de cleanup.");
          const userIds = Object.values(fixture.actors).map((actor) => actor.userId);
          const residues = await Promise.all([
            db.select({ id: schema.organization.id }).from(schema.organization).where(eq(schema.organization.id, fixture.organizationId)),
            db.select({ id: schema.member.id }).from(schema.member).where(eq(schema.member.organizationId, fixture.organizationId)),
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
          if (residues.some((rows) => rows.length > 0)) throw new Error("Fixture de UX visual deixou resíduos após cleanup escopado.");
        } catch (error) { errors.push(error); }
      }
    } finally {
      if (connection) await connection.cleanup();
    }
    if (errors.length) throw new AggregateError(errors, "Falha no cleanup da auditoria visual UX-01.1.");
  });

  test("captura login em 1440, 768, 390 e 320 px", async ({ page }) => {
    await mkdir(evidenceDirectory, { recursive: true });
    await page.goto("/login");

    const layoutEvidence: Array<Record<string, unknown>> = [];
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await expect(page.getByRole("main")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Seu próximo passo começa aqui." })).toBeVisible();
      await expect(page.getByLabel("E-mail*", { exact: true })).toBeVisible();
      await expect(page.getByLabel("Senha*", { exact: true })).toBeVisible();
      await page.evaluate(async () => { await document.fonts.ready; });

      const layout = await measureLayout(page);
      layoutEvidence.push({ page: "login", ...viewport, ...layout });
      await page.screenshot({
        path: join(evidenceDirectory, `login-${viewport.width}.png`),
        fullPage: true,
        animations: "disabled",
        caret: "hide",
      });
      expect.soft(layout.documentHasHorizontalOverflow, `overflow do documento em login a ${viewport.width}px`).toBe(false);
    }

    await writeLayoutEvidence("layout-login.json", layoutEvidence);
  });

  test("captura rotas comerciais autenticadas na matriz de quatro larguras", async ({ page }) => {
    // This audit visits 15 routes at four widths; isolated runtime measured 47.6s.
    test.setTimeout(75_000);
    await mkdir(evidenceDirectory, { recursive: true });
    await signInAsOwner(page);

    const layoutEvidence: Array<Record<string, unknown>> = [];
    for (const route of routes) {
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.goto(route.path);
        await expect(page.getByRole("main")).toBeVisible();
        await expect(page.getByRole("navigation", { name: "Navegação principal" })).toBeVisible();
        await expect(page.getByRole("heading", { level: 1, name: route.heading, exact: true })).toBeVisible();

        for (const control of route.controls) {
          const scope = control.withinRowText
            ? page.getByRole("row").filter({ hasText: control.withinRowText })
            : page;
          const locator = scope.getByRole(control.role, { name: control.name, exact: true });
          await expect(locator, `${route.key}: ${control.role} ${control.name}`).toBeVisible();
          if (control.enabled === false) {
            await expect(locator, `${route.key}: ${control.role} ${control.name} desabilitado`).toBeDisabled();
          } else {
            await expect(locator, `${route.key}: ${control.role} ${control.name} habilitado`).toBeEnabled();
          }
        }
        for (const name of shellLinks) {
          await expect(page.getByRole("link", { name, exact: true }), `${route.key}: navegação ${name}`).toBeVisible();
        }
        await expect(page.getByRole("button", { name: "Sair", exact: true })).toBeVisible();

        const brandName = viewport.width <= 820 ? "rota ." : "rota . CRM COMERCIAL";
        const brand = page.getByRole("link", { name: brandName, exact: true });
        await expect(brand).toHaveAttribute("href", "/");
        await expect(page.getByRole("link", { name: "Pular para o conteúdo", exact: true })).toHaveAttribute("href", "#main-content");
        await page.evaluate(async () => { await document.fonts.ready; });

        const layout = await measureLayout(page);
        if ((route.key === "clients" || route.key === "tasks") && viewport.width <= 390) {
          const overflowDiagnostics = await diagnoseDocumentOverflow(page, route.key);
          layoutEvidence.push({
            page: route.key,
            width: viewport.width,
            overflowDiagnostics,
          });
          await writeLayoutEvidence("layout-authenticated.json", layoutEvidence);
          const tableRestorations = [
            overflowDiagnostics.tableIsolation,
            ...Object.values(overflowDiagnostics.tableExperiments),
          ].filter((experiment) => experiment.present);
          for (const experiment of tableRestorations) {
            const restoration = "restoration" in experiment ? experiment.restoration : undefined;
            if (!restoration) continue;
            expect.soft(restoration.styleExactlyRestored, `${route.key}/${viewport.width}: atributo style restaurado em ${experiment.selector}`).toBe(true);
            expect.soft(restoration.scrollLeftRestored, `${route.key}/${viewport.width}: scrollLeft restaurado em ${experiment.selector}`).toBe(true);
            expect.soft(restoration.sameNodesConnected, `${route.key}/${viewport.width}: nós conectados em ${experiment.selector}`).toBe(true);
            expect.soft(restoration.nodeOrderUnchanged, `${route.key}/${viewport.width}: ordem dos nós em ${experiment.selector}`).toBe(true);
            expect.soft(restoration.markupUnchanged, `${route.key}/${viewport.width}: markup em ${experiment.selector}`).toBe(true);
            expect.soft(restoration.tableStructureUnchanged, `${route.key}/${viewport.width}: estrutura semântica em ${experiment.selector}`).toBe(true);
            expect.soft(restoration.temporaryStylesheetRemoved, `${route.key}/${viewport.width}: folha temporária removida em ${experiment.selector}`).toBe(true);
          }
          for (const isolation of [overflowDiagnostics.progressiveMainIsolation, ...Object.values(overflowDiagnostics.shellIsolation)]) {
            const restoredStage = isolation.stages.find((stage) => stage.stage === "restored");
            if (restoredStage) {
              expect.soft(restoredStage.allOriginalStylesRestored, `${route.key}/${viewport.width}: estilos do isolamento restaurados em ${isolation.selector}`).toBe(true);
              expect.soft(restoredStage.sameNodesConnected, `${route.key}/${viewport.width}: nós do isolamento conectados em ${isolation.selector}`).toBe(true);
              expect.soft(restoredStage.temporaryStylesheetRemoved, `${route.key}/${viewport.width}: folha temporária removida em ${isolation.selector}`).toBe(true);
            }
          }
          for (const [check, passed] of Object.entries(overflowDiagnostics.finalDOMRestoration)) {
            expect.soft(passed, `${route.key}/${viewport.width}: estado final do DOM (${check})`).toBe(true);
          }
          await expect(page.getByRole("table")).toHaveCount(1);
          await expect(page.getByRole("table")).toBeVisible();
        }
        layoutEvidence.push({ page: route.key, path: route.path, ...viewport, ...layout });
        await writeLayoutEvidence("layout-authenticated.json", layoutEvidence);
        const screenshotPath = join(evidenceDirectory, `${route.key}-${viewport.width}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true, animations: "disabled", caret: "hide" });
        expect.soft(layout.documentHasHorizontalOverflow, `overflow do documento em ${route.key} a ${viewport.width}px`).toBe(false);

        if (route.key === "kanban") {
          const board = page.locator(".board-scroll");
          const boardMetrics = await board.evaluate((element) => ({ clientWidth: element.clientWidth, scrollWidth: element.scrollWidth }));
          if (viewport.width <= 768) {
            expect.soft(boardMetrics.scrollWidth, `rolagem interna do Kanban em ${viewport.width}px`).toBeGreaterThan(boardMetrics.clientWidth);
            await board.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
            await page.screenshot({
              path: join(evidenceDirectory, `kanban-${viewport.width}-right.png`),
              animations: "disabled",
              caret: "hide",
            });
            await board.evaluate((element) => { element.scrollLeft = 0; });
          }
          await expect(board.getByRole("region")).toHaveCount(6);
          await expect(board.getByRole("heading", { level: 2 })).toHaveCount(6);
          await expect(page.getByRole("combobox", { name: "Etapa da oportunidade" })).toHaveCount(6);
        }

        if (route.key === "clients" || route.key === "tasks" || route.key === "team") {
          const tables = page.getByRole("table");
          const expectedTableCount = route.key === "team" ? 2 : 1;
          await expect(tables).toHaveCount(expectedTableCount);
          for (const table of await tables.all()) await expect(table).toBeVisible();

          if (route.key === "team") {
            await expect(page.getByRole("region", { name: "Membros do workspace" }).getByRole("table")).toBeVisible();
            await expect(page.getByRole("table", { name: /Responsabilidades comerciais dos membros/ })).toBeVisible();
          }

          const tableContainers = await page.locator(".table-wrap").evaluateAll((elements) => elements.map((element) => {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return {
              className: typeof element.className === "string" ? element.className : "",
              accessibleName: element.getAttribute("aria-label"),
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              width: Math.round(rect.width),
              clientWidth: element.clientWidth,
              scrollWidth: element.scrollWidth,
              overflowX: style.overflowX,
              intentionallyScrollable: element.scrollWidth > element.clientWidth,
            };
          }));
          layoutEvidence.push({ page: route.key, viewport: viewport.width, tableContainers });
          await writeLayoutEvidence("layout-authenticated.json", layoutEvidence);
        }
      }
    }

    await writeLayoutEvidence("layout-authenticated.json", layoutEvidence);
  });

  test("UX-01.3 — navegação por teclado isolada na tabela de clientes", async ({ page }) => {
    await mkdir(evidenceDirectory, { recursive: true });
    const captures: Array<Record<string, unknown>> = [];

    for (const width of [390, 320]) {
      for (const mode of ["with-contain", "without-contain"] as const) {
        captures.push(await runIsolatedClientKeyboardPass(page.context(), width, mode));
      }
    }

    await writeLayoutEvidence("keyboard-focus-isolation.json", captures);

    for (const capture of captures) {
      const mode = String(capture.mode);
      const width = Number(capture.width);
      const links = capture.links as Array<{
        index: number;
        forward: { afterFrame: FocusMeasurement };
        reverse?: { afterFrame: FocusMeasurement };
      }>;
      expect.soft(capture.searchReached, `${mode} ${width}px: Tab alcança a busca partindo do documento`).toBe(true);
      expect.soft(capture.statusFocused, `${mode} ${width}px: Tab alcança o filtro de status`).toBe(true);
      expect.soft(capture.filterFocused, `${mode} ${width}px: Tab alcança o botão Filtrar`).toBe(true);
      const initial = capture.initial as { scrollLeft: number; overflowX: string; clientWidth: number; scrollWidth: number };
      expect.soft(initial.scrollLeft, `${mode} ${width}px: viewport horizontal começa em zero`).toBe(0);
      expect.soft(capture.startScrollLeft, `${mode} ${width}px: tabela reiniciada em zero antes do Tab`).toBe(0);
      expect.soft(initial.overflowX, `${mode} ${width}px: tabela mantém sua rolagem interna`).toBe("auto");
      if (width <= 390) expect.soft(initial.scrollWidth, `${mode} ${width}px: tabela mantém conteúdo além do viewport interno`).toBeGreaterThan(initial.clientWidth);
      expect.soft(links, `${mode} ${width}px: quatro links da tabela registrados`).toHaveLength(4);
      for (const link of links) {
        for (const direction of [link.forward, link.reverse].filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))) {
          expect.soft(direction.afterFrame.isActiveElement, `${mode} ${width}px: link ${link.index + 1} recebeu foco real`).toBe(true);
          expect.soft(direction.afterFrame.visibleIntersection.ratio, `${mode} ${width}px: link ${link.index + 1} totalmente visível`).toBe(1);
          expect.soft(direction.afterFrame.outlineStyle, `${mode} ${width}px: link ${link.index + 1} mostra contorno`).toBe("solid");
          expect.soft(Number.parseFloat(direction.afterFrame.outlineWidth), `${mode} ${width}px: largura do foco do link ${link.index + 1}`).toBeGreaterThanOrEqual(3);
          expect.soft(direction.afterFrame.outlineWithinScrollport, `${mode} ${width}px: contorno do link ${link.index + 1} não é cortado`).toBe(true);
        }
      }
      expect.soft(capture.returnToFilterButtonFocused, `${mode} ${width}px: Shift+Tab volta ao filtro`).toBe(true);
      expect.soft(capture.domRestored, `${mode} ${width}px: DOM/atributo style/scroll restaurados`).toBe(true);
      expect.soft(capture.containRestored, `${mode} ${width}px: regra CSS original voltou após remover override`).toBe(true);
      if (mode === "with-contain") {
        expect.soft(capture.initialContain, `${width}px: containment de produção presente`).toContain("paint");
        expect.soft(capture.documentScrollWidth, `${width}px: sem overflow horizontal do documento`).toBe(width);
      } else {
        expect.soft(capture.initialContain, `${width}px: override removeu containment`).not.toContain("paint");
      }
      if (width <= 390) {
        expect.soft(capture.lastColumnScrollLeft, `${mode} ${width}px: a navegação alcança a última coluna`).toBeGreaterThan(0);
      }
    }
  });

  test("grava resultados axe das páginas prioritárias nos dois temas", async ({ page }) => {
    await mkdir(evidenceDirectory, { recursive: true });
    await signInAsOwner(page);

    const axeRoutes = [
      { key: "dashboard", navigationName: "Visão geral", heading: "Visão geral" },
      { key: "clients", navigationName: "Clientes", heading: "Clientes" },
      { key: "kanban", navigationName: "Oportunidades", heading: "Oportunidades" },
      { key: "tasks", navigationName: "Tarefas", heading: "Tarefas" },
      { key: "activities", navigationName: "Atividades", heading: "Atividades" },
      { key: "team", navigationName: "Equipe", heading: "Equipe" },
      { key: "search", navigationName: "Pesquisar no CRM", heading: "Buscar no CRM" },
      { key: "settings", navigationName: "Configurações", heading: "Configurações" },
    ];
    const findings: Array<Record<string, unknown>> = [];
    const scanSummary: Array<{ page: string; theme: Theme; width: number; violations: number }> = [];

    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const theme of ["light", "dark"] as const) {
        await page.goto("/settings");
        await expect(page.getByRole("heading", { level: 1, name: "Configurações" })).toBeVisible();
        await page.getByRole("button", { name: theme === "dark" ? "Escuro" : "Claro", exact: true }).click();
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await page.evaluate(async () => { await document.fonts.ready; });
        if (theme === "dark") {
          await page.screenshot({
            path: join(evidenceDirectory, `settings-${width}-${theme}.png`),
            fullPage: true,
            animations: "disabled",
            caret: "hide",
          });
        }

        for (const route of axeRoutes) {
          await page.getByRole("link", { name: route.navigationName, exact: true }).click();
          await expect(page.getByRole("heading", { level: 1, name: route.heading, exact: true })).toBeVisible();
          await page.evaluate(async () => { await document.fonts.ready; });

          const results = await new AxeBuilder({ page }).analyze();
          scanSummary.push({ page: route.key, theme, width, violations: results.violations.length });
          for (const violation of results.violations) {
            findings.push({
              page: route.key,
              theme,
              width,
              rule: violation.id,
              impact: violation.impact ?? null,
              description: violation.description,
              help: violation.help,
              helpUrl: violation.helpUrl,
              elements: violation.nodes.map((node) => ({ target: node.target, impact: node.impact ?? null, failureSummary: node.failureSummary ?? null })),
            });
          }
        }
      }
    }

    const reportPath = join(evidenceDirectory, "axe-results.json");
    await writeFile(reportPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), scans: scanSummary, findings }, null, 2)}\n`);
    console.log(`[ux-visual-audit] ${scanSummary.length} varreduras axe; ${findings.length} violações; relatório ${relative(process.cwd(), reportPath)}`);
    expect(findings, "axe encontrou violações; consulte test-results/ux-visual-audit/axe-results.json").toEqual([]);
  });

  test("verifica teclado, foco visível e movimento reduzido em tela baixa", async ({ page }) => {
    await signInAsOwner(page);
    await page.setViewportSize({ width: 1440, height: 600 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { level: 1, name: "Visão geral" })).toBeVisible();

    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: "Pular para o conteúdo", exact: true });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toHaveCSS("outline-style", "solid");
    const focusOutlineWidth = await skipLink.evaluate((element) => Number.parseFloat(getComputedStyle(element).outlineWidth));
    expect(focusOutlineWidth).toBeGreaterThanOrEqual(3);

    await page.keyboard.press("Tab");
    const brand = page.getByRole("link", { name: "rota . CRM COMERCIAL", exact: true });
    await expect(brand).toBeFocused();
    await page.keyboard.press("Tab");
    const workspaceSwitcher = page.locator(".workspace-switcher");
    await expect(workspaceSwitcher).toBeVisible();
    await expect(workspaceSwitcher).toBeFocused();
    await expect(workspaceSwitcher).toHaveAccessibleName(/RBAC Test Workspace.*Trocar workspace/);
    await expect(workspaceSwitcher).toHaveCSS("outline-style", "solid");
    const workspaceOutlineWidth = await workspaceSwitcher.evaluate((element) => Number.parseFloat(getComputedStyle(element).outlineWidth));
    expect(workspaceOutlineWidth).toBeGreaterThanOrEqual(3);

    const transitionDurationMs = await page.getByRole("link", { name: "Nova oportunidade" }).evaluate((element) => {
      const seconds = getComputedStyle(element).transitionDuration.split(",").map((value) => Number.parseFloat(value));
      return Math.max(...seconds) * 1000;
    });
    expect(transitionDurationMs).toBeLessThanOrEqual(0.02);

    const mainNavLinks = page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link");
    await expect(mainNavLinks).toHaveCount(6);
    await page.keyboard.press("Tab");
    await expect(mainNavLinks.nth(0)).toBeFocused();
    await expect(mainNavLinks.nth(0)).toHaveCSS("outline-style", "solid");
    for (let index = 1; index < 6; index += 1) {
      await page.keyboard.press("Tab");
      await expect(mainNavLinks.nth(index)).toBeFocused();
    }

    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Configurações", exact: true })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(mainNavLinks.nth(5)).toBeFocused();
    for (let index = 4; index >= 0; index -= 1) {
      await page.keyboard.press("Shift+Tab");
      await expect(mainNavLinks.nth(index)).toBeFocused();
    }
    await page.keyboard.press("Shift+Tab");
    await expect(workspaceSwitcher).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(brand).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(skipLink).toBeFocused();
  });
});

async function signInAsOwner(page: Page) {
  if (!fixture) throw new Error("Fixture sintética UX-01.1 ausente.");
  const identity = fixture.actors.owner;
  const response = await signInWithRateLimitRetry(page.request, { email: identity.email, password: identity.password }, "http://127.0.0.1:3100");
  expect(response.ok(), `login da fixture UX retornou HTTP ${response.status()}`).toBe(true);
}

async function measureLayout(page: Page) {
  return page.evaluate(() => {
    const documentWidth = document.documentElement.scrollWidth;
    const viewportWidth = document.documentElement.clientWidth;
    const describe = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        tagName: element.tagName.toLowerCase(),
        id: element.id,
        className: typeof element.className === "string" ? element.className : "",
        accessibleName: element.getAttribute("aria-label"),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
        cssWidth: style.width,
        minWidth: style.minWidth,
        maxWidth: style.maxWidth,
        display: style.display,
        position: style.position,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        overflowX: style.overflowX,
      };
    };
    const scrollAreas = Array.from(document.querySelectorAll<HTMLElement>(".board-scroll, .table-wrap")).map((element) => ({
      ...describe(element),
      hasInternalHorizontalScroll: element.scrollWidth > element.clientWidth,
      content: Array.from(element.children).map((child) => describe(child as HTMLElement)),
    }));
    const overflowCandidates = Array.from(document.body.querySelectorAll<HTMLElement>("*"))
      .flatMap((element) => {
        const rect = element.getBoundingClientRect();
        if ((rect.right <= viewportWidth + 1 && rect.left >= -1) || rect.width === 0) return [];
        const ancestors: HTMLElement[] = [];
        let clippingAncestor: HTMLElement | null = null;
        for (let ancestor = element.parentElement; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
          const ancestorStyle = getComputedStyle(ancestor);
          ancestors.push(ancestor);
          if (!clippingAncestor && ["auto", "scroll", "hidden", "clip"].includes(ancestorStyle.overflowX)) clippingAncestor = ancestor;
        }
        if (clippingAncestor) return [];
        if (ancestors.some((ancestor) => {
          const ancestorRect = ancestor.getBoundingClientRect();
          return ancestorRect.right > viewportWidth + 1 || ancestorRect.left < -1;
        })) return [];
        return [{ element, rect, ancestors }];
      })
      .map(({ element, rect, ancestors }) => ({
        ...describe(element),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
        outsideLeft: rect.left < -1,
        outsideRight: rect.right > viewportWidth + 1,
        ancestorChain: ancestors.slice(0, 8).map(describe),
      }))
      .sort((left, right) => right.right - left.right || right.width - left.width);
    const bodyChildren = Array.from(document.body.children).map((element) => describe(element as HTMLElement));
    const rootPseudoElements = ["html", "body"].flatMap((selector) => ["::before", "::after"].map((pseudo) => {
      const style = getComputedStyle(document.querySelector(selector)!, pseudo);
      return { selector: `${selector}${pseudo}`, content: style.content, width: style.width, minWidth: style.minWidth, maxWidth: style.maxWidth, display: style.display, position: style.position, left: style.left, right: style.right, overflowX: style.overflowX };
    }));
    return {
      documentWidth,
      viewportWidth,
      bodyWidth: document.body.scrollWidth,
      documentElement: describe(document.documentElement),
      body: describe(document.body),
      documentHasHorizontalOverflow: documentWidth > viewportWidth,
      overflowCandidates,
      bodyChildren,
      rootPseudoElements,
      scrollAreas,
    };
  });
}

async function diagnoseDocumentOverflow(page: Page, routeKey: "clients" | "tasks") {
  return page.evaluate(async (route) => {
    const html = document.documentElement;
    const originalX = window.scrollX;
    const originalY = window.scrollY;

    const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const readMetrics = () => ({
      viewportWidth: html.clientWidth,
      htmlClientWidth: html.clientWidth,
      htmlScrollWidth: html.scrollWidth,
      bodyClientWidth: document.body.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      windowScrollX: window.scrollX,
      windowScrollY: window.scrollY,
      maxHorizontalScroll: Math.max(0, html.scrollWidth - html.clientWidth),
    });
    const snapshotStyle = (element: HTMLElement) => ({
      present: element.hasAttribute("style"),
      value: element.getAttribute("style"),
    });
    const createTemporaryRule = (selector: string, changes: Array<{ property: string; value: string; priority?: string }>) => {
      const styleElement = document.createElement("style");
      styleElement.dataset.uxOverflowDiagnostic = "true";
      styleElement.textContent = `${selector} { ${changes.map((change) => `${change.property}: ${change.value}${change.priority ? " !important" : ""};`).join(" ")} }`;
      document.head.append(styleElement);
      return styleElement;
    };
    const runStyleExperiment = async (
      selector: string,
      changes: Array<{ property: string; value: string; priority?: string }>,
      testInternalScroll = false,
    ) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) return { selector, present: false };
      const originalNodes = [element, ...Array.from(element.querySelectorAll<HTMLElement>("*"))];
      const originalStyles = originalNodes.map(snapshotStyle);
      const originalScrollLeft = element.scrollLeft;
      const before = readMetrics();
      const originalMarkup = element.innerHTML;
      const tableStructureBefore = {
        tableCount: element.querySelectorAll("table").length,
        rowCount: element.querySelectorAll("tr").length,
        cellCount: element.querySelectorAll("th, td").length,
        linkCount: element.querySelectorAll("a").length,
      };
      let during: Record<string, unknown> = {};
      let internalScroll: Record<string, unknown> | null = null;
      let thrown: string | null = null;
      let styleElement: HTMLStyleElement | undefined;
      try {
        styleElement = createTemporaryRule(selector, changes);
        await nextFrame();
        const style = getComputedStyle(element);
        during = {
          metrics: readMetrics(),
          computed: {
            width: style.width,
            minWidth: style.minWidth,
            maxWidth: style.maxWidth,
            overflowX: style.overflowX,
            overflowY: style.overflowY,
            contain: style.contain,
            clipPath: style.clipPath,
            scrollWidth: element.scrollWidth,
            clientWidth: element.clientWidth,
            scrollLeft: element.scrollLeft,
          },
          tableStructure: {
            tableCount: element.querySelectorAll("table").length,
            rowCount: element.querySelectorAll("tr").length,
            cellCount: element.querySelectorAll("th, td").length,
            linkCount: element.querySelectorAll("a").length,
          },
        };
        if (testInternalScroll) {
          const maxScrollLeft = Math.max(0, element.scrollWidth - element.clientWidth);
          element.scrollLeft = maxScrollLeft;
          await nextFrame();
          internalScroll = {
            maxScrollLeft,
            scrollLeftAfterAttempt: element.scrollLeft,
            scrollAdvanced: element.scrollLeft > 0,
            reachesEnd: maxScrollLeft === 0 || element.scrollLeft >= maxScrollLeft - 1,
          };
        }
      } catch (error) {
        thrown = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      } finally {
        styleElement?.remove();
        element.scrollLeft = originalScrollLeft;
        await nextFrame();
      }
      const stylesAfter = originalNodes.map(snapshotStyle);
      const structureAfter = {
        tableCount: element.querySelectorAll("table").length,
        rowCount: element.querySelectorAll("tr").length,
        cellCount: element.querySelectorAll("th, td").length,
        linkCount: element.querySelectorAll("a").length,
      };
      const restoration = {
        originalStyles,
        stylesAfter,
        styleExactlyRestored: originalStyles.every((style, index) => style.present === stylesAfter[index].present && style.value === stylesAfter[index].value),
        scrollLeftRestored: element.scrollLeft === originalScrollLeft,
        sameNodesConnected: originalNodes.every((node) => node.isConnected),
        nodeOrderUnchanged: originalNodes.every((node, index) => node === [element, ...Array.from(element.querySelectorAll<HTMLElement>("*"))][index]),
        markupUnchanged: element.innerHTML === originalMarkup,
        temporaryStylesheetRemoved: !styleElement?.isConnected,
        tableStructureUnchanged: JSON.stringify(tableStructureBefore) === JSON.stringify(structureAfter),
      };
      if (thrown) throw new Error(`Experimento ${selector} (${changes.map((change) => change.property).join(", ")}) falhou: ${thrown}`);
      return { selector, present: true, before, during, internalScroll, afterRestore: readMetrics(), restoration };
    };
    const beforeScroll = readMetrics();
    let afterScrollAttempt = beforeScroll;
    let afterScrollRestore = beforeScroll;
    try {
      window.scrollTo({ left: html.scrollWidth, top: originalY, behavior: "auto" });
      await nextFrame();
      afterScrollAttempt = readMetrics();
    } finally {
      window.scrollTo({ left: originalX, top: originalY, behavior: "auto" });
      await nextFrame();
      afterScrollRestore = readMetrics();
    }

    const originalTableWrap = document.querySelector<HTMLElement>(".table-wrap");
    const originalTableNodes = originalTableWrap
      ? [originalTableWrap, ...Array.from(originalTableWrap.querySelectorAll<HTMLElement>("*"))]
      : [];
    const originalTableStyles = originalTableNodes.map(snapshotStyle);
    const originalTableMarkup = originalTableWrap?.innerHTML ?? null;
    const originalTableScrollLeft = originalTableWrap?.scrollLeft ?? 0;
    const originalDiagnosticStyleCount = document.querySelectorAll("style[data-ux-overflow-diagnostic]").length;
    const tableIsolation = await runStyleExperiment(".table-wrap", [{ property: "display", value: "none", priority: "important" }]);
    const tableExperiments = {
      hideTable: await runStyleExperiment(".table-wrap table.data-table", [{ property: "display", value: "none", priority: "important" }]),
      hideHead: await runStyleExperiment(".table-wrap table.data-table thead", [{ property: "display", value: "none", priority: "important" }]),
      hideBody: await runStyleExperiment(".table-wrap table.data-table tbody", [{ property: "display", value: "none", priority: "important" }]),
      containPaint: await runStyleExperiment(".table-wrap", [{ property: "contain", value: "paint" }], true),
      clipPath: await runStyleExperiment(".table-wrap", [{ property: "clip-path", value: "inset(0)" }], true),
      overflowClip: await runStyleExperiment(".table-wrap", [{ property: "overflow-x", value: "clip" }], true),
    };

    const tableWrap = document.querySelector<HTMLElement>(".table-wrap");
    const table = document.querySelector<HTMLElement>(".table-wrap table.data-table");
    const tableWrapRect = tableWrap?.getBoundingClientRect();
    const tableDescendants = tableWrap && tableWrapRect
      ? [tableWrap, ...Array.from(tableWrap.querySelectorAll<HTMLElement>("*"))]
        .map((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          const outsideWrap = rect.left < tableWrapRect.left - 1 || rect.right > tableWrapRect.right + 1;
          if (!outsideWrap && style.position === "static" && style.transform === "none" && element.scrollWidth <= element.clientWidth + 1) return null;
          const ancestorChain: Array<Record<string, unknown>> = [];
          for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
            const ancestorStyle = getComputedStyle(ancestor);
            const ancestorRect = ancestor.getBoundingClientRect();
            ancestorChain.push({
              tagName: ancestor.tagName.toLowerCase(),
              className: typeof ancestor.className === "string" ? ancestor.className : "",
              left: Math.round(ancestorRect.left),
              right: Math.round(ancestorRect.right),
              width: Math.round(ancestorRect.width),
              minWidth: ancestorStyle.minWidth,
              position: ancestorStyle.position,
              overflowX: ancestorStyle.overflowX,
              scrollWidth: ancestor.scrollWidth,
              clientWidth: ancestor.clientWidth,
            });
            if (ancestor === tableWrap) break;
          }
          return {
            tagName: element.tagName.toLowerCase(),
            id: element.id,
            className: typeof element.className === "string" ? element.className : "",
            text: (element.textContent ?? "").trim().slice(0, 100),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
            offsetWidth: element.offsetWidth,
            scrollWidth: element.scrollWidth,
            clientWidth: element.clientWidth,
            widthStyle: style.width,
            minWidth: style.minWidth,
            maxWidth: style.maxWidth,
            position: style.position,
            transform: style.transform,
            overflowX: style.overflowX,
            boxSizing: style.boxSizing,
            whiteSpace: style.whiteSpace,
            marginInline: `${style.marginLeft} ${style.marginRight}`,
            paddingInline: `${style.paddingLeft} ${style.paddingRight}`,
            contain: style.contain,
            clipPath: style.clipPath,
            outsideWrap,
            ancestorChain,
          };
        })
        .filter((element): element is NonNullable<typeof element> => element !== null)
      : [];
    const tablePseudoElements = tableWrap && table
      ? [tableWrap, table, ...Array.from(table.querySelectorAll<HTMLElement>("*"))]
        .flatMap((element) => (["::before", "::after"] as const).map((pseudo) => {
          const style = getComputedStyle(element, pseudo);
          return {
            selector: `${element.tagName.toLowerCase()}${element.className && typeof element.className === "string" ? `.${element.className.trim().split(/\s+/).join(".")}` : ""}${pseudo}`,
            content: style.content,
            width: style.width,
            minWidth: style.minWidth,
            position: style.position,
            left: style.left,
            right: style.right,
            transform: style.transform,
          };
        }))
        .filter((pseudo) => pseudo.content !== "none" && pseudo.content !== "normal")
      : [];

    const isolateChildren = async (selector: string) => {
      const container = document.querySelector<HTMLElement>(selector);
      if (!container) return { selector, present: false, stages: [] as Array<Record<string, unknown>> };
      const children = Array.from(container.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
      const originalNodes = children.flatMap((child) => [child, ...Array.from(child.querySelectorAll<HTMLElement>("*"))]);
      const originalStyles = originalNodes.map(snapshotStyle);
      const stages: Array<Record<string, unknown>> = [{ stage: "before", metrics: readMetrics(), childCount: children.length }];
      let styleElement: HTMLStyleElement | undefined;
      try {
        for (const [index, child] of children.entries()) {
          const rect = child.getBoundingClientRect();
          const style = getComputedStyle(child);
          const hiddenSelectors = children.slice(0, index + 1).map((_, childIndex) => `${selector} > :nth-child(${childIndex + 1})`);
          const temporarySelector = hiddenSelectors.join(", ");
          if (styleElement) styleElement.textContent = `${temporarySelector} { display: none !important; }`;
          else styleElement = createTemporaryRule(temporarySelector, [{ property: "display", value: "none", priority: "important" }]);
          await nextFrame();
          stages.push({
            stage: "cumulative-hide",
            index,
            tagName: child.tagName.toLowerCase(),
            id: child.id,
            className: typeof child.className === "string" ? child.className : "",
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
            computedWidth: style.width,
            minWidth: style.minWidth,
            displayBeforeHide: style.display,
            metrics: readMetrics(),
          });
        }
      } finally {
        styleElement?.remove();
        await nextFrame();
      }
      const stylesAfter = originalNodes.map(snapshotStyle);
      const allOriginalStylesRestored = originalStyles.every((style, index) => style.present === stylesAfter[index].present && style.value === stylesAfter[index].value);
      stages.push({
        stage: "restored",
        metrics: readMetrics(),
        allOriginalStylesRestored,
        sameNodesConnected: originalNodes.every((node) => node.isConnected),
        temporaryStylesheetRemoved: !styleElement?.isConnected,
      });
      return { selector, present: true, stages };
    };
    const progressiveMainIsolation = await isolateChildren("main#main-content");
    const shellIsolation = {
      appFrame: await isolateChildren(".app-frame"),
      mainColumn: await isolateChildren(".main-column"),
    };
    const currentTableNodes = originalTableWrap
      ? [originalTableWrap, ...Array.from(originalTableWrap.querySelectorAll<HTMLElement>("*"))]
      : [];
    const currentTableStyles = currentTableNodes.map(snapshotStyle);
    const finalDOMRestoration = {
      tableNodesUnchanged: originalTableNodes.length === currentTableNodes.length && originalTableNodes.every((node, index) => node === currentTableNodes[index] && node.isConnected),
      tableStyleAttributesUnchanged: originalTableStyles.length === currentTableStyles.length && originalTableStyles.every((style, index) => style.present === currentTableStyles[index].present && style.value === currentTableStyles[index].value),
      tableMarkupUnchanged: (originalTableWrap?.innerHTML ?? null) === originalTableMarkup,
      tableScrollLeftRestored: (originalTableWrap?.scrollLeft ?? 0) === originalTableScrollLeft,
      windowScrollRestored: window.scrollX === originalX && window.scrollY === originalY,
      temporaryStylesheetsRemoved: document.querySelectorAll("style[data-ux-overflow-diagnostic]").length === originalDiagnosticStyleCount,
    };

    const viewportWidth = html.clientWidth;
    const elementCandidates = Array.from(document.body.querySelectorAll<HTMLElement>("*"))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const ancestorChain: Array<Record<string, unknown>> = [];
        let scrollableAncestor: HTMLElement | null = null;
        for (let ancestor = element.parentElement; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
          const ancestorStyle = getComputedStyle(ancestor);
          ancestorChain.push({
            tagName: ancestor.tagName.toLowerCase(),
            id: ancestor.id,
            className: typeof ancestor.className === "string" ? ancestor.className : "",
            left: Math.round(ancestor.getBoundingClientRect().left),
            right: Math.round(ancestor.getBoundingClientRect().right),
            width: Math.round(ancestor.getBoundingClientRect().width),
            minWidth: ancestorStyle.minWidth,
            display: ancestorStyle.display,
            position: ancestorStyle.position,
            overflowX: ancestorStyle.overflowX,
            clientWidth: ancestor.clientWidth,
            scrollWidth: ancestor.scrollWidth,
          });
          if (!scrollableAncestor && ["auto", "scroll"].includes(ancestorStyle.overflowX)) scrollableAncestor = ancestor;
        }
        const outsideViewport = rect.right > viewportWidth + 1 || rect.left < -1;
        const hasOwnOverflow = element.scrollWidth > element.clientWidth + 1;
        const insideScrollableAncestor = Boolean(scrollableAncestor);
        if ((!outsideViewport && !hasOwnOverflow) || (insideScrollableAncestor && outsideViewport)) return null;
        return {
          tagName: element.tagName.toLowerCase(),
          id: element.id,
          className: typeof element.className === "string" ? element.className : "",
          text: (element.innerText ?? "").slice(0, 100),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          cssWidth: style.width,
          minWidth: style.minWidth,
          maxWidth: style.maxWidth,
          display: style.display,
          position: style.position,
          overflowX: style.overflowX,
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
          outsideViewport,
          hasOwnOverflow,
          insideScrollableAncestor,
          scrollableAncestor: scrollableAncestor ? {
            tagName: scrollableAncestor.tagName.toLowerCase(),
            id: scrollableAncestor.id,
            className: typeof scrollableAncestor.className === "string" ? scrollableAncestor.className : "",
          } : null,
          ancestorChain: ancestorChain.slice(0, 8),
        };
      })
      .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null)
      .sort((left, right) => Number(right.outsideViewport) - Number(left.outsideViewport) || right.right - left.right)
      .slice(0, 40);

    const pseudoElements = Array.from(document.querySelectorAll<HTMLElement>("body, body *"))
      .flatMap((element) => (["::before", "::after"] as const).map((pseudo) => {
        const style = getComputedStyle(element, pseudo);
        const rect = element.getBoundingClientRect();
        return {
          selector: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}${typeof element.className === "string" && element.className ? `.${element.className.trim().split(/\s+/).join(".")}` : ""}${pseudo}`,
          content: style.content,
          width: style.width,
          minWidth: style.minWidth,
          position: style.position,
          left: style.left,
          right: style.right,
          hostLeft: Math.round(rect.left),
          hostRight: Math.round(rect.right),
          hostPosition: getComputedStyle(element).position,
        };
      })).filter((pseudo) => pseudo.content !== "none" && pseudo.content !== "normal");

    const result = {
      route,
      beforeScroll,
      afterScrollAttempt,
      afterScrollRestore,
      tableIsolation,
      tableExperiments,
      tableDescendants,
      tablePseudoElements,
      progressiveMainIsolation,
      shellIsolation,
      finalDOMRestoration,
      elementCandidates,
      pseudoElements,
      comparison: {
        documentScrollObserved: afterScrollAttempt.windowScrollX > beforeScroll.windowScrollX,
        tableWrapHideReducedHtmlScrollWidth: (() => {
          const hiddenWidth = (tableIsolation.during as { metrics?: { htmlScrollWidth?: number } } | undefined)?.metrics?.htmlScrollWidth;
          return typeof hiddenWidth === "number" && hiddenWidth < beforeScroll.htmlScrollWidth;
        })(),
      },
    };

    window.scrollTo({ left: originalX, top: originalY, behavior: "auto" });
    await nextFrame();
    return { ...result, finalRestoration: readMetrics() };
  }, routeKey);
}

type FocusMeasurement = {
  method: string;
  accessibleName: string;
  href: string;
  isActiveElement: boolean;
  rowIndex: number;
  cellIndex: number;
  linkRect: { left: number; right: number; top: number; bottom: number; width: number; height: number };
  scrollport: { left: number; right: number; width: number; clientWidth: number; scrollWidth: number; scrollLeft: number };
  outlineWidth: string;
  outlineOffset: string;
  outlineStyle: string;
  visibleIntersection: { left: number; right: number; width: number; ratio: number };
  outlineWithinScrollport: boolean;
};
type FocusStep = {
  index: number;
  direction: "forward" | "reverse";
  scrollLeftBeforeFocus: number;
  scrollLeftImmediatelyAfterFocus: number;
  scrollLeftAfterFrame: number;
  immediate: FocusMeasurement;
  afterFrame: FocusMeasurement;
  screenshot?: string;
};

async function runIsolatedClientKeyboardPass(context: BrowserContext, width: number, mode: "with-contain" | "without-contain") {
  const page = await context.newPage();
  await page.setViewportSize({ width, height: 900 });
  let temporaryOverride: Awaited<ReturnType<Page["addStyleTag"]>> | undefined;
  let initialState: { scrollLeft: number; htmlScrollWidth: number; windowScrollX: number; windowScrollY: number; styleAttributePresent: boolean; styleAttribute: string | null; contain: string; overflowX: string; clientWidth: number; scrollWidth: number; rowCount: number; cellCounts: number[]; hrefs: string[] } | undefined;
  let result: Record<string, unknown> = { width, mode };

  try {
    await signInAsOwner(page);
    await page.goto("/clients");
    await expect(page.getByRole("heading", { level: 1, name: "Clientes", exact: true })).toBeVisible();
    const wrapper = page.locator(".client-list-table-wrap");
    await expect(wrapper).toBeVisible();
    if (mode === "without-contain") {
      temporaryOverride = await page.addStyleTag({ content: ".client-list-table-wrap { contain: none !important; }" });
    }

    const links = await page.getByRole("table").getByRole("link").all();
    const search = page.getByRole("searchbox", { name: "Pesquisar clientes" });
    const status = page.getByRole("combobox", { name: "Filtrar por status" });
    const filterButton = page.getByRole("button", { name: "Filtrar", exact: true });
    initialState = await wrapper.evaluate((element) => ({
      scrollLeft: element.scrollLeft,
      htmlScrollWidth: document.documentElement.scrollWidth,
      windowScrollX: window.scrollX,
      windowScrollY: window.scrollY,
      styleAttributePresent: element.hasAttribute("style"),
      styleAttribute: element.getAttribute("style"),
      contain: getComputedStyle(element).contain,
      overflowX: getComputedStyle(element).overflowX,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      rowCount: element.querySelectorAll("tr").length,
      cellCounts: Array.from(element.querySelectorAll("tr"), (row) => row.querySelectorAll("th,td").length),
      hrefs: Array.from(element.querySelectorAll<HTMLAnchorElement>("a"), (link) => link.getAttribute("href") ?? ""),
    }));
    const initial = initialState;
    await wrapper.evaluate((element) => { element.scrollLeft = 0; });
    const startScrollLeft = await wrapper.evaluate((element) => element.scrollLeft);

    const keyboardOrder: Array<Record<string, unknown>> = [];
    let searchReached = false;
    for (let index = 0; index < 60; index += 1) {
      await page.keyboard.press("Tab");
      const active = await page.evaluate(() => {
        const element = document.activeElement;
        if (!(element instanceof HTMLElement)) return null;
        return {
          tagName: element.tagName.toLowerCase(),
          role: element.getAttribute("role"),
          accessibleName: element.getAttribute("aria-label") || element.innerText?.trim() || (element as HTMLInputElement).placeholder || "",
          className: typeof element.className === "string" ? element.className : "",
        };
      });
      keyboardOrder.push({ index, method: "page.keyboard.press('Tab') desde documento", active });
      if (await search.evaluate((element) => document.activeElement === element)) {
        searchReached = true;
        break;
      }
    }

    await page.keyboard.press("Tab");
    const statusFocused = await status.evaluate((element) => document.activeElement === element);
    await page.keyboard.press("Tab");
    const filterFocused = await filterButton.evaluate((element) => document.activeElement === element);

    const measure = async (link: Locator, method: string): Promise<FocusMeasurement> => link.evaluate((element, focusMethod) => {
      const scrollport = element.closest<HTMLElement>(".client-list-table-wrap");
      if (!scrollport) throw new Error("Link da tabela sem .client-list-table-wrap.");
      const rect = element.getBoundingClientRect();
      const portRect = scrollport.getBoundingClientRect();
      const portLeft = portRect.left + scrollport.clientLeft;
      const portRight = portLeft + scrollport.clientWidth;
      const style = getComputedStyle(element);
      const outlineWidth = Number.parseFloat(style.outlineWidth) || 0;
      const outlineOffset = Number.parseFloat(style.outlineOffset) || 0;
      const outlineBleed = Math.max(0, outlineWidth + outlineOffset);
      const visibleLeft = Math.max(rect.left, portLeft, 0);
      const visibleRight = Math.min(rect.right, portRight, window.innerWidth);
      const visibleWidth = Math.max(0, visibleRight - visibleLeft);
      const row = element.closest("tr");
      const cell = element.closest("td,th");
      return {
        method: focusMethod,
        accessibleName: element.getAttribute("aria-label") || element.textContent?.trim() || "",
        href: element.getAttribute("href") ?? "",
        isActiveElement: document.activeElement === element,
        rowIndex: row instanceof HTMLTableRowElement ? row.rowIndex : -1,
        cellIndex: cell instanceof HTMLTableCellElement ? cell.cellIndex : -1,
        linkRect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height },
        scrollport: {
          left: portLeft,
          right: portRight,
          width: portRight - portLeft,
          clientWidth: scrollport.clientWidth,
          scrollWidth: scrollport.scrollWidth,
          scrollLeft: scrollport.scrollLeft,
        },
        outlineWidth: style.outlineWidth,
        outlineOffset: style.outlineOffset,
        outlineStyle: style.outlineStyle,
        visibleIntersection: {
          left: visibleLeft,
          right: visibleRight,
          width: visibleWidth,
          ratio: rect.width > 0 ? Number((visibleWidth / rect.width).toFixed(3)) : 0,
        },
        outlineWithinScrollport: rect.left - outlineBleed >= portLeft - 1 && rect.right + outlineBleed <= portRight + 1,
      };
    }, method);

    const focusLink = async (index: number, link: Locator, direction: "forward" | "reverse"): Promise<FocusStep> => {
      const scrollLeftBeforeFocus = await wrapper.evaluate((element) => element.scrollLeft);
      await page.keyboard.press(direction === "forward" ? "Tab" : "Shift+Tab");
      const immediate = await measure(link, `page.keyboard.press('${direction === "forward" ? "Tab" : "Shift+Tab"}')`);
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
      const afterFrame = await measure(link, "mesma navegação após requestAnimationFrame");
      const resultForLink = { index, direction, scrollLeftBeforeFocus, scrollLeftImmediatelyAfterFocus: immediate.scrollport.scrollLeft, scrollLeftAfterFrame: afterFrame.scrollport.scrollLeft, immediate, afterFrame };
      const focusIssue = (measurement: FocusMeasurement) => !measurement.isActiveElement || measurement.visibleIntersection.ratio < 1 || !measurement.outlineWithinScrollport;
      if (focusIssue(immediate) || focusIssue(afterFrame) || (index === 2 && direction === "forward")) {
        const filename = `clients-keyboard-focus-${width}-${mode}-${direction}-link-${index + 1}.png`;
        const screenshotPath = join(evidenceDirectory, filename);
        await page.screenshot({ path: screenshotPath, animations: "disabled", caret: "hide" });
        return { ...resultForLink, screenshot: relative(process.cwd(), screenshotPath) };
      }
      return resultForLink;
    };

    const forward: FocusStep[] = [];
    for (const [index, link] of links.entries()) forward.push(await focusLink(index, link, "forward"));
    const reverse: FocusStep[] = [];
    for (let index = links.length - 2; index >= 0; index -= 1) reverse.push(await focusLink(index, links[index], "reverse"));
    await page.keyboard.press("Shift+Tab");
    const returnToFilterButtonFocused = await filterButton.evaluate((element) => document.activeElement === element);
    result = {
      width,
      mode,
      initial,
      startScrollLeft,
      keyboardOrder,
      searchReached,
      statusFocused,
      filterFocused,
      returnToFilterButtonFocused,
      links: links.map((_, index) => ({ index, forward: forward[index], reverse: reverse.find((item) => item.index === index) })),
      lastColumnScrollLeft: forward.at(-1)?.afterFrame.scrollport.scrollLeft ?? 0,
      screenshots: [...forward, ...reverse].flatMap((item) => item.screenshot ? [item.screenshot] : []),
    };
  } finally {
    await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); }).catch(() => undefined);
    await temporaryOverride?.evaluate((element) => { element.parentNode?.removeChild(element); }).catch(() => undefined);
    if (initialState) {
      await page.locator(".client-list-table-wrap").evaluate((element, state) => { element.scrollLeft = state.scrollLeft; }, { scrollLeft: initialState.scrollLeft }).catch(() => undefined);
      await page.evaluate(({ x, y }) => window.scrollTo({ left: x, top: y, behavior: "auto" }), { x: initialState.windowScrollX, y: initialState.windowScrollY }).catch(() => undefined);
    }
    const restored = await page.locator(".client-list-table-wrap").evaluate((element) => ({
      scrollLeft: element.scrollLeft,
      styleAttributePresent: element.hasAttribute("style"),
      styleAttribute: element.getAttribute("style"),
      contain: getComputedStyle(element).contain,
      linkCount: element.querySelectorAll("a").length,
      rowCount: element.querySelectorAll("tr").length,
      cellCounts: Array.from(element.querySelectorAll("tr"), (row) => row.querySelectorAll("th,td").length),
      hrefs: Array.from(element.querySelectorAll<HTMLAnchorElement>("a"), (link) => link.getAttribute("href") ?? ""),
    })).catch(() => null);
    if (restored) {
      const before = initialState;
      const finalWindowPosition = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY })).catch(() => ({ x: -1, y: -1 }));
      result.finalRestoration = { ...restored, windowScrollX: finalWindowPosition.x, windowScrollY: finalWindowPosition.y };
      result.containRestored = restored.contain.includes("paint");
      result.domRestored = Boolean(before
        && restored.scrollLeft === before.scrollLeft
        && restored.styleAttributePresent === before.styleAttributePresent
        && restored.styleAttribute === before.styleAttribute
        && restored.linkCount === 4
        && restored.rowCount === before.rowCount
        && JSON.stringify(restored.cellCounts) === JSON.stringify(before.cellCounts)
        && JSON.stringify(restored.hrefs) === JSON.stringify(before.hrefs)
        && finalWindowPosition.x === before.windowScrollX
        && finalWindowPosition.y === before.windowScrollY);
    }
    await page.close();
  }

  const diagnostics = result as Record<string, unknown>;
  const initial = diagnostics.initial as { contain: string; htmlScrollWidth: number } | undefined;
  return {
    ...diagnostics,
    initialContain: initial?.contain ?? "unavailable",
    documentScrollWidth: initial?.htmlScrollWidth ?? -1,
  };
}

async function writeLayoutEvidence(filename: string, rows: Array<Record<string, unknown>>) {
  await writeFile(join(evidenceDirectory, filename), `${JSON.stringify({ generatedAt: new Date().toISOString(), captures: rows }, null, 2)}\n`);
}
