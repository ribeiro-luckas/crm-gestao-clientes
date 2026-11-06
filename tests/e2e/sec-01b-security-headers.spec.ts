import { mkdir, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { expect, test, type APIResponse } from "@playwright/test";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { buildContentSecurityPolicy } from "../../src/lib/content-security-policy";
import * as schema from "../../src/db/schema";
import { createIsolatedConnectionPair, type IsolatedConnectionPair } from "../helpers/test-db";
import { seedTeamRbacFixture } from "../helpers/team-rbac-fixture";
import { signInWithRateLimitRetry } from "../helpers/e2e-auth";

let connection: IsolatedConnectionPair | undefined;
let db: NodePgDatabase<typeof schema> | undefined;
let fixture: Awaited<ReturnType<typeof seedTeamRbacFixture>> | undefined;

test.describe("SEC-01C.3 F004 — headers HTTP e política CSP", () => {
  test.beforeAll(async () => {
    connection = await createIsolatedConnectionPair();
    db = drizzle(connection.poolA, { schema });
    fixture = await seedTeamRbacFixture(db);
  });

  test.afterAll(async () => {
    try {
      await fixture?.cleanup();
    } finally {
      if (connection) await connection.cleanup();
    }
  });

  test("valida headers em páginas, APIs, assets e CSV mantendo evidências sanitizadas", async ({ page, browser }, testInfo) => {
    const strictProductionCsp = testInfo.project.name === "chromium-production";
    const observed: Record<string, unknown> = {};
    observed.auditStatus = "incomplete";
    const assetResponses: Array<{ kind: string; status: number; contentType: string | null; nosniff: string | null; cspEnforced: boolean; cspReportOnly: boolean }> = [];
    const browserDiagnostics: Array<{ kind: string; hydrationRelated?: boolean; cspRelated?: boolean; resourceType?: string; origin?: string; developmentLike?: boolean }> = [];
    let browserDiagnosticsCursor = 0;
    try {
    await page.addInitScript(() => {
      type SafeViolation = {
        effectiveDirective: string;
        violatedDirective: string;
        disposition: string;
        blockedResource: string;
        sourceCategory: string;
        lineNumber: number;
        columnNumber: number;
        blockedScriptElement: HTMLScriptElement | null;
      };
      const windowWithViolations = window as Window & {
        __safeCspViolations?: SafeViolation[];
        __safeScriptLifecycleTracker?: {
          mutationObserved: (script: HTMLScriptElement) => boolean;
          addedAfterDOMContentLoaded: (script: HTMLScriptElement) => boolean;
          loadEventObserved: (script: HTMLScriptElement) => boolean;
          errorEventObserved: (script: HTMLScriptElement) => boolean;
          styleObservedAfterDOMContentLoaded: (style: HTMLStyleElement) => boolean;
        };
      };
      windowWithViolations.__safeCspViolations = [];
      const scriptsAddedAfterDOMContentLoaded = new WeakSet<HTMLScriptElement>();
      const scriptsObservedByMutation = new WeakSet<HTMLScriptElement>();
      const scriptsWithLoadEvent = new WeakSet<HTMLScriptElement>();
      const scriptsWithErrorEvent = new WeakSet<HTMLScriptElement>();
      const stylesAddedAfterDOMContentLoaded = new WeakSet<HTMLStyleElement>();
      let domContentLoaded = document.readyState !== "loading";
      document.addEventListener("DOMContentLoaded", () => { domContentLoaded = true; }, { once: true });
      document.addEventListener("load", (event) => {
        if (event.target instanceof HTMLScriptElement) scriptsWithLoadEvent.add(event.target);
      }, true);
      document.addEventListener("error", (event) => {
        if (event.target instanceof HTMLScriptElement) scriptsWithErrorEvent.add(event.target);
      }, true);
      const markScripts = (node: Node) => {
        if (node instanceof HTMLStyleElement && domContentLoaded) stylesAddedAfterDOMContentLoaded.add(node);
        if (node instanceof Element) {
          for (const style of node.querySelectorAll("style")) {
            if (domContentLoaded) stylesAddedAfterDOMContentLoaded.add(style);
          }
        }
        if (node instanceof HTMLScriptElement) {
          scriptsObservedByMutation.add(node);
          if (domContentLoaded) scriptsAddedAfterDOMContentLoaded.add(node);
        }
        if (node instanceof Element) {
          for (const script of node.querySelectorAll("script")) {
            scriptsObservedByMutation.add(script);
            if (domContentLoaded) scriptsAddedAfterDOMContentLoaded.add(script);
          }
        }
      };
      const scriptObserver = new MutationObserver((records) => {
        for (const record of records) for (const node of record.addedNodes) markScripts(node);
      });
      scriptObserver.observe(document, { childList: true, subtree: true });
      windowWithViolations.__safeScriptLifecycleTracker = {
        mutationObserved: (script) => scriptsObservedByMutation.has(script),
        addedAfterDOMContentLoaded: (script) => scriptsAddedAfterDOMContentLoaded.has(script),
        loadEventObserved: (script) => scriptsWithLoadEvent.has(script),
        errorEventObserved: (script) => scriptsWithErrorEvent.has(script),
        styleObservedAfterDOMContentLoaded: (style) => stylesAddedAfterDOMContentLoaded.has(style),
      };
      window.addEventListener("securitypolicyviolation", (event) => {
        const uri = event.blockedURI;
        const blockedResource = uri === "inline" || uri === "eval" || uri === "data"
          ? uri
          : uri.startsWith(window.location.origin)
            ? "same-origin"
            : uri
              ? "external"
              : "none";
        let sourceCategory = "none";
        if (event.sourceFile) {
          try {
            const sourceUrl = new URL(event.sourceFile, window.location.href);
            sourceCategory = sourceUrl.origin !== window.location.origin
              ? "external"
              : sourceUrl.pathname.startsWith("/_next/") ? "same-origin-next-path" : "same-origin-other-path";
          } catch { sourceCategory = "unparseable"; }
        }
        const scripts = Array.from(document.scripts);
        let blockedScriptElement: HTMLScriptElement | null = null;
        if (uri && uri !== "inline" && uri !== "eval" && uri !== "data") {
          try {
            const blockedUrl = new URL(uri, window.location.href).href;
            const matches = scripts.filter((script) => script.src === blockedUrl);
            if (matches.length === 1) blockedScriptElement = matches[0] ?? null;
          } catch { /* Keep only the sanitized category when the URI is malformed. */ }
        }
        windowWithViolations.__safeCspViolations?.push({
          effectiveDirective: event.effectiveDirective,
          violatedDirective: event.violatedDirective,
          disposition: event.disposition,
          blockedResource,
          sourceCategory,
          lineNumber: event.lineNumber,
          columnNumber: event.columnNumber,
          blockedScriptElement,
        });
      });
    });
    page.on("pageerror", (error) => {
      browserDiagnostics.push({
        kind: "page-error",
        hydrationRelated: /hydration/i.test(error.message),
        cspRelated: /content security policy|\bcsp\b/i.test(error.message),
      });
    });
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const value = message.text();
      browserDiagnostics.push({
        kind: "console-error",
        hydrationRelated: /hydration/i.test(value),
        cspRelated: /content security policy|\bcsp\b/i.test(value),
      });
    });
    page.on("requestfailed", (request) => {
      let origin = "unparseable";
      let developmentLike = false;
      try {
        const url = new URL(request.url());
        origin = url.hostname === "127.0.0.1" && (url.port === "3100" || url.port === "3101") ? "same-origin" : "external";
        developmentLike = url.pathname.includes("webpack-hmr") || url.pathname.includes("/_next/static/development/");
      } catch { /* Do not retain or print the raw request URL. */ }
      browserDiagnostics.push({ kind: "request-failed", resourceType: request.resourceType(), origin, developmentLike });
    });
    page.on("response", (response) => {
      const kind = response.request().resourceType();
      if (kind !== "script" && kind !== "stylesheet") return;
      const headers = response.headers();
      assetResponses.push({
        kind,
        status: response.status(),
        contentType: headers["content-type"] ?? null,
        nosniff: headers["x-content-type-options"] ?? null,
        cspEnforced: Boolean(headers["content-security-policy"]),
        cspReportOnly: Boolean(headers["content-security-policy-report-only"]),
      });
    });

    const loginPage = await page.request.get("/login", { maxRedirects: 0 });
    observed.login = await snapshotResponse(loginPage);
    const loginDiagnostics = responseDiagnostics({
      method: "GET",
      path: new URL(loginPage.url()).pathname,
      status: loginPage.status(),
      contentType: loginPage.headers()["content-type"] ?? null,
      redirected: loginPage.status() >= 300 && loginPage.status() < 400,
      headers: loginPage.headers(),
    });
    observed.loginDiagnostics = loginDiagnostics;
    await testInfo.attach("login-response-diagnostics", {
      body: JSON.stringify(loginDiagnostics, null, 2),
      contentType: "application/json",
    });
    expect(loginPage.status(), JSON.stringify(loginDiagnostics)).toBe(200);
    expect(loginPage.headers()["content-type"], JSON.stringify(loginDiagnostics)).toContain("text/html");
    expectSecurityHeaders(loginPage.headers());
    const loginRequestNonce = expectCspPolicy(loginPage.headers()[strictProductionCsp ? "content-security-policy" : "content-security-policy-report-only"], JSON.stringify(loginDiagnostics), strictProductionCsp);
    await expectSingleCspPolicy(loginPage, strictProductionCsp);

    const loginDocument = await page.goto("/login");
    observed.auditPhase = "login-functional-readiness";
    const loginReadiness = await captureFunctionalReadiness(page, "login");
    observed.loginReadiness = loginReadiness;
    observed.auditPhase = "login-security-observation";
    const loginStability = await waitForScriptDomStability(page, loginReadiness.functionalReadinessReached);
    observed.loginStability = loginStability;
    await testInfo.attach("login-render-stability", { body: JSON.stringify(loginStability), contentType: "application/json" });
    const loginViolations = await captureCspViolations(page, testInfo, "login");
    const loginBrowserDiagnostics = browserDiagnostics.slice(browserDiagnosticsCursor);
    await attachBrowserDiagnostics(testInfo, "login", loginBrowserDiagnostics);
    browserDiagnosticsCursor = browserDiagnostics.length;
    expect(loginDocument).not.toBeNull();
    expect(loginDocument!.ok()).toBe(true);
    expectSecurityHeaders(loginDocument!.headers());
    const loginDocumentDiagnostics = browserResponseDiagnostics(loginDocument!);
    observed.loginDocumentDiagnostics = loginDocumentDiagnostics;
    const loginNonce = expectCspPolicy(loginDocument!.headers()[strictProductionCsp ? "content-security-policy" : "content-security-policy-report-only"], JSON.stringify(loginDocumentDiagnostics), strictProductionCsp);
    await expectSingleCspPolicy(loginDocument!, strictProductionCsp);
    expect(loginRequestNonce !== loginNonce).toBe(true);
    const loginScriptSummary = await verifyDocumentScripts(page, loginNonce, testInfo, "login");
    observed.loginStyleSummary = await summarizeStyleElements(page, loginNonce, testInfo, "login");
    observed.loginScriptSummary = loginScriptSummary;
    observed.loginCspViolations = loginViolations;
    observed.loginBrowserDiagnostics = loginBrowserDiagnostics;
    observed.auditPhase = "login-observation-completeness";
    expect(loginReadiness.functionalReadinessReached, JSON.stringify(loginReadiness)).toBe(true);
    expect(loginStability.stabilityExitReason, JSON.stringify(loginStability)).toBe("script-observation-settled");
    expect(loginStability.timedOutAtFrameLimit, JSON.stringify(loginStability)).toBe(false);
    expect(loginStability.pendingExternalScriptCount).toBe(0);
    expect(loginStability.observedScriptErrorCount, JSON.stringify(loginStability)).toBe(0);
    observed.auditPhase = "login-security-assertions";
    expect(loginBrowserDiagnostics.some((entry) => entry.kind === "page-error" || entry.hydrationRelated), JSON.stringify(loginBrowserDiagnostics)).toBe(false);
    expectDocumentScripts(loginScriptSummary, loginViolations);
    expectNoEnforcedAppViolations(loginViolations, strictProductionCsp);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const actor = fixture!.actors.owner;
    const signIn = await signInWithRateLimitRetry(page.request, { email: actor.email, password: actor.password }, new URL(page.url()).origin);
    observed.signIn = await snapshotResponse(signIn);
    expect(signIn.ok()).toBe(true);
    expectSecurityHeaders(signIn.headers());
    expect(signIn.headers()["content-type"]).toContain("application/json");
    expect(Boolean(signIn.headers()["content-security-policy-report-only"])).toBe(false);
    expect(Boolean(signIn.headers()["content-security-policy"])).toBe(false);
    const sessionCookies = (observed.signIn as Awaited<ReturnType<typeof snapshotResponse>>).cookies;
    expect(sessionCookies.length).toBeGreaterThan(0);
    expect(sessionCookies.every((cookie) => cookie.httpOnly && cookie.sameSite?.toLowerCase() === "lax" && cookie.path === "/")).toBe(true);
    expect(sessionCookies.every((cookie) => cookie.secure === strictProductionCsp)).toBe(true);

    const privatePage = await page.request.get("/dashboard", { maxRedirects: 0 });
    observed.authenticatedDashboard = await snapshotResponse(privatePage);
    expect(privatePage.status()).toBe(200);
    expectSecurityHeaders(privatePage.headers());
    const privatePageDiagnostics = responseDiagnostics({
      method: "GET",
      path: new URL(privatePage.url()).pathname,
      status: privatePage.status(),
      contentType: privatePage.headers()["content-type"] ?? null,
      redirected: privatePage.status() >= 300 && privatePage.status() < 400,
      headers: privatePage.headers(),
    });
    observed.dashboardResponseDiagnostics = privatePageDiagnostics;
    expect(privatePage.headers()["content-type"], JSON.stringify(privatePageDiagnostics)).toContain("text/html");
    const privatePageNonce = expectCspPolicy(privatePage.headers()[strictProductionCsp ? "content-security-policy" : "content-security-policy-report-only"], JSON.stringify(privatePageDiagnostics), strictProductionCsp);
    await expectSingleCspPolicy(privatePage, strictProductionCsp);
    expect(privatePageNonce !== loginNonce).toBe(true);

    const dashboardDocument = await page.goto("/dashboard");
    observed.auditPhase = "dashboard-functional-readiness";
    const dashboardReadiness = await captureFunctionalReadiness(page, "dashboard");
    observed.dashboardReadiness = dashboardReadiness;
    observed.auditPhase = "dashboard-security-observation";
    const dashboardStability = await waitForScriptDomStability(page, dashboardReadiness.functionalReadinessReached);
    observed.dashboardStability = dashboardStability;
    await testInfo.attach("dashboard-render-stability", { body: JSON.stringify(dashboardStability), contentType: "application/json" });
    const dashboardViolations = await captureCspViolations(page, testInfo, "dashboard");
    const dashboardBrowserDiagnostics = browserDiagnostics.slice(browserDiagnosticsCursor);
    await attachBrowserDiagnostics(testInfo, "dashboard", dashboardBrowserDiagnostics);
    browserDiagnosticsCursor = browserDiagnostics.length;
    expect(dashboardDocument).not.toBeNull();
    expect(dashboardDocument!.ok()).toBe(true);
    const dashboardDocumentDiagnostics = browserResponseDiagnostics(dashboardDocument!);
    observed.dashboardDocumentDiagnostics = dashboardDocumentDiagnostics;
    const dashboardNonce = expectCspPolicy(dashboardDocument!.headers()[strictProductionCsp ? "content-security-policy" : "content-security-policy-report-only"], JSON.stringify(dashboardDocumentDiagnostics), strictProductionCsp);
    await expectSingleCspPolicy(dashboardDocument!, strictProductionCsp);
    expect(dashboardNonce !== loginNonce).toBe(true);
    const dashboardScriptSummary = await verifyDocumentScripts(page, dashboardNonce, testInfo, "dashboard");
    observed.dashboardStyleSummary = await summarizeStyleElements(page, dashboardNonce, testInfo, "dashboard");
    observed.dashboardScriptSummary = dashboardScriptSummary;
    observed.dashboardCspViolations = dashboardViolations;
    observed.dashboardBrowserDiagnostics = dashboardBrowserDiagnostics;
    observed.auditPhase = "dashboard-observation-completeness";
    expect(dashboardReadiness.functionalReadinessReached, JSON.stringify(dashboardReadiness)).toBe(true);
    expect(dashboardStability.stabilityExitReason, JSON.stringify(dashboardStability)).toBe("script-observation-settled");
    expect(dashboardStability.timedOutAtFrameLimit, JSON.stringify(dashboardStability)).toBe(false);
    expect(dashboardStability.pendingExternalScriptCount).toBe(0);
    expect(dashboardStability.observedScriptErrorCount, JSON.stringify(dashboardStability)).toBe(0);
    observed.auditPhase = "dashboard-security-assertions";
    expect(dashboardBrowserDiagnostics.some((entry) => entry.kind === "page-error" || entry.hydrationRelated), JSON.stringify(dashboardBrowserDiagnostics)).toBe(false);
    expectDocumentScripts(dashboardScriptSummary, dashboardViolations);
    expectNoEnforcedAppViolations(dashboardViolations, strictProductionCsp);
    await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();

    const workspaceSelectDocument = await page.goto("/workspace/select");
    observed.auditPhase = "workspace-select-functional-readiness";
    const workspaceSelectReadiness = await captureFunctionalReadiness(page, "workspace-select");
    observed.workspaceSelectReadiness = workspaceSelectReadiness;
    observed.auditPhase = "workspace-select-security-observation";
    const workspaceSelectStability = await waitForScriptDomStability(page, workspaceSelectReadiness.functionalReadinessReached);
    observed.workspaceSelectStability = workspaceSelectStability;
    await testInfo.attach("workspace-select-render-stability", { body: JSON.stringify(workspaceSelectStability), contentType: "application/json" });
    const workspaceSelectViolations = await captureCspViolations(page, testInfo, "workspace-select");
    const workspaceSelectBrowserDiagnostics = browserDiagnostics.slice(browserDiagnosticsCursor);
    await attachBrowserDiagnostics(testInfo, "workspace-select", workspaceSelectBrowserDiagnostics);
    browserDiagnosticsCursor = browserDiagnostics.length;
    expect(workspaceSelectDocument).not.toBeNull();
    expect(workspaceSelectDocument!.ok()).toBe(true);
    const workspaceSelectDiagnostics = browserResponseDiagnostics(workspaceSelectDocument!);
    observed.workspaceSelectDiagnostics = workspaceSelectDiagnostics;
    const workspaceSelectNonce = expectCspPolicy(workspaceSelectDocument!.headers()[strictProductionCsp ? "content-security-policy" : "content-security-policy-report-only"], JSON.stringify(workspaceSelectDiagnostics), strictProductionCsp);
    await expectSingleCspPolicy(workspaceSelectDocument!, strictProductionCsp);
    expect(workspaceSelectNonce !== dashboardNonce).toBe(true);
    expect(new Set([loginRequestNonce, loginNonce, privatePageNonce, dashboardNonce, workspaceSelectNonce]).size === 5).toBe(true);
    const workspaceSelectScriptSummary = await verifyDocumentScripts(page, workspaceSelectNonce, testInfo, "workspace-select");
    observed.workspaceSelectStyleSummary = await summarizeStyleElements(page, workspaceSelectNonce, testInfo, "workspace-select");
    observed.workspaceSelectScriptSummary = workspaceSelectScriptSummary;
    observed.workspaceSelectCspViolations = workspaceSelectViolations;
    observed.workspaceSelectBrowserDiagnostics = workspaceSelectBrowserDiagnostics;
    observed.auditPhase = "workspace-select-observation-completeness";
    expect(workspaceSelectReadiness.functionalReadinessReached, JSON.stringify(workspaceSelectReadiness)).toBe(true);
    expect(workspaceSelectStability.stabilityExitReason, JSON.stringify(workspaceSelectStability)).toBe("script-observation-settled");
    expect(workspaceSelectStability.timedOutAtFrameLimit, JSON.stringify(workspaceSelectStability)).toBe(false);
    expect(workspaceSelectStability.pendingExternalScriptCount).toBe(0);
    expect(workspaceSelectStability.observedScriptErrorCount, JSON.stringify(workspaceSelectStability)).toBe(0);
    observed.auditPhase = "workspace-select-security-assertions";
    expect(workspaceSelectBrowserDiagnostics.some((entry) => entry.kind === "page-error" || entry.hydrationRelated), JSON.stringify(workspaceSelectBrowserDiagnostics)).toBe(false);
    expectDocumentScripts(workspaceSelectScriptSummary, workspaceSelectViolations);
    expectNoEnforcedAppViolations(workspaceSelectViolations, strictProductionCsp);
    await expect(page.getByRole("heading", { name: "Escolha um workspace", exact: true })).toBeVisible();

    observed.cspViolations = {
      login: loginViolations,
      dashboard: dashboardViolations,
      workspaceSelect: workspaceSelectViolations,
    };
    await testInfo.attach("csp-violation-summary", {
      body: JSON.stringify(observed.cspViolations, null, 2),
      contentType: "application/json",
    });

    observed.auditPhase = "remaining-http-assertions";
    const loadedScript = assetResponses.some((asset) => asset.kind === "script" && asset.status === 200 && /javascript|ecmascript/i.test(asset.contentType ?? "") && asset.nosniff === "nosniff");
    const loadedStylesheet = assetResponses.some((asset) => asset.kind === "stylesheet" && asset.status === 200 && /text\/css/i.test(asset.contentType ?? "") && asset.nosniff === "nosniff");
    expect(loadedScript).toBe(true);
    expect(loadedStylesheet).toBe(true);
    observed.localAssets = assetResponses;

    const session = await page.request.get("/api/auth/get-session");
    observed.sessionApi = await snapshotResponse(session);
    expect(session.ok()).toBe(true);
    expectSecurityHeaders(session.headers());
    expect(session.headers()["content-type"]).toContain("application/json");
    expect(Boolean(session.headers()["content-security-policy-report-only"])).toBe(false);
    expect(Boolean(session.headers()["content-security-policy"])).toBe(false);

    const csv = await page.request.get("/api/export/clients.csv");
    observed.csvExport = await snapshotResponse(csv);
    expect(csv.status()).toBe(200);
    expect(csv.headers()["cache-control"]).toContain("private");
    expect(csv.headers()["cache-control"]).toContain("no-store");
    expectSecurityHeaders(csv.headers());
    expect(csv.headers()["content-type"]).toContain("text/csv");
    expect(Boolean(csv.headers()["content-security-policy-report-only"])).toBe(false);
    expect(Boolean(csv.headers()["content-security-policy"])).toBe(false);

    if (strictProductionCsp) {
      const signOutResponsePromise = page.waitForResponse((response) => {
        const url = new URL(response.url());
        return url.pathname === "/api/auth/sign-out" && response.request().method() === "POST";
      });
      await page.getByRole("button", { name: "Sair" }).click();
      const signOut = await signOutResponsePromise;
      expect(signOut.ok()).toBe(true);
      await expect(page).toHaveURL(/\/login/);

      const actor = fixture!.actors.owner;
      await page.getByLabel(/^E-mail/).fill(actor.email);
      await page.getByLabel(/^Senha/).fill("senha sintética inválida para homologação");
      const invalidSignInPromise = page.waitForResponse((response) => {
        const url = new URL(response.url());
        return url.pathname === "/api/auth/sign-in/email" && response.request().method() === "POST";
      });
      await page.getByRole("button", { name: "Entrar no CRM" }).click();
      const invalidSignIn = await invalidSignInPromise;
      expect(invalidSignIn.status()).toBe(401);
      await expect(page.locator("form.auth-form").getByRole("alert"))
        .toHaveText("Não foi possível entrar com esses dados. Confira o e-mail e a senha.");
      await testInfo.attach("csp-enforced-auth-negative-flow", {
        body: JSON.stringify({ signOutStatus: signOut.status(), invalidSignInStatus: invalidSignIn.status(), invalidSignInMessageGeneric: true }),
        contentType: "application/json",
      });
    }

    await page.context().clearCookies();
    const privateRedirect = await page.request.get("/dashboard", { maxRedirects: 0 });
    observed.unauthenticatedDashboard = await snapshotResponse(privateRedirect);
    expectSecurityHeaders(privateRedirect.headers());
    expect([302, 303, 307, 308]).toContain(privateRedirect.status());
    expect(privateRedirect.headers().location).toBeTruthy();
    expect(new URL(privateRedirect.headers().location!, privateRedirect.url()).pathname).toBe("/login");
    observed.unauthenticatedDashboardDiagnostics = responseDiagnostics({
      method: "GET",
      path: "/dashboard",
      status: privateRedirect.status(),
      contentType: privateRedirect.headers()["content-type"] ?? null,
      redirected: true,
      headers: privateRedirect.headers(),
    });

    const redirectedDocument = await page.goto("/dashboard");
    expect(redirectedDocument).not.toBeNull();
    expect(redirectedDocument!.ok()).toBe(true);
    const redirectedDocumentDiagnostics = browserResponseDiagnostics(redirectedDocument!);
    observed.redirectedLoginDocumentDiagnostics = redirectedDocumentDiagnostics;
    expect(redirectedDocumentDiagnostics.path).toBe("/login");
    expect(redirectedDocumentDiagnostics.redirected).toBe(true);
    expectCspPolicy(redirectedDocument!.headers()[strictProductionCsp ? "content-security-policy" : "content-security-policy-report-only"], JSON.stringify(redirectedDocumentDiagnostics), strictProductionCsp);
    await expectSingleCspPolicy(redirectedDocument!, strictProductionCsp);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    if (strictProductionCsp) {
      const nonce = randomBytes(18).toString("base64");
      const policy = buildContentSecurityPolicy(nonce, { development: false });
      const cspProbeContext = await browser.newContext();
      const cspProbePage = await cspProbeContext.newPage();
      const cspIssues: Array<{ directive: string; reportOnly: boolean; violationType: string; resourceCategory: string }> = [];
      const externalRequests: string[] = [];
      const cdp = await cspProbeContext.newCDPSession(cspProbePage);
      cdp.on("Audits.issueAdded", (event) => {
        if (event.issue.code !== "ContentSecurityPolicyIssue") return;
        const details = event.issue.details as unknown as {
          contentSecurityPolicyIssueDetails?: {
            violatedDirective?: string;
            isReportOnly?: boolean;
            contentSecurityPolicyViolationType?: string;
            blockedURL?: string;
          };
        };
        const violation = details.contentSecurityPolicyIssueDetails;
        if (!violation) return;
        const blockedURL = violation.blockedURL ?? "";
        const violationType = violation.contentSecurityPolicyViolationType ?? "unknown";
        const resourceCategory = violationType === "kInlineViolation"
          ? "inline"
          : violationType === "kEvalViolation"
            ? "eval"
          : blockedURL && !blockedURL.startsWith("https://csp-negative.invalid/")
            ? "external"
            : "other";
        cspIssues.push({
          directive: violation.violatedDirective ?? "unknown",
          reportOnly: violation.isReportOnly ?? false,
          violationType,
          resourceCategory,
        });
      });
      await cdp.send("Audits.enable");
      await cspProbePage.route("https://csp-negative.invalid/probe", (route) => route.fulfill({
        status: 200,
        contentType: "text/html",
        headers: { "Content-Security-Policy": policy },
        body: `<!doctype html><html><head>
          <script>window.inlineScriptProbe = true</script>
          <script nonce="${nonce}">window.nonceScriptProbe = true; eval("window.evalProbeFinished = true")</script>
          <script src="https://forbidden-resource.invalid/untrusted.js"></script>
          <style>#style-element-probe { color: rgb(1, 2, 3) }</style>
        </head><body><div id="style-attribute-probe" style="color: rgb(1, 2, 3)"></div><div id="style-element-probe"></div></body></html>`,
      }));
      await cspProbePage.route("https://forbidden-resource.invalid/**", async (route) => {
        externalRequests.push(route.request().resourceType());
        await route.fulfill({ status: 200, contentType: "application/javascript", body: "window.externalScriptProbe = true" });
      });
      const cspProbeResponse = await cspProbePage.goto("https://csp-negative.invalid/probe");
      expect(cspProbeResponse?.ok()).toBe(true);
      expect(cspProbeResponse?.headers()["content-security-policy"]).toBe(policy);
      const negativeBrowserState = await cspProbePage.evaluate(() => ({
        inlineScriptExecuted: (window as Window & { inlineScriptProbe?: boolean }).inlineScriptProbe === true,
        nonceScriptExecuted: (window as Window & { nonceScriptProbe?: boolean }).nonceScriptProbe === true,
        dynamicEvalFinished: (window as Window & { evalProbeFinished?: boolean }).evalProbeFinished === true,
        externalScriptExecuted: (window as Window & { externalScriptProbe?: boolean }).externalScriptProbe === true,
        styleAttributeApplied: getComputedStyle(document.querySelector("#style-attribute-probe")!).color === "rgb(1, 2, 3)",
        inlineStylesheetApplied: getComputedStyle(document.querySelector("#style-element-probe")!).color === "rgb(1, 2, 3)",
      }));
      await cspProbeContext.close();
      const negativeEvidence = { cspIssues, externalRequests, ...negativeBrowserState };
      expect(cspIssues.some((issue) => /script-src/.test(issue.directive) && issue.resourceCategory === "inline"), JSON.stringify(negativeEvidence)).toBe(true);
      expect(cspIssues.some((issue) => /script-src/.test(issue.directive) && issue.resourceCategory === "eval"), JSON.stringify(negativeEvidence)).toBe(true);
      expect(cspIssues.some((issue) => /script-src/.test(issue.directive) && issue.resourceCategory === "external"), JSON.stringify(negativeEvidence)).toBe(true);
      expect(cspIssues.some((issue) => /style-src-attr/.test(issue.directive)), JSON.stringify(negativeEvidence)).toBe(true);
      expect(cspIssues.some((issue) => /style-src-elem/.test(issue.directive)), JSON.stringify(negativeEvidence)).toBe(true);
      expect(cspIssues.every((issue) => !issue.reportOnly), JSON.stringify(negativeEvidence)).toBe(true);
      expect(negativeBrowserState.inlineScriptExecuted).toBe(false);
      expect(negativeBrowserState.nonceScriptExecuted).toBe(true);
      expect(negativeBrowserState.dynamicEvalFinished).toBe(false);
      expect(negativeBrowserState.externalScriptExecuted).toBe(false);
      expect(negativeBrowserState.styleAttributeApplied).toBe(false);
      expect(negativeBrowserState.inlineStylesheetApplied).toBe(false);
      expect(externalRequests).toEqual([]);
      await testInfo.attach("csp-enforced-negative-controls", {
        body: JSON.stringify({ ...negativeEvidence, externalRequestsIssued: externalRequests.length }, null, 2),
        contentType: "application/json",
      });
    }

    const deniedExport = await page.request.get("/api/export/clients.csv", { maxRedirects: 0 });
    observed.unauthenticatedCsv = await snapshotResponse(deniedExport);
    expect([401, 403]).toContain(deniedExport.status());
    expect(deniedExport.headers()["cache-control"]).toContain("private");
    expect(deniedExport.headers()["cache-control"]).toContain("no-store");
    expectSecurityHeaders(deniedExport.headers());
    expect(Boolean(deniedExport.headers()["content-security-policy-report-only"])).toBe(false);

    observed.auditStatus = "complete";
    observed.auditOutcome = "complete";
    const directory = join(process.cwd(), "test-results", "security-sec01b");
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, "headers.json"), `${JSON.stringify(observed, null, 2)}\n`, "utf8");
    } catch (error) {
      observed.auditOutcome = "failed";
      observed.failurePhase = observed.auditPhase ?? "http-assertions-or-collection";
      throw error;
    } finally {
      observed.auditOutcome ??= "complete";
      observed.localAssets = assetResponses;
      await mkdir(testInfo.outputDir, { recursive: true });
      await writeFile(testInfo.outputPath("security-header-audit.json"), `${JSON.stringify(observed, null, 2)}\n`, "utf8");
    }
  });
});

