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
test("single search result opens detail with every section and safe sources", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByLabel("Jméno nebo příjmení", { exact: true }).fill("Novak");
  await page.getByRole("button", { name: "Hledat v archivu" }).click();
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
test("detail starts with search and keeps the name in etymology without country codes", async ({
  page,
  browser,
}) => {
  await page.goto("/jmeno/1/");
  await expect(page.locator(".paper-section [data-name-search]")).toBeVisible();
  await expect(page.locator(".paper-section h1")).toHaveCount(0);
  await expect(page.locator("#etymology h1")).toHaveText("Novák");
  await expect(page.locator(".dossier-tags")).toContainText("Příjmení");
  for (const selector of [
    ".dossier-tags",
    ".entry-meta",
    ".calendar-card",
    "#sources p",
    "#occurrences tbody",
  ]) {
    await expect(page.locator(selector).first()).not.toContainText(
      /\b(?:CS|CZ)\b/,
    );
  }
  await page.getByLabel("Jméno nebo příjmení", { exact: true }).fill("Anna");
  await page.getByRole("button", { name: "Hledat v archivu" }).click();
  await expect(page.locator(".result-card")).toHaveCount(2);
  await expect(page).toHaveURL("/jmeno/1/");
  await expect(
    page.locator(".result-card .result-meta").first(),
  ).not.toContainText(/\b(?:CS|CZ)\b/);
  await page.getByLabel("Jméno nebo příjmení", { exact: true }).fill("Novak");
  await page.getByRole("button", { name: "Hledat v archivu" }).click();
  await expect(page).toHaveURL("/jmeno/1/");
  await expect(page.locator(".result-card")).toHaveCount(0);

  const context = await browser.newContext({ javaScriptEnabled: false });
  await blockExternalCmp(context);
  const nojs = await context.newPage();
  await nojs.goto("/jmeno/1/");
  await nojs.getByLabel("Jméno nebo příjmení", { exact: true }).fill("Anna");
  await nojs.getByRole("button", { name: "Hledat v archivu" }).click();
  await expect(nojs).toHaveURL(/\/\?q=Anna$/);
  await expect(nojs.locator(".result-card")).toHaveCount(2);
  await context.close();
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
  await expect(nojs).toHaveURL("/en/name/1/");
  await expect(nojs.locator("main h1")).toHaveText("Novák");
  await context.close();
});
test("search form locks on click and Enter, then unlocks after an error", async ({
  page,
}) => {
  await page.goto("/");
  const form = page.locator("[data-name-search]");
  const input = page.getByLabel("Jméno nebo příjmení", { exact: true });
  const submit = form.locator('button[type="submit"]');
  const requests: import("@playwright/test").Route[] = [];
  await page.route("**/api/etymolog/search/**", (route) => {
    requests.push(route);
  });
  await input.fill("Neexistuje");
  await submit.click();
  await expect.poll(() => requests.length).toBe(1);
  await expect(form).toHaveAttribute("data-submit-pending", "true");
  await expect(input).toBeDisabled();
  await expect(submit).toBeDisabled();
  expect(
    await submit.evaluate(
      (button) => getComputedStyle(button, "::before").content,
    ),
  ).toBe('""');
  await form.evaluate((node) =>
    node.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    ),
  );
  expect(requests).toHaveLength(1);
  await requests
    .shift()!
    .fulfill({ status: 503, contentType: "application/json", body: "{}" });
  await expect(form).not.toHaveAttribute("data-submit-pending", "true");
  await expect(input).toBeEnabled();
  await expect(submit).toBeEnabled();
  await input.fill("Znovu");
  await input.press("Enter");
  await expect.poll(() => requests.length).toBe(1);
  await expect(form).toHaveAttribute("data-submit-pending", "true");
  await requests
    .shift()!
    .fulfill({ status: 503, contentType: "application/json", body: "{}" });
  await expect(form).not.toHaveAttribute("data-submit-pending", "true");
});

