import { test, expect, blockExternalCmp } from "./fixtures";
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
  await expect(page).toHaveURL("/jmeno/1/");
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
    "http://localhost:4338/jmeno/1/",
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
  expect((await request.get("/jmeno/999/")).status()).toBe(404);
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
  await blockExternalCmp(context);
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
  await page.goto("/kontakt/");
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

test("admin starts background synchronization and sees progress without leaving the page", async ({
  page,
}) => {
  await login(page, true);
  await expect(page.locator("[data-sync-start]")).toBeHidden();
  await page.locator('[data-resource="sync-jobs"]').click();
  const start = page.getByRole("button", {
    name: "Start synchronization",
    exact: true,
  });
  await expect(start).toBeVisible();
  const response = page.waitForResponse(
    (r) => r.url().includes("/sync/start") && r.request().method() === "POST",
  );
  await start.click();
  expect((await response).status()).toBe(202);
  await expect(page.locator("[data-sync-start]")).toBeDisabled();
  await expect(page.locator("[data-publish-all]")).toBeDisabled();
  await expect(page.locator("[data-sync-status]")).toContainText("Completed", {
    timeout: 10000,
  });
  await expect(page.locator("[data-sync-status]")).toContainText("2/2");
  await expect(start).toBeEnabled();
  const hostile = await page.request.post("/api/admin/etymolog/sync/start/", {
    data: {},
    headers: { Origin: "https://evil.test" },
  });
  expect(hostile.status()).toBe(403);
  const invalid = await page.request.post("/api/admin/etymolog/sync/start/", {
    data: { tenant: "other" },
    headers: { Origin: "http://localhost:4338" },
  });
  expect(invalid.status()).toBe(422);
  await page.screenshot({
    path: "test-results/sync-admin.png",
    fullPage: true,
  });
});

test("editor cannot start or inspect synchronization", async ({ page }) => {
  await login(page);
  await expect(page.locator("[data-sync-start]")).toHaveCount(0);
  expect(
    (await page.request.get("/api/admin/etymolog/sync/status/")).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post("/api/admin/etymolog/sync/start/", {
        data: {},
        headers: { Origin: "http://localhost:4338" },
      })
    ).status(),
  ).toBe(403);
});

test("narratives lead the dossier and statistics are its final section", async ({
  page,
}) => {
  await page.goto("/jmeno/1/");
  const sections = await page
    .locator(".dossier-body .dossier-group")
    .evaluateAll((nodes) => nodes.map((node) => node.id));
  expect(sections.slice(0, 2)).toEqual(["etymology", "mythology"]);
  expect(sections.at(-1)).toBe("occurrences");
  await expect(page.locator(".dossier-index a").last()).toHaveAttribute(
    "href",
    "#occurrences",
  );
});

test("old statistical name links redirect to one dossier with honest missing-source states", async ({
  page,
  request,
}) => {
  const redirect = await request.get("/jmeno/864/", { maxRedirects: 0 });
  expect(redirect.status()).toBe(302);
  expect(redirect.headers().location).toBe("/jmeno/1162/");
  await page.goto("/jmeno/864/");
  await expect(page).toHaveURL("/jmeno/1162/");
  await expect(page.locator("main h1")).toHaveText("Anna");
  await expect(page.locator("#etymology")).toContainText(
    "zatím nemáme zveřejněný etymologický výklad",
  );
  await expect(page.locator("#mythology")).toContainText(
    "zatím nemáme doložené",
  );
  await expect(page.locator(".dossier-group").last()).toHaveAttribute(
    "id",
    "occurrences",
  );
  await page.screenshot({
    path: "test-results/anna-dossier.png",
    fullPage: true,
  });
});

test("one shared name detail retains multiple etymologies and mythology", async ({
  page,
}) => {
  await page.goto("/en/name/1163/");
  await expect(page.locator("main h1")).toHaveText("Shared name");
  await expect(page.locator(".dossier-tags")).toContainText(
    "Given name and surname",
  );
  await expect(page.locator("#etymology .entry")).toHaveCount(2);
  await expect(page.locator("#mythology .entry")).toHaveCount(1);
  await expect(page.locator("#sources li")).toHaveCount(1);
});