async function snapshotResponse(response: APIResponse) {
  const headers = response.headers();
  const relevantNames = [
    "content-security-policy",
    "content-security-policy-report-only",
    "strict-transport-security",
    "x-content-type-options",
    "referrer-policy",
    "x-frame-options",
    "permissions-policy",
    "cache-control",
    "content-type",
    "access-control-allow-origin",
  ];
  const selected: Record<string, string | null> = {};
  for (const name of relevantNames) {
    selected[name] = headers[name]?.replace(/'nonce-[^']+'/g, "'nonce-[redacted]'") ?? null;
  }

  const cookies = response.headersArray()
    .filter((header) => header.name.toLowerCase() === "set-cookie")
    .map((header) => {
      const parts = header.value.split(";").map((part) => part.trim());
      const name = parts[0]?.split("=", 1)[0] ?? "unknown";
      const attributes = parts.slice(1);
      const sameSite = attributes.find((part) => part.toLowerCase().startsWith("samesite="))?.split("=", 2)[1] ?? null;
      const path = attributes.find((part) => part.toLowerCase().startsWith("path="))?.split("=", 2)[1] ?? null;
      return {
        name,
        httpOnly: attributes.some((part) => part.toLowerCase() === "httponly"),
        secure: attributes.some((part) => part.toLowerCase() === "secure"),
        sameSite,
        path,
        maxAgePresent: attributes.some((part) => part.toLowerCase().startsWith("max-age=")),
      };
    });

  let location: string | null = null;
  if (headers.location) {
    try { location = new URL(headers.location, response.url()).pathname; }
    catch { location = "[unparseable-location]"; }
  }

  return { status: response.status(), headers: selected, location, cookies };
}

