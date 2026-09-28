import { test, expect } from "@playwright/test";
import definitions from "../../src/modules/EtymologModule/config/resources.json" with { type: "json" };
async function login(page: import("@playwright/test").Page, admin = false) {
  await page.goto("/en/admin/");
  await expect(page).toHaveURL(/\/en\/login\/$/);
  await page
    .getByLabel("Email", { exact: true })
    .fill(admin ? "admin@example.test" : "user@example.test");
  await page.getByLabel("Password", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/admin\/$/);
}
test("search updates below form, detail shows every section and sources safely", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByLabel("Jméno nebo příjmení", { exact: true }).fill("Novak");
  await page.getByRole("button", { name: "Hledat v archivu" }).click();
  await expect(page.locator("[data-search-status]")).toHaveText(
    "Nalezená hesla: 1",
  );
  await page.locator(".result-card").click();
  await expect(page).toHaveURL("/name/1/");
  await expect(page.locator("main h1")).toHaveText("Novák");
  for (const id of [
    "etymology",
    "history",
    "clerical_error",
    "legend",
    "mythology",
    "fiction",
    "tradition",
    "proverb",
    "variants",
    "occurrences",
    "calendar",
    "sources",
  ])
    await expect(page.locator(`#${id}`)).toBeVisible();
  await expect(page.locator("#sources")).toContainText("CC0");
  await expect(page.locator("#calendar")).toContainText("Juliánský");
  expect(await page.content()).not.toContain("should-not-leak");
  expect(errors).toEqual([]);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "http://localhost:4338/name/1/",
  );
  await page.locator(".language-picker summary").click();
  await page
    .locator(".language-picker")
    .getByRole("link", { name: "English", exact: true })
    .click();
  await expect(page).toHaveURL("/en/name/1/");
  const response = await request.get("/api/etymolog/search/?q=Novak");
  expect(await response.text()).not.toMatch(
    /private_field|should-not-leak|test-only-secret/,
  );
  expect((await request.get("/name/999/")).status()).toBe(404);
  await page.screenshot({ path: "test-results/detail.png", fullPage: true });
});
test("search empty, failure, invalid input and no-JS fallback", async ({
  page,
  browser,
  request,
}) => {
  await page.goto("/?q=Nobody");
  await expect(page.locator("[data-empty]")).toBeVisible();
  await page.getByLabel("Jméno nebo příjmení", { exact: true }).fill("error");
  await page.getByRole("button", { name: "Hledat v archivu" }).click();
  await expect(page.locator("[data-search-status]")).toContainText(
    "dočasně nedostupný",
  );
  expect((await request.get("/api/etymolog/search/?q=x")).status()).toBe(422);
  const context = await browser.newContext({
    javaScriptEnabled: false,
    reducedMotion: "reduce",
  });
  const nojs = await context.newPage();
  await nojs.goto("/en/");
  await nojs.getByLabel("Name or surname", { exact: true }).fill("Novak");
  await nojs.getByRole("button", { name: "Search the archive" }).click();
  await expect(nojs.locator(".result-card")).toContainText("Novák");
  await context.close();
});
test("theme survives navigation and contact uses actual reference data", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator(".theme-toggle").click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme",
    "newspaper-dark",
  );
  await page.goto("/contact/");
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme",
    "newspaper-dark",
  );
  await expect(page.locator("main")).toContainText("04473442");
  await expect(page.locator("main")).toContainText(
    "Eleonory Voračické 2167/29",
  );
  await expect(page.locator("main")).toContainText("info@prasentace.cz");
  await page.screenshot({
    path: "test-results/contact-dark.png",
    fullPage: true,
  });
});
test("admin APIs require auth, reject CSRF, hide jobs from editors and protect server fields", async ({
  page,
  request,
}) => {
  expect((await request.get("/api/admin/etymolog/names/")).status()).toBe(401);
  await login(page);
  await expect(page.locator('[data-resource="sync-jobs"]')).toHaveCount(0);
  const api = page.request;
  expect((await api.get("/api/admin/etymolog/sync-jobs/")).status()).toBe(403);
  expect(
    (
      await api.post("/api/admin/etymolog/names/", {
        headers: { Origin: "https://foreign.test" },
        data: { name: "evil" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await api.post("/api/admin/etymolog/names/", {
        headers: { Origin: "http://localhost:4338" },
        data: { franchise_code: "other" },
      })
    ).status(),
  ).toBe(422);
  expect((await api.get("/api/admin/etymolog/auth/")).status()).toBe(404);
  const response = await api.get("/en/admin/");
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(await response.text()).not.toContain("test-only-secret");
  await page.screenshot({ path: "test-results/admin.png", fullPage: true });
});
test("all ten resource forms create, read, update and delete through authenticated APIs", async ({
  page,
}) => {
  test.setTimeout(90000);
  await login(page, true);
  for (const [resource, definition] of Object.entries(definitions)) {
    await page.locator(`[data-resource="${resource}"]`).click();
    await expect(page.locator("[data-admin]")).not.toHaveAttribute(
      "aria-busy",
      "true",
    );
    await page.locator("[data-create]").click();
    const dialog = page.locator("[data-editor]");
    await expect(dialog).toBeVisible();
    for (const field of definition.required) {
      const input = dialog.locator(`[name="${field}"]`);
      const tag = await input.evaluate((e) => e.tagName);
      if (tag === "SELECT") continue;
      const type = await input.getAttribute("type");
      await input.fill(
        type === "number"
          ? "1"
          : field === "source_url"
            ? "https://example.org/source"
            : field === "country_code"
              ? "CZ"
              : `Test ${resource}`,
      );
    }
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.locator("[data-admin-status]")).toHaveText(
      "Record saved.",
    );
    const row = page.locator("[data-admin-rows] tr").last();
    await row.getByRole("button", { name: "Edit", exact: true }).click();
    await expect(dialog).toBeVisible();
    const firstText = dialog.locator('input[type="text"],textarea').first();
    if (await firstText.count()) await firstText.fill("Updated");
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.locator("[data-admin-status]")).toHaveText(
      "Record saved.",
    );
    page.once("dialog", (d) => d.accept());
    await row.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.locator("[data-admin-status]")).toHaveText(
      "Record deleted.",
    );
  }
});
