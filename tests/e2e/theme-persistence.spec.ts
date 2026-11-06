import { expect, test } from "@playwright/test";

test("restaura o tema pelo cookie em HTML SSR, navegação e recarga", async ({ page }) => {
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });

  for (const theme of ["dark", "light"] as const) {
    await page.context().addCookies([{ name: "rota-theme", value: theme, url: "http://127.0.0.1:3101" }]);
    const response = await page.goto("/login");

    expect(response?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(page.locator("html")).toHaveCSS("color-scheme", theme);
    const initialNonce = await page.locator("head script").first().evaluate((script) => (script as HTMLScriptElement).nonce);
    const cspHeader = process.env.THEME_ENFORCED_CSP === "1" ? "content-security-policy" : "content-security-policy-report-only";
    const initialPolicy = response?.headers()[cspHeader] ?? "";
    expect(initialNonce).toBeTruthy();
    expect(initialPolicy).toContain(`'nonce-${initialNonce}'`);
    expect(await page.locator('script[src^="chrome-extension://"]').count()).toBe(0);

    const reloadResponse = await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const reloadNonce = await page.locator("head script").first().evaluate((script) => (script as HTMLScriptElement).nonce);
    const reloadPolicy = reloadResponse?.headers()[cspHeader] ?? "";
    expect(reloadPolicy).toContain(`'nonce-${reloadNonce}'`);
    expect(reloadNonce).not.toBe(initialNonce);
    await page.goto("/login?reason=session");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  }

  expect(browserErrors).toEqual([]);
});

test("migra a preferência legada do localStorage antes de pintar a página", async ({ page }) => {
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  await page.addInitScript(() => localStorage.setItem("rota-theme", "dark"));
  const response = await page.goto("/login");

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect.poll(async () => page.evaluate(() => document.cookie)).toContain("rota-theme=dark");
  await expect.poll(async () => page.evaluate(() => localStorage.getItem("rota-theme"))).toBeNull();

  const headers = response?.headers() ?? {};
  const csp = headers["content-security-policy"] ?? headers["content-security-policy-report-only"];
  expect(csp).toContain("script-src 'self' 'nonce-");
  expect(csp).not.toContain("unsafe-inline");
  if (process.env.THEME_ENFORCED_CSP === "1") expect(headers["content-security-policy"]).toBeTruthy();
  else expect(headers["content-security-policy-report-only"]).toBeTruthy();
  const nonce = await page.locator("head script").first().evaluate((script) => (script as HTMLScriptElement).nonce);
  expect(nonce).toBeTruthy();
  expect(csp).toContain(`'nonce-${nonce}'`);
  expect(browserErrors).toEqual([]);
});