function expectSecurityHeaders(headers: Record<string, string>) {
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["permissions-policy"]).toBe("camera=(), microphone=(), geolocation=()");
  expect(headers["x-powered-by"]).toBeUndefined();
  // HSTS is intentionally withheld until an HTTPS termination boundary is known.
  expect(headers["strict-transport-security"]).toBeUndefined();
}

type ResponseDiagnostics = {
  method: string;
  path: string;
  status: number;
  contentType: string | null;
  redirected: boolean;
  cspReportOnly: boolean;
  cspEnforcement: boolean;
  securityHeaders: Record<string, boolean>;
};

function responseDiagnostics(input: {
  method: string;
  path: string;
  status: number;
  contentType: string | null;
  redirected: boolean;
  headers: Record<string, string>;
}): ResponseDiagnostics {
  const headers = input.headers;
  return {
    method: input.method,
    path: input.path,
    status: input.status,
    contentType: input.contentType,
    redirected: input.redirected,
    cspReportOnly: Boolean(headers["content-security-policy-report-only"]),
    cspEnforcement: Boolean(headers["content-security-policy"]),
    securityHeaders: {
      nosniff: Boolean(headers["x-content-type-options"]),
      referrerPolicy: Boolean(headers["referrer-policy"]),
      frameOptions: Boolean(headers["x-frame-options"]),
      permissionsPolicy: Boolean(headers["permissions-policy"]),
      hsts: Boolean(headers["strict-transport-security"]),
    },
  };
}

