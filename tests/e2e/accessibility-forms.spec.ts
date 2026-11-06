import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Acessibilidade do formulário de login", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("associa labels e IDs únicos aos campos e permite localizá-los pelos labels", async ({ page }) => {
    const form = page.locator("form.auth-form");
    await expect(form).toBeVisible();

    const email = page.getByLabel("E-mail*", { exact: true });
    const password = page.getByLabel("Senha*", { exact: true });
    // A árvore acessível separa o nó de texto "rota" do span que contém o ponto.
    const brand = page.getByRole("link", { name: "rota . CRM COMERCIAL", exact: true });
    await expect(brand).toHaveAccessibleName("rota . CRM COMERCIAL");
    await expect(brand).toHaveAttribute("href", "/");
    await expect(email).toHaveAttribute("type", "email");
    await expect(password).toHaveAttribute("type", "password");
    await expect(email).toHaveAccessibleName("E-mail");
    await expect(password).toHaveAccessibleName("Senha");

    const associationIssues = await form.evaluate((element) => {
      const fields = Array.from(element.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea"));
      const ids = fields.map((field) => field.id);
      const labels = Array.from(element.querySelectorAll("label"));
      const duplicateIds = ids.filter((id, index) => !id || ids.indexOf(id) !== index);
      const unassociatedLabels = labels.filter((label) => {
        const target = label.htmlFor ? document.getElementById(label.htmlFor) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null : null;
        return !target || !element.contains(target) || !Array.from(target.labels ?? []).includes(label);
      }).map((label) => label.textContent?.trim() ?? "(label sem texto)");
      const unlabeledFields = fields.filter((field) => !field.labels?.length).map((field) => field.id || field.tagName.toLowerCase());
      return { duplicateIds, unassociatedLabels, unlabeledFields };
    });

    expect(associationIssues.duplicateIds).toEqual([]);
    expect(associationIssues.unassociatedLabels).toEqual([]);
    expect(associationIssues.unlabeledFields).toEqual([]);
    await expect(email).toHaveCount(1);
    await expect(password).toHaveCount(1);
  });

  test("permite navegar pelos campos e pelo botão usando Tab", async ({ page }) => {
    const email = page.getByLabel("E-mail*", { exact: true });
    const password = page.getByLabel("Senha*", { exact: true });
    const submit = page.getByRole("button", { name: "Entrar no CRM" });

    await email.focus();
    await expect(email).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(password).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(submit).toBeFocused();
  });

  test("reorganiza o login sem overflow nas larguras de desktop, tablet e celular", async ({ page }) => {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
      }));
      expect(dimensions.content, `overflow em ${viewport.width}px`).toBeLessThanOrEqual(dimensions.viewport);
      await expect(page.getByRole("heading", { name: /Seu próximo passo/ })).toBeVisible();
      await expect(page.getByLabel("E-mail*", { exact: true })).toBeVisible();
      await expect(page.getByLabel("Senha*", { exact: true })).toBeVisible();
    }
  });

  test("não apresenta violações axe na página de login nos dois temas", async ({ page }) => {
    for (const theme of ["light", "dark"] as const) {
      await page.evaluate((value) => { document.documentElement.dataset.theme = value; }, theme);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations, `violações axe no tema ${theme}`).toEqual([]);
    }
  });
});