test("sync jobs show source errors and cooldown instead of a dash", async ({
  page,
}) => {
  await login(page, true);
  await page.route("**/api/admin/etymolog/sync-jobs/?*", (route) =>
    route.fulfill({
      json: {
        success: true,
        data: [
          {
            id: 30,
            title: "Wikipedia",
            enabled: 1,
            last_status: "failed",
            last_error: "upstream_rate_limited",
          },
          {
            id: 21,
            title: "Dictionary",
            enabled: 1,
            last_status: "success",
            last_error: null,
          },
          {
            id: 11,
            title: "Disabled dictionary",
            enabled: 0,
            last_status: null,
            last_error: null,
          },
        ],
      },
    }),
  );
  await page.route("**/api/admin/etymolog/sync/status/", (route) =>
    route.fulfill({
      json: {
        success: true,
        data: {
          status: "running",
          completed: 0,
          total: 3,
          failed: 0,
          processed: 0,
          retry_at: "2099-01-01 03:00:00",
        },
      },
    }),
  );
  await page.locator('[data-resource="sync-jobs"]').click();
  const rows = page.locator("[data-admin-rows]");
  await expect(rows).toContainText("Source temporarily limits requests (429)");
  await expect(rows).toContainText("Batch completed");
  await expect(rows).toContainText("Disabled · Awaiting first run");
  await expect(page.locator("[data-sync-status]")).toContainText(
    "Next attempt no earlier than",
  );
  await expect(page.locator("[data-sync-start]")).toBeDisabled();
  await expect(page.locator("[data-publish-all]")).toBeDisabled();
});

test("admin publishes all current drafts through the adjacent toolbar button", async ({
  page,
}) => {
  await login(page, true);
  const api = page.request;
  for (const resource of ["names", "entries", "calendar-days"]) {
    expect(
      (
        await api.post(`/api/admin/etymolog/${resource}/`, {
          headers: { Origin: "http://localhost:4338" },
          data:
            resource === "names"
              ? { name: "Fixture", kind: "given", published: 0 }
              : { title: "Fixture", published: 0 },
        })
      ).status(),
    ).toBe(201);
  }
  await expect(page.locator("[data-publish-all]")).toBeHidden();
  await page.locator('[data-resource="sync-jobs"]').click();
  await expect(
    page.locator("[data-sync-start] + [data-publish-all]"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Publish all", exact: true }).click();
  await expect(page.locator("[data-publish-status]")).toContainText(
    "Published records: 4. Skipped records: 0.",
  );
  for (const resource of ["names", "entries", "calendar-days"]) {
    const r = await api.get(`/api/admin/etymolog/${resource}/`);
    expect(
      (await r.json()).data.every(
        (record: { published: number }) => record.published === 1,
      ),
    ).toBe(true);
  }
  await page.getByRole("button", { name: "Publish all", exact: true }).click();
  await expect(page.locator("[data-publish-status]")).toContainText(
    "Published records: 0.",
  );
  expect(
    (
      await api.post("/api/admin/etymolog/publish-all/", {
        headers: { Origin: "https://evil.test" },
        data: {},
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await api.post("/api/admin/etymolog/publish-all/", {
        headers: { Origin: "http://localhost:4338" },
        data: { force: true },
      })
    ).status(),
  ).toBe(422);
});

test("bulk publication is unavailable to editors", async ({ page }) => {
  await login(page);
  await expect(page.locator("[data-publish-all]")).toHaveCount(0);
  expect(
    (
      await page.request.post("/api/admin/etymolog/publish-all/", {
        headers: { Origin: "http://localhost:4338" },
        data: {},
      })
    ).status(),
  ).toBe(403);
});

test("bulk publication displays skipped evidence without interpreting HTML", async ({
  page,
}) => {
  await login(page, true);
  await page.route("**/api/admin/etymolog/publish-all/", (route) =>
    route.fulfill({
      json: {
        success: true,
        data: {
          published: 2,
          skipped: 1,
          skipped_records: [
            {
              resource: "entries",
              id: 12,
              reason: "Missing citation <img src=x onerror=alert(1)>",
            },
          ],
        },
      },
    }),
  );
  await page.locator('[data-resource="sync-jobs"]').click();
  await page.getByRole("button", { name: "Publish all", exact: true }).click();
  await expect(page.locator("[data-publish-status]")).toContainText(
    "Published records: 2. Skipped records: 1.",
  );
  await expect(page.locator("[data-publish-skipped]")).toContainText(
    "#12: Missing citation <img",
  );
  await expect(page.locator("[data-publish-skipped] img")).toHaveCount(0);
});