function browserResponseDiagnostics(response: import("@playwright/test").Response): ResponseDiagnostics {
  const headers = response.headers();
  return responseDiagnostics({
    method: response.request().method(),
    path: new URL(response.url()).pathname,
    status: response.status(),
    contentType: headers["content-type"] ?? null,
    redirected: response.request().redirectedFrom() !== null,
    headers,
  });
}

function expectCspPolicy(value: string | undefined, diagnostic = "response metadata unavailable", strictProduction = false): string {
  const sanitized = value?.replace(/'nonce-[^']+'/g, "'nonce-[redacted]'");
  expect(Boolean(sanitized), `Header CSP esperado ausente; resposta sanitizada: ${diagnostic}`).toBe(true);
  expect(sanitized).toContain("default-src 'self'");
  expect(sanitized).toContain("'strict-dynamic'");
  expect(sanitized).toContain("style-src-attr 'none'");
  expect(sanitized).toContain("style-src-elem 'self' 'nonce-[redacted]'");
  expect(sanitized).toContain("object-src 'none'");
  expect(sanitized).toContain("frame-src 'none'");
  expect(sanitized).toContain("base-uri 'self'");
  expect(sanitized).toContain("form-action 'self'");
  expect(sanitized).toContain("frame-ancestors 'none'");
  expect(sanitized).toContain("img-src 'self'");
  expect(sanitized).toContain("font-src 'self'");
  expect(sanitized).not.toContain("'unsafe-inline'");
  expect(sanitized).not.toContain("data:");
  expect(sanitized).not.toContain("blob:");
  expect(sanitized).not.toContain("upgrade-insecure-requests");
  expect(sanitized).not.toContain("report-uri");
  expect(sanitized).not.toContain("report-to");
  if (strictProduction) expect(sanitized).not.toContain("unsafe-eval");
  else expect(sanitized).toContain("unsafe-eval");
  expect(sanitized).not.toContain("manifest-src");
  expect(sanitized).not.toContain("media-src");
  expect(sanitized).toMatch(/'nonce-\[redacted\]'/);

  // Keep the raw value only in memory so it can be compared with the DOM;
  // never include it in assertions, attachments, or logs.
  const nonce = value?.match(/'nonce-([^']+)'/)?.[1] ?? "";
  expect(Boolean(nonce)).toBe(true);
  return nonce;
}