test("admin filter and editor lock all controls while their requests run", async ({
  page,
}) => {
  await login(page, true);
  await expect(page.locator("[data-admin]")).not.toHaveAttribute(
    "aria-busy",
    "true",
  );
  const filter = page.locator("[data-filter]");
  const filterInput = filter.locator('input[name="q"]');
  const filterSubmit = filter.locator('button[type="submit"]');
  let pendingFilter: import("@playwright/test").Route | undefined;
  await page.route("**/api/admin/etymolog/names/**", (route) => {
    if (route.request().method() === "GET") pendingFilter = route;
    else void route.continue();
  });
  await filterInput.fill("Anna");
  await filterSubmit.click();
  await expect.poll(() => pendingFilter).toBeTruthy();
  await expect(filter).toHaveAttribute("data-submit-pending", "true");
  await expect(filterInput).toBeDisabled();
  await expect(filter.locator("[data-refresh]")).toBeDisabled();
  await pendingFilter!.continue();
  await expect(filter).not.toHaveAttribute("data-submit-pending", "true");
  await expect(filterInput).toBeEnabled();
  await page.locator("[data-create]").click();
  const dialog = page.locator("[data-editor]");
  const editForm = dialog.locator("[data-edit-form]");
  await dialog.locator('[name="name"]').fill("Pokusné jméno");
  let pendingSave: import("@playwright/test").Route | undefined;
  await page.route("**/api/admin/etymolog/names/", (route) => {
    if (route.request().method() === "POST") pendingSave = route;
    else void route.continue();
  });
  await editForm.locator('button[type="submit"]').click();
  await expect.poll(() => pendingSave).toBeTruthy();
  await expect(editForm).toHaveAttribute("data-submit-pending", "true");
  await expect(dialog.locator('[name="name"]')).toBeDisabled();
  await expect(editForm.locator("[data-close]")).toBeDisabled();
  await pendingSave!.fulfill({
    status: 503,
    contentType: "application/json",
    body: "{}",
  });
  await expect(editForm).not.toHaveAttribute("data-submit-pending", "true");
  await expect(dialog.locator('[name="name"]')).toBeEnabled();
});

test("native login and logout retain POST values while the form is locked", async ({
  page,
}) => {
  await page.goto("/en/login/");
  const loginForm = page.locator("[data-native-pending]");
  await loginForm.locator('[name="email"]').fill("admin@example.test");
  await loginForm.locator('[name="password"]').fill("test-password");
  let loginRequest: import("@playwright/test").Route | undefined;
  await page.route("**/api/auth/login/", (route) => {
    loginRequest = route;
  });
  const loginState = await loginForm.evaluate((form: HTMLFormElement) => {
    const button = form.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    )!;
    button.click();
    return {
      pending: form.dataset.submitPending,
      inert: form.inert,
      disabled: button.disabled,
    };
  });
  expect(loginState).toEqual({ pending: "true", inert: true, disabled: true });
  await expect.poll(() => loginRequest).toBeTruthy();
  expect(loginRequest!.request().postData()).toContain(
    "email=admin%40example.test",
  );
  expect(loginRequest!.request().postData()).toContain(
    "password=test-password",
  );
  expect(loginRequest!.request().postData()).toContain("locale=en");
  await loginRequest!.continue();
  await expect(page).toHaveURL(/\/en\/admin\/$/);
  await page.goto("/en/account/");
  const logoutForm = page.locator("[data-native-pending]");
  let logoutRequest: import("@playwright/test").Route | undefined;
  await page.route("**/api/auth/logout/", (route) => {
    logoutRequest = route;
  });
  const logoutState = await logoutForm.evaluate((form: HTMLFormElement) => {
    const button = form.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    )!;
    button.click();
    return {
      pending: form.dataset.submitPending,
      inert: form.inert,
      disabled: button.disabled,
    };
  });
  expect(logoutState).toEqual({ pending: "true", inert: true, disabled: true });
  await expect.poll(() => logoutRequest).toBeTruthy();
  expect(logoutRequest!.request().postData()).toContain("locale=en");
  await logoutRequest!.continue();
  await expect(page).toHaveURL(/\/en\/login\/$/);
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

