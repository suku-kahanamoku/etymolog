import { test, expect, cmpScriptUrl } from "./fixtures";

const approved = {
  consentExists: true,
  tcfcompliant: true,
  tcfversion: 2,
  consentstring: "mock-approved-tcf",
  vendorConsents: { "621": true },
  purposeConsents: { "1": true },
};
const rejected = {
  ...approved,
  consentstring: "mock-rejected-tcf",
  vendorConsents: { "621": false },
};

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.route(cmpScriptUrl, (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `(() => {
      const listeners = new Map();
      let state = JSON.parse(sessionStorage.getItem('mock-cmp') || '{"consentExists":false}');
      window.__cmp = (command, args) => {
        if (command === 'addEventListener') {
          if (!listeners.has(args[0])) listeners.set(args[0], new Set());
          listeners.get(args[0]).add(args[1]);
        }
        if (command === 'removeEventListener') listeners.get(args[0])?.delete(args[1]);
        if (command === 'consentStatus') return { consentExists: state.consentExists };
        if (command === 'getCMPData') return state;
        if (command === 'test-choice') {
          state = args;
          sessionStorage.setItem('mock-cmp', JSON.stringify(state));
          listeners.get('consent')?.forEach(callback => callback());
        }
      };
    })();`,
    }),
  );
  await page.route("https://ssp.seznam.cz/static/js/ssp.js", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: "window.sssp = { getAds(zones) { zones.forEach(zone => { document.getElementById(zone.id).dataset.rendered = 'true'; }); } };",
    }),
  );
});

test("CMP loads first, requires consent and revokes already loaded ads", async ({
  page,
}) => {
  let adScripts = 0;
  page.on("request", (request) => {
    if (request.url().includes("ssp.seznam.cz")) adScripts++;
  });
  await page.goto("/");
  await expect(page.locator("head script").first()).toHaveAttribute(
    "src",
    cmpScriptUrl,
  );
  await expect(page.locator(`script[src="${cmpScriptUrl}"]`)).toHaveCount(1);
  await expect(page.locator(`script[src="${cmpScriptUrl}"]`)).toHaveAttribute(
    "data-cmp-ab",
    "1",
  );
  expect(adScripts).toBe(0);
  await page.evaluate(
    (choice) => window.__cmp!("test-choice", choice),
    rejected,
  );
  expect(adScripts).toBe(0);
  await page.evaluate(
    (choice) => window.__cmp!("test-choice", choice),
    approved,
  );
  await expect(page.locator('[data-rendered="true"]')).toHaveCount(3);
  expect(adScripts).toBe(1);
  const navigated = page.waitForEvent(
    "framenavigated",
    (frame) => frame === page.mainFrame(),
  );
  await page.evaluate(
    (choice) => window.__cmp!("test-choice", choice),
    rejected,
  );
  await navigated;
  await page.waitForLoadState("networkidle");
  await expect(page.locator('[data-rendered="true"]')).toHaveCount(0);
  expect(adScripts).toBe(1);
});

test("stored approval is restored on a new document", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(
    (choice) => sessionStorage.setItem("mock-cmp", JSON.stringify(choice)),
    approved,
  );
  await page.reload();
  await expect(page.locator('[data-rendered="true"]')).toHaveCount(3);
});

for (const [label, change] of [
  ["disabled TCF", { tcfcompliant: false }],
  ["non-TCF CMP", { tcfversion: 0 }],
  ["missing Seznam", { vendorConsents: {} }],
  ["missing storage consent", { purposeConsents: {} }],
  ["missing consent string", { consentstring: "" }],
] as const) {
  test(`ads remain blocked with ${label}`, async ({ page }) => {
    let adScripts = 0;
    page.on("request", (request) => {
      if (request.url().includes("ssp.seznam.cz")) adScripts++;
    });
    await page.goto("/");
    await page.evaluate((choice) => window.__cmp!("test-choice", choice), {
      ...approved,
      ...change,
    });
    await page.waitForLoadState("networkidle");
    expect(adScripts).toBe(0);
    await expect(page.locator('[data-rendered="true"]')).toHaveCount(0);
  });
}

test("CMP may replace its queued stub with the loaded API", async ({
  page,
}) => {
  await page.route(cmpScriptUrl, (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `const queued = []; window.__cmp = (command, args) => {
      if (command === 'addEventListener') queued.push(args);
    };
    setTimeout(() => {
      const choice = ${JSON.stringify(approved)};
      window.__cmp = command => command === 'consentStatus' ? {consentExists:true} : command === 'getCMPData' ? choice : undefined;
      queued.forEach(args => { if (args[0] === 'settings') args[1](); });
    }, 500);`,
    }),
  );
  await page.goto("/");
  await expect(page.locator('[data-rendered="true"]')).toHaveCount(3);
});