async function expectSingleCspPolicy(response: import("@playwright/test").Response | APIResponse, strictProduction: boolean) {
  const headers = await response.headersArray();
  const policies = headers.filter((header) => header.name.toLowerCase() === "content-security-policy");
  const reportOnlyPolicies = headers.filter((header) => header.name.toLowerCase() === "content-security-policy-report-only");
  expect(policies).toHaveLength(strictProduction ? 1 : 0);
  expect(reportOnlyPolicies).toHaveLength(strictProduction ? 0 : 1);
}

function expectNoEnforcedAppViolations(
  violations: Array<{ disposition: string }>,
  strictProduction: boolean,
) {
  const enforced = violations.filter((violation) => violation.disposition === "enforce");
  if (strictProduction) expect(violations).toEqual([]);
  else expect(enforced).toEqual([]);
}

async function captureFunctionalReadiness(page: import("@playwright/test").Page, label: string) {
  const controls = label === "login"
    ? [page.getByRole("heading", { level: 1, name: /Seu próximo passo/ }), page.getByRole("textbox", { name: /E-mail/ }), page.getByRole("textbox", { name: /Senha/ }), page.getByRole("button", { name: "Entrar no CRM" })]
    : [page.getByRole("main"), page.getByRole("heading", { name: label === "dashboard" ? "Visão geral" : "Escolha um workspace", exact: true })];
  const snapshot = async () => {
    const visibleControls = await Promise.all(controls.map(async (control) => await control.count() === 1 && await control.isVisible()));
    const enabledFormControls = label === "login"
      ? await Promise.all(controls.slice(1).map(async (control) => await control.count() === 1 && await control.isEnabled())) : [];
    return { visibleControls, enabledFormControls, functionalReadinessReached: visibleControls.every(Boolean) && enabledFormControls.every(Boolean) };
  };
  let readinessAssertionPassed = false;
  try {
    await expect.poll(async () => (await snapshot()).functionalReadinessReached).toBe(true);
    readinessAssertionPassed = true;
  } catch { /* Preserve diagnostics first; the caller must assert this result. */ }
  const current = await snapshot();
  return { ...current, readinessAssertionPassed, functionalReadinessReached: readinessAssertionPassed && current.functionalReadinessReached };

}