test("one given-name detail retains multiple etymologies and mythology", async ({
  page,
}) => {
  await page.goto("/en/name/1163/");
  await expect(page.locator("main h1")).toHaveText("Shared name");
  await expect(page.locator(".dossier-tags")).toContainText("Given name");
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

test("same spelling as a given name and surname offers two distinct choices", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await page.getByLabel("Jméno nebo příjmení", { exact: true }).fill("Anna");
  await page.getByRole("button", { name: "Hledat v archivu" }).click();
  await expect(page.locator(".result-card")).toHaveCount(2);
  await expect(page.locator("[data-search-status]")).toHaveText(
    "Nalezená hesla: 2",
  );
  await expect(page.locator('.result-card[href="/jmeno/1162/"]')).toContainText(
    "Křestní jméno",
  );
  await expect(page.locator('.result-card[href="/jmeno/1164/"]')).toContainText(
    "Příjmení",
  );
  await page.locator('.result-card[href="/jmeno/1164/"]').click();
  await expect(page).toHaveURL("/jmeno/1164/");
  await expect(page.locator(".dossier-tags")).toContainText("Příjmení");
  await page.goto("/en/?q=Anna");
  await expect(page.locator(".result-card")).toHaveCount(2);
  await page.locator('.result-card[href="/en/name/1162/"]').click();
  await expect(page).toHaveURL("/en/name/1162/");
  await expect(page.locator(".dossier-tags")).toContainText("Given name");
  const sole = await request.get("/en/?q=Novak", { maxRedirects: 0 });
  expect(sole.status()).toBe(302);
  expect(sole.headers().location).toBe("/en/name/1/");
});

test("pending single-result search blocks another submit until navigation", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requests = 0;
  await page.route("**/api/etymolog/search/?q=Slow", async (route) => {
    ++requests;
    await gate;
    await route.fulfill({
      json: {
        success: true,
        data: {
          items: [{ id: 1, name: "Novák", kind: "surname" }],
          total: 1,
          page: 1,
          limit: 20,
        },
      },
    });
  });
  await page.goto("/");
  const form = page.locator("[data-name-search]");
  const input = page.getByLabel("Jméno nebo příjmení", { exact: true });
  await input.fill("Slow");
  await form.locator('button[type="submit"]').click();
  await expect.poll(() => requests).toBe(1);
  await expect(input).toBeDisabled();
  await form.evaluate((node) =>
    node.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    ),
  );
  expect(requests).toBe(1);
  release();
  await expect(page).toHaveURL("/jmeno/1/");
  await page.goBack();
  await expect(input).toBeEnabled();
});

test("homepage alternates white namedays and concise paper introduction", async ({
  page,
}) => {
  await page.goto("/");
  const section = page.locator(".today-namedays");
  await expect(section.locator("time")).toHaveAttribute(
    "datetime",
    "2026-09-30",
  );
  await expect(
    section.getByRole("link", { name: "Testovací jmeniny" }),
  ).toHaveAttribute("href", "/jmeno/1/");
  await expect(
    section.getByRole("link", { name: "Kalendář z testovací databáze" }),
  ).toHaveAttribute("target", "_blank");
  const todaySection = page.locator("main > .today-section");
  const archiveSection = page.locator("main > .page-section").last();
  await expect(todaySection).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  await expect(archiveSection).toHaveClass(/paper-section/);
  const columns = page.locator(".archive-note article");
  await expect(columns).toHaveCount(2);
  await expect(columns.nth(0).locator("h2")).toHaveText(
    "Jména mají paměť. My jí nasloucháme.",
  );
  await expect(columns.nth(1).locator("h2")).toHaveText(
    "Pramen před domněnkou",
  );
  await expect(columns.nth(0)).toContainText(
    "Obrazový doprovod je novodobá dekorativní ilustrace",
  );
  await expect(columns.nth(1)).toContainText(
    "Rozlišujeme doloženou etymologii",
  );
  await expect(page.locator(".archive-note img, .archive-note a")).toHaveCount(
    0,
  );
  const first = (await columns.nth(0).boundingBox())!;
  const second = (await columns.nth(1).boundingBox())!;
  expect(Math.abs(first.y - second.y)).toBeLessThan(2);
  expect(Math.abs(first.width - second.width)).toBeLessThan(2);
  const titles = await columns.locator("h2").evaluateAll((elements) =>
    elements.map((element) => {
      const style = getComputedStyle(element);
      return [style.fontFamily, style.fontSize, style.fontWeight];
    }),
  );
  expect(titles[0]).toEqual(titles[1]);
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileFirst = (await columns.nth(0).boundingBox())!;
  const mobileSecond = (await columns.nth(1).boundingBox())!;
  expect(mobileSecond.y).toBeGreaterThan(mobileFirst.y + mobileFirst.height);
  expect(
    await section.evaluate(
      (el) =>
        !!(
          el.compareDocumentPosition(document.querySelector(".archive-note")!) &
          Node.DOCUMENT_POSITION_FOLLOWING
        ),
    ),
  ).toBe(true);
});
