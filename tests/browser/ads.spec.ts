import { test, expect } from "./fixtures";

test("ad providers wait for consent and request side slots only when visible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const scripts: string[] = [];
  await page.route("https://ssp.seznam.cz/static/js/ssp.js", (route) => {
    scripts.push("seznam");
    return route.fulfill({
      contentType: "application/javascript",
      body: "window.sssp = { getAds(configs) { configs.forEach(config => { document.getElementById(config.id).dataset.rendered = String(config.zoneId); }); } };",
    });
  });
  await page.route("https://pagead2.googlesyndication.com/**", (route) => {
    scripts.push("google");
    return route.fulfill({
      contentType: "application/javascript",
      body: "window.adsbygoogle = { push() { document.querySelectorAll('.adsbygoogle').forEach(el => el.dataset.rendered = 'google'); } };",
    });
  });
  await page.goto("/");
  await page.evaluate(() => {
    document.getElementById("ad-top")!.dataset.adUnit = JSON.stringify({
      provider: "google",
      client: "ca-pub-123456",
      slot: "12345",
    });
    document.getElementById("ad-left")!.dataset.adUnit = JSON.stringify({
      provider: "seznam",
      zoneId: 12345,
      width: 160,
      height: 600,
    });
  });
  expect(scripts).toEqual([]);
  await page.evaluate(async () => {
    // This is the same Vite module a project's CMP imports; no test-only global in the app.
    const modulePath = "/src/modules/AdsModule/providers/consent.ts";
    const { consentProvider } = await import(/* @vite-ignore */ modulePath);
    consentProvider.setAdvertising(true);
  });
  await expect(page.locator('#ad-top [data-rendered="google"]')).toHaveCount(1);
  expect(scripts).toEqual(["google"]);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.locator("#ssp-zone-12345")).toHaveAttribute(
    "data-rendered",
    "12345",
  );
  expect(scripts).toEqual(["google", "seznam"]);
});

test("top ad moves at half scroll speed and footer has no ad", async ({
  page,
}) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await expect(page.locator(".ad-bottom, #ad-bottom")).toHaveCount(0);
    const windowElement = page.locator(".top-ad-reveal");
    const banner = page.locator(".ad-top");
    const initial = await windowElement.boundingBox();
    const documentHeight = await page.evaluate(
      () => document.documentElement.scrollHeight,
    );
    const position = async () => (await banner.boundingBox())!.y;
    await page.evaluate(
      (y) => scrollTo({ top: y, behavior: "instant" }),
      initial!.y + initial!.height / 2,
    );
    await expect
      .poll(position)
      .toBeCloseTo(initial!.y - (initial!.y + initial!.height / 2) * 0.5, 0);
    await page.evaluate(
      (y) => scrollTo({ top: y, behavior: "instant" }),
      initial!.y + initial!.height * 0.75,
    );
    await expect
      .poll(position)
      .toBeCloseTo(initial!.y - (initial!.y + initial!.height * 0.75) * 0.5, 0);
    expect((await windowElement.boundingBox())!.height).toBe(initial!.height);
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight),
    ).toBe(documentHeight);
    await page.evaluate(
      (y) => scrollTo({ top: y, behavior: "instant" }),
      initial!.y + initial!.height + 50,
    );
    await expect
      .poll(
        async () => (await windowElement.boundingBox())!.y + initial!.height,
      )
      .toBeLessThan(0);
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await expect.poll(position).toBeCloseTo(initial!.y, 0);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.evaluate(() => scrollTo({ top: 50, behavior: "instant" }));
    await expect.poll(position).toBeCloseTo(initial!.y - 50, 0);
  }
});

test("sticky side ads stay above full-width section backgrounds", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.evaluate(() => scrollTo({ top: 350, behavior: "instant" }));
  for (const selector of [".ad-left", ".ad-right"]) {
    const ad = page.locator(selector);
    await expect
      .poll(async () => (await ad.boundingBox())!.y)
      .toBeCloseTo(
        (await page.locator(".site-header").boundingBox())!.height + 16,
        0,
      );
    const aboveBackground = await ad.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return [rect.top + 30, rect.bottom - 30].every((y) => {
        const hit = document.elementFromPoint(rect.left + rect.width / 2, y);
        return hit !== null && el.contains(hit);
      });
    });
    expect(aboveBackground).toBe(true);
  }
});

test("Seznam zones use supplied IDs and sizes only after consent and with enough space", async ({
  page,
}) => {
  const calls: { zoneId: number; id: string; width: number; height: number }[] =
    [];
  let scripts = 0;
  await page.exposeFunction(
    "recordSeznamAd",
    (config: (typeof calls)[number]) => calls.push(config),
  );
  await page.route("https://ssp.seznam.cz/static/js/ssp.js", (route) => {
    scripts++;
    return route.fulfill({
      contentType: "application/javascript",
      body: `window.sssp = { getAds(configs) { configs.forEach(config => {
        window.recordSeznamAd(config);
        const ad = document.createElement('div');
        ad.style.width = config.width + 'px';
        ad.style.height = config.height + 'px';
        document.getElementById(config.id).append(ad);
      }); } };`,
    });
  });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/");
  expect(scripts).toBe(0);
  await page.evaluate(async () => {
    const modulePath = "/src/modules/AdsModule/providers/consent.ts";
    const { consentProvider } = await import(/* @vite-ignore */ modulePath);
    consentProvider.setAdvertising(true);
  });
  // Let visibility/resize observers run before asserting that mobile does not request desktop ads.
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  expect(scripts).toBe(0);
  expect(calls).toEqual([]);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect.poll(() => calls.length).toBe(3);
  expect(calls.sort((a, b) => a.zoneId - b.zoneId)).toEqual([
    { zoneId: 429132, id: "ssp-zone-429132", width: 728, height: 90 },
    { zoneId: 429135, id: "ssp-zone-429135", width: 160, height: 600 },
    { zoneId: 429138, id: "ssp-zone-429138", width: 160, height: 600 },
  ]);
  expect(scripts).toBe(1);
  for (const call of calls) {
    const zone = page.locator(`#${call.id}`);
    await expect(zone).toHaveCount(1);
    const fits = await zone.evaluate(
      (el) => el.getBoundingClientRect().width <= el.parentElement!.clientWidth,
    );
    expect(fits).toBe(true);
  }
  await page.setViewportSize({ width: 1536, height: 1000 });
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  expect(calls).toHaveLength(3);
});