async function summarizeStyleElements(
  page: import("@playwright/test").Page,
  responseNonce: string,
  testInfo: import("@playwright/test").TestInfo,
  documentLabel: string,
) {
  const styles = await page.locator("style").evaluateAll((elements, nonce) => {
    const tracker = (window as Window & { __safeScriptLifecycleTracker?: { styleObservedAfterDOMContentLoaded: (style: HTMLStyleElement) => boolean } }).__safeScriptLifecycleTracker;
    return elements.map((element, index) => {
      const style = element as HTMLStyleElement;
      const currentNonce = style.nonce;
      return {
        index,
        nonceState: currentNonce ? currentNonce === nonce ? "matches-document" : "different" : "missing",
        textLength: style.textContent?.length ?? 0,
        attributeNames: [...style.attributes].map((attribute) => attribute.name).sort(),
        parentTag: style.parentElement?.tagName.toLowerCase() ?? "none",
        observedAfterDOMContentLoaded: tracker?.styleObservedAfterDOMContentLoaded(style) ?? false,
      };
    });
  }, responseNonce);
  const summary = {
    styleElementCount: styles.length,
    stylesMissingNonce: styles.filter((style) => style.nonceState === "missing").length,
    stylesWithDifferentNonce: styles.filter((style) => style.nonceState === "different").length,
    stylesObservedAfterDOMContentLoaded: styles.filter((style) => style.observedAfterDOMContentLoaded).length,
    styleRecords: styles,
  };
  await testInfo.attach(`${documentLabel}-style-elements`, { body: JSON.stringify(summary, null, 2), contentType: "application/json" });
  return summary;
}

async function waitForScriptDomStability(page: import("@playwright/test").Page, functionalReadinessReached: boolean) {
  return page.evaluate(({ functionalReadinessReached }) => new Promise<{
    documentReadyState: string; framesObserved: number; configuredFrameLimit: number;
    elapsedMs: number; configuredDeadlineMs: number; stableForFrames: number;
    totalMutationCount: number; relevantMutationCount: number; lastObservedMutationCategory: string;
    pendingExternalScriptCount: number; completionUnobservedScripts: Array<Record<string, unknown>>;
    nonApplicableNomoduleScriptCount: number; supportsModules: boolean;
    observedScriptLoadCount: number; observedScriptErrorCount: number; documentScriptCount: number;
    scriptSourceViolationCount: number; reportOnlyViolationCount: number; functionalReadinessReached: boolean;
    timedOutAtFrameLimit: boolean; stabilityExitReason: string;
  }>((resolve) => {
    const configuredFrameLimit = 60; // Preserve the previous bound; do not lengthen it to hide unresolved evidence.
    const configuredDeadlineMs = 5000; // Also terminate if RAF stops (e.g. a background document).
    const startedAt = performance.now();
    let mutationVersion = 0;
    let previousMutationVersion = -1;
    let totalMutationCount = 0;
    let relevantMutationCount = 0;
    let lastObservedMutationCategory = "none";
    let stableFrames = 0;
    let framesObserved = 0;
    let animationFrame = 0;
    let finished = false;
    const state = window as Window & {
      __safeScriptLifecycleTracker?: {
        loadEventObserved: (script: HTMLScriptElement) => boolean;
        errorEventObserved: (script: HTMLScriptElement) => boolean;
      };
      __safeCspViolations?: Array<{ effectiveDirective: string; disposition: string }>;
    };
    const lifecycle = state.__safeScriptLifecycleTracker;
    const supportsModules = "noModule" in HTMLScriptElement.prototype;
    const containsScript = (node: Node) => node instanceof HTMLScriptElement
      || (node instanceof Element && Boolean(node.querySelector("script")));
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        totalMutationCount += 1;
        const relevant = record.target instanceof HTMLScriptElement
          || (record.type === "characterData" && record.target.parentElement instanceof HTMLScriptElement)
          || (record.type === "childList" && [...record.addedNodes, ...record.removedNodes].some(containsScript));
        lastObservedMutationCategory = relevant ? `script-${record.type}` : `other-${record.type}`;
        if (relevant) { mutationVersion += 1; relevantMutationCount += 1; }
      }
    });
    observer.observe(document, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["src", "type", "nonce"] });
    const snapshot = () => {
      const scripts = Array.from(document.scripts);
      const pending = scripts.filter((script) => script.hasAttribute("src")
        && !(supportsModules && script.noModule)
        && /^(?:|module|(?:text|application)\/(?:javascript|ecmascript))(?:;.*)?$/i.test(script.type.trim())
        && !lifecycle?.loadEventObserved(script) && !lifecycle?.errorEventObserved(script));
      return { scripts, pending };
    };
    const finish = (stabilityExitReason: string) => {
      if (finished) return;
      finished = true;
      observer.disconnect();
      cancelAnimationFrame(animationFrame);
      clearTimeout(deadline);
      const { scripts, pending } = snapshot();
      const violations = state.__safeCspViolations ?? [];
      resolve({
        documentReadyState: document.readyState, framesObserved, configuredFrameLimit,
        elapsedMs: Math.round(performance.now() - startedAt), configuredDeadlineMs,
        stableForFrames: stableFrames, totalMutationCount, relevantMutationCount, lastObservedMutationCategory,
        pendingExternalScriptCount: pending.length,
        supportsModules,
        nonApplicableNomoduleScriptCount: scripts.filter((script) => supportsModules && script.noModule).length,
        completionUnobservedScripts: pending.map((script) => {
          let originCategory = "unparseable";
          let knownNextPath = false;
          try { const url = new URL(script.src); originCategory = url.origin === location.origin ? "same-origin" : "external"; knownNextPath = url.pathname.startsWith("/_next/"); } catch { /* Categories only. */ }
          const resource = performance.getEntriesByName(script.src, "resource").at(-1) as PerformanceResourceTiming | undefined;
          return { index: scripts.indexOf(script), originCategory, knownNextPath, type: script.type ? "explicit" : "classic-default", attributeNames: [...script.attributes].map((attribute) => attribute.name).sort(), hasNonce: Boolean(script.nonce), resourceTimingObserved: Boolean(resource), transferCompletionObserved: Boolean(resource && resource.responseEnd > 0), loadEventObserved: false, errorEventObserved: false, completionStatus: "unobserved-not-proven-pending" };
        }),
        observedScriptLoadCount: scripts.filter((script) => lifecycle?.loadEventObserved(script)).length,
        observedScriptErrorCount: scripts.filter((script) => lifecycle?.errorEventObserved(script)).length,
        documentScriptCount: scripts.length,
        scriptSourceViolationCount: violations.filter((event) => event.effectiveDirective.startsWith("script-src")).length,
        reportOnlyViolationCount: violations.filter((event) => event.disposition === "report").length,
        functionalReadinessReached, timedOutAtFrameLimit: stabilityExitReason.startsWith("frame-limit"), stabilityExitReason,
      });
    };
    const deadline = setTimeout(() => finish("time-deadline-evidence-incomplete"), configuredDeadlineMs);
    const sampleFrame = () => {
      framesObserved += 1;
      const { pending } = snapshot();
      if (mutationVersion === previousMutationVersion && pending.length === 0) stableFrames += 1;
      else stableFrames = 0;
      previousMutationVersion = mutationVersion;
      if (!lifecycle) { finish("instrumentation-missing"); return; }
      if (stableFrames >= 2) { finish("script-observation-settled"); return; }
      if (framesObserved >= configuredFrameLimit) {
        finish(pending.length ? "frame-limit-completion-unobserved" : "frame-limit-script-mutations"); return;
      }
      animationFrame = requestAnimationFrame(sampleFrame);
    };
    animationFrame = requestAnimationFrame(sampleFrame);
  }), { functionalReadinessReached });
}

async function verifyDocumentScripts(
  page: import("@playwright/test").Page,
  responseNonce: string,
  testInfo: import("@playwright/test").TestInfo,
  documentLabel: string,
) {
  const scriptStates = await page.locator("script").evaluateAll((scripts, nonce) => {
    const classifyType = (type: string) => {
      const normalized = type.trim().toLowerCase();
      const mimeEssence = normalized.split(";", 1)[0]?.trim() ?? "";
      if (normalized === "" || /^(text|application)\/(javascript|ecmascript)$/.test(mimeEssence)) return "classic-js";
      if (normalized === "module") return "module-js";
      if (normalized === "importmap") return "import-map";
      if (normalized === "speculationrules") return "speculation-rules";
      return "non-executable-or-other";
    };

    const tracker = (window as Window & {
      __safeCspViolations?: Array<{ effectiveDirective: string; violatedDirective: string; disposition: string; blockedResource: string; sourceCategory: string; lineNumber: number; columnNumber: number; blockedScriptElement: HTMLScriptElement | null }>;
      __safeScriptLifecycleTracker?: {
        mutationObserved: (script: HTMLScriptElement) => boolean;
        addedAfterDOMContentLoaded: (script: HTMLScriptElement) => boolean;
        loadEventObserved: (script: HTMLScriptElement) => boolean;
        errorEventObserved: (script: HTMLScriptElement) => boolean;
      };
    }).__safeScriptLifecycleTracker;
    const documentScripts = Array.from(document.scripts);
    const violations = ((window as Window & {
      __safeCspViolations?: Array<{ effectiveDirective: string; violatedDirective: string; disposition: string; blockedResource: string; sourceCategory: string; lineNumber: number; columnNumber: number; blockedScriptElement: HTMLScriptElement | null }>;
    }).__safeCspViolations ?? []).map((violation) => ({
      effectiveDirective: violation.effectiveDirective,
      disposition: violation.disposition,
      blockedScriptIndex: violation.blockedScriptElement ? documentScripts.indexOf(violation.blockedScriptElement) : null,
      resourceCategory: violation.blockedResource,
    }));

    return scripts.map((element, index) => {
      const script = element as HTMLScriptElement;
      const currentNonce = script.nonce ?? "";
      const scriptKind = classifyType(script.type);
      const hasSource = script.hasAttribute("src");
      const isPolicyRelevant = scriptKind !== "non-executable-or-other";
      let origin = hasSource ? "unparseable" : "inline";
      let knownNextPath = false;
      let developmentLike = false;
      const inlineSource = hasSource ? "" : script.textContent ?? "";
      const nextRuntimeInlineHeuristic = !hasSource && /(?:self\.)?__next_f|__nextjs|__nextData/i.test(inlineSource);
      const nextIconRelocationPattern = !hasSource
        && inlineSource.includes("document.querySelectorAll")
        && inlineSource.includes("body link[rel=")
        && inlineSource.includes("apple-touch-icon")
        && inlineSource.includes("document.head.appendChild");
      if (hasSource) {
        try {
          const url = new URL(script.src, window.location.href);
          origin = url.origin === window.location.origin ? "same-origin" : "external";
          knownNextPath = url.pathname.startsWith("/_next/");
          developmentLike = (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]" || url.hostname === "::1")
            && (url.pathname.includes("webpack-hmr") || url.pathname.includes("/_next/static/development/"));
        } catch { /* Keep only a sanitized origin category. */ }
      } else {
        developmentLike = /webpackHotUpdate|__nextjs_original-stack-frames|\$RefreshReg\$/i.test(inlineSource);
      }
      const parentTag = script.parentElement?.tagName.toLowerCase() ?? "none";
      const parentHasNextId = Boolean(script.parentElement?.id.startsWith("__next"));
      const parentIdCategory = script.parentElement?.id === "__next"
        ? "next-root"
        : script.parentElement?.id.startsWith("__next")
          ? "next-prefixed"
          : script.parentElement?.id
            ? "other-id"
            : "no-id";
      const nonceState = currentNonce.length === 0 ? "missing" : currentNonce === nonce ? "matches-document" : "different";
      const mutationObserved = tracker?.mutationObserved(script) ?? false;
      const addedAfterDOMContentLoaded = tracker?.addedAfterDOMContentLoaded(script) ?? false;
      const loadEventObserved = tracker?.loadEventObserved(script) ?? false;
      const errorEventObserved = tracker?.errorEventObserved(script) ?? false;
      const resourceEntry = hasSource
        ? performance.getEntriesByName(script.src, "resource").find((entry) => entry.entryType === "resource") as PerformanceResourceTiming | undefined
        : undefined;
      const resourceInitiatorType = resourceEntry?.initiatorType ?? (hasSource ? "not-observed" : "not-applicable");
      const scriptSourceViolationCount = violations.filter((violation) =>
        violation.blockedScriptIndex === index && violation.effectiveDirective.startsWith("script-src"),
      ).length;
      const unmatchedExternalScriptSourceViolation = violations.some((violation) =>
        violation.blockedScriptIndex === null
        && violation.resourceCategory !== "inline"
        && violation.effectiveDirective.startsWith("script-src"),
      );
      const emptyInline = !hasSource && inlineSource.length === 0;
      const nextDevOverlayContainer = emptyInline
        && script.getAttribute("data-nextjs-dev-overlay") === "true"
        && script.firstElementChild?.tagName === "NEXTJS-PORTAL";
      const documentInlineScriptSourceViolationCount = violations.filter((violation) =>
        violation.resourceCategory === "inline" && violation.effectiveDirective.startsWith("script-src"),
      ).length;
      return {
        index,
        scriptKind,
        policyRelevant: isPolicyRelevant,
        emptyInline,
        nextDevOverlayContainer,
        placement: hasSource ? "external" : "inline",
        origin,
        parentTag,
        parentIdCategory,
        parentHasNextId,
        attributeNames: Array.from(script.attributes).map((attribute) => attribute.name).sort(),
        inlineTextLength: hasSource ? 0 : inlineSource.length,
        isConnected: script.isConnected,
        hasInlineText: !hasSource && inlineSource.trim().length > 0,
        sourceClassification: nextDevOverlayContainer ? "next-development-overlay-container" : knownNextPath || script.hasAttribute("data-nscript") || nextRuntimeInlineHeuristic || nextIconRelocationPattern
          ? "next-runtime-candidate"
          : developmentLike
            ? "development-tool-candidate"
            : hasSource ? "unattributed-external-script" : "unattributed-inline-script",
        knownNextPath,
        developmentLike,
        nextDataNscriptMarker: script.hasAttribute("data-nscript"),
        noModule: script.noModule,
        nonApplicableInModuleCapableBrowser: script.noModule && "noModule" in HTMLScriptElement.prototype,
        nextIconRelocationPattern,
        nonceState,
        addedAfterDOMContentLoaded,
        mutationObserved,
        insertionTiming: addedAfterDOMContentLoaded ? "observed-after-domcontentloaded" : "initial-or-pre-domcontentloaded-unresolved",
        loadEventObserved,
        errorEventObserved,
        resourceInitiatorType,
        executionEvidence: hasSource
          ? loadEventObserved ? "script-load-event-observed" : errorEventObserved ? "script-error-event-observed" : "not-confirmed-by-element-event"
          : emptyInline ? "empty-inline-no-code-at-snapshot"
            : documentInlineScriptSourceViolationCount > 0 ? "document-inline-csp-report-unmatched-to-element" : "not-confirmed-passively",
        scriptSourceViolationCount,
        externalNoncePolicyObservation: hasSource && nonceState === "missing"
          ? scriptSourceViolationCount > 0
            ? "script-src-report-correlated"
            : unmatchedExternalScriptSourceViolation
              ? "script-src-report-unmatched"
              : "no-script-src-report-observed"
          : "not-applicable",
        nextRuntimeInlineHeuristic,
        nonceAttributeHidden: currentNonce.length > 0 && script.getAttribute("nonce") === "",
        documentInlineScriptSourceViolationCount,
      };
    });
  }, responseNonce);

  const policyRelevantScripts = scriptStates.filter((script) => script.policyRelevant);
  const nonceReviewRecords = policyRelevantScripts.filter((script) => script.nonceState !== "matches-document");
  const summary = {
    scriptElementCount: scriptStates.length,
    policyRelevantScriptCount: policyRelevantScripts.length,
    inlineScriptCount: policyRelevantScripts.filter((script) => script.placement === "inline").length,
    externalScriptCount: policyRelevantScripts.filter((script) => script.placement === "external").length,
    nextDataNscriptMarkerCount: scriptStates.filter((script) => script.nextDataNscriptMarker).length,
    nonApplicableNomoduleScriptCount: scriptStates.filter((script) => script.nonApplicableInModuleCapableBrowser).length,
    knownNextPathScriptCount: scriptStates.filter((script) => script.knownNextPath).length,
    nextRuntimeInlineHeuristicCount: scriptStates.filter((script) => script.nextRuntimeInlineHeuristic).length,
    nextIconRelocationPatternCount: scriptStates.filter((script) => script.nextIconRelocationPattern).length,
    developmentLikeScriptCount: scriptStates.filter((script) => script.developmentLike).length,
    nonPolicyRelevantScriptCount: scriptStates.filter((script) => !script.policyRelevant).length,
    scriptsMissingNonce: policyRelevantScripts.filter((script) => script.nonceState === "missing").length,
    scriptsWithDifferentNonce: policyRelevantScripts.filter((script) => script.nonceState === "different").length,
    emptyInlineScriptCount: scriptStates.filter((script) => script.emptyInline).length,
    nextDevOverlayContainerCount: scriptStates.filter((script) => script.nextDevOverlayContainer).length,
    inlineScriptsMissingNonce: policyRelevantScripts.filter((script) => script.placement === "inline" && !script.emptyInline && script.nonceState === "missing").length,
    externalScriptsMissingNonce: policyRelevantScripts.filter((script) => script.placement === "external" && script.nonceState === "missing").length,
    inlineScriptsWithDifferentNonce: policyRelevantScripts.filter((script) => script.placement === "inline" && script.nonceState === "different").length,
    externalScriptsWithDifferentNonce: policyRelevantScripts.filter((script) => script.placement === "external" && script.nonceState === "different").length,
    externalWithoutNonceObservedAfterDOMContentLoaded: policyRelevantScripts.filter((script) => script.placement === "external" && script.nonceState === "missing" && script.addedAfterDOMContentLoaded).length,
    scriptsWithLoadEvent: policyRelevantScripts.filter((script) => script.loadEventObserved).length,
    scriptsWithErrorEvent: policyRelevantScripts.filter((script) => script.errorEventObserved).length,
    documentInlineScriptSourceViolationCount: scriptStates[0]?.documentInlineScriptSourceViolationCount ?? 0,
    nonceAttributeHiddenCount: scriptStates.filter((script) => script.nonceAttributeHidden).length,
    nonceReviewRecords,
  };

  await testInfo.attach(`${documentLabel}-script-nonce-summary`, {
    body: JSON.stringify(summary, null, 2),
    contentType: "application/json",
  });
  return summary;
}

async function captureCspViolations(
  page: import("@playwright/test").Page,
  testInfo: import("@playwright/test").TestInfo,
  documentLabel: string,
) {
  const events = await page.evaluate(() =>
    (() => {
      const scripts = Array.from(document.scripts);
      return ((window as Window & {
        __safeCspViolations?: Array<{ effectiveDirective: string; violatedDirective: string; disposition: string; blockedResource: string; sourceCategory: string; lineNumber: number; columnNumber: number; blockedScriptElement: HTMLScriptElement | null }>;
      }).__safeCspViolations ?? []).map((event) => ({
        effectiveDirective: event.effectiveDirective,
        violatedDirective: event.violatedDirective,
        disposition: event.disposition,
        blockedResource: event.blockedResource,
        sourceCategory: event.sourceCategory,
        lineNumber: event.lineNumber,
        columnNumber: event.columnNumber,
        blockedScriptIndex: event.blockedScriptElement ? scripts.indexOf(event.blockedScriptElement) : null,
      }));
    })(),
  );
  const grouped = new Map<string, { effectiveDirective: string; violatedDirective: string; disposition: string; resourceCategory: string; sourceCategory: string; lineNumber: number; columnNumber: number; blockedScriptIndex: number | null; count: number }>();
  for (const event of events) {
    const key = JSON.stringify([event.effectiveDirective, event.violatedDirective, event.disposition, event.blockedResource, event.sourceCategory, event.lineNumber, event.columnNumber, event.blockedScriptIndex]);
    const previous = grouped.get(key);
    if (previous) previous.count += 1;
    else grouped.set(key, {
      effectiveDirective: event.effectiveDirective,
      violatedDirective: event.violatedDirective,
      disposition: event.disposition,
      resourceCategory: event.blockedResource,
      sourceCategory: event.sourceCategory,
      lineNumber: event.lineNumber,
      columnNumber: event.columnNumber,
      blockedScriptIndex: event.blockedScriptIndex,
      count: 1,
    });
  }
  const summary = [...grouped.values()];
  await testInfo.attach(`${documentLabel}-csp-violations`, {
    body: JSON.stringify(summary, null, 2),
    contentType: "application/json",
  });
  return summary;
}

function expectDocumentScripts(
  summary: Awaited<ReturnType<typeof verifyDocumentScripts>>,
  violations: Array<{ effectiveDirective: string; disposition: string; blockedScriptIndex: number | null; count: number }>,
) {
  const scriptSourceViolations = violations
    .filter((violation) => violation.effectiveDirective.startsWith("script-src"))
    .reduce((total, violation) => total + violation.count, 0);
  expect(summary.policyRelevantScriptCount, JSON.stringify(summary)).toBeGreaterThan(0);
  expect(summary.inlineScriptsMissingNonce, JSON.stringify(summary)).toBe(0);
  expect(summary.inlineScriptsWithDifferentNonce, JSON.stringify(summary)).toBe(0);
  expect(summary.scriptsWithDifferentNonce, JSON.stringify(summary)).toBe(0);
  // External scripts without a nonce may be trusted through strict-dynamic only
  // when the browser reports no script-src violation; a path or framework name
  // alone never grants that classification.
  expect(scriptSourceViolations, JSON.stringify(violations)).toBe(0);
}

async function attachBrowserDiagnostics(
  testInfo: import("@playwright/test").TestInfo,
  documentLabel: string,
  diagnostics: Array<{ kind: string; hydrationRelated?: boolean; cspRelated?: boolean; resourceType?: string; origin?: string; developmentLike?: boolean }>,
) {
  await testInfo.attach(`${documentLabel}-browser-errors`, {
    body: JSON.stringify(diagnostics, null, 2),
    contentType: "application/json",
  });
}
