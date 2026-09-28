import { test, expect } from "@playwright/test";
import { themeConfig } from "../../src/modules/UIModule/config/theme";

test("theme follows the system until explicitly chosen and survives navigation", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  const toggle = page.locator(".theme-toggle");
  await expect(toggle).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme",
    themeConfig.dark.name,
  );
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    "content",
    themeConfig.dark.color,
  );
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme",
    themeConfig.light.name,
  );
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme",
    themeConfig.dark.name,
  );
  expect(
    await page.evaluate(
      (key) => localStorage.getItem(key),
      themeConfig.storageKey,
    ),
  ).toBe(themeConfig.dark.name);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme",
    themeConfig.dark.name,
  );
  await page.emulateMedia({ colorScheme: "dark" });
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme",
    themeConfig.light.name,
  );
  await page.goto("/en/");
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme",
    themeConfig.light.name,
  );
  await expect(page.locator(".theme-toggle")).toHaveAccessibleName(
    "Toggle light / dark theme",
  );
});

test("invalid saved theme follows system and blocked storage still permits switching", async ({
  browser,
  baseURL,
}) => {
  for (const blocked of [false, true]) {
    const context = await browser.newContext({ baseURL, colorScheme: "dark" });
    await context.addInitScript(
      ({ key, blocked }) => {
        if (blocked) {
          Object.defineProperty(window, "localStorage", {
            get() {
              throw new DOMException("Denied", "SecurityError");
            },
          });
        } else localStorage.setItem(key, "invalid-old-theme");
      },
      { key: themeConfig.storageKey, blocked },
    );
    // Astro's development toolbar accesses storage outside the application.
    // Exclude it when simulating browsers that deny all storage access.
    if (blocked)
      await context.route("**/dev-toolbar/entrypoint.js*", (route) =>
        route.fulfill({
          contentType: "application/javascript",
          body: "export {};",
        }),
      );
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      await page.goto("/");
      await expect(page.locator("html")).toHaveAttribute(
        "data-theme",
        themeConfig.dark.name,
      );
      await page.locator(".theme-toggle").click();
      await expect(page.locator("html")).toHaveAttribute(
        "data-theme",
        themeConfig.light.name,
      );
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  }
});

test("saved choice synchronizes across tabs and removing it restores the system", async ({
  page,
  context,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const second = await context.newPage();
  await second.emulateMedia({ colorScheme: "light" });
  try {
    await second.goto("/");
    await second.locator(".theme-toggle").click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      themeConfig.dark.name,
    );
    await second.evaluate(
      (key) => localStorage.removeItem(key),
      themeConfig.storageKey,
    );
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      themeConfig.light.name,
    );
  } finally {
    await second.close();
  }
});

test("both palettes render all locales without overflow and the icon has no border", async ({
  page,
}, testInfo) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme });
    for (const width of [360, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ["/", "/en/", "/de/"]) {
        expect((await page.goto(path))?.status()).toBe(200);
        await expect(page.locator("html")).toHaveAttribute(
          "data-theme-mode",
          colorScheme,
        );
        const toggle = page.locator(".theme-toggle");
        await expect(toggle).toBeVisible();
        expect(
          await toggle.evaluate((node) => getComputedStyle(node).borderWidth),
        ).toBe("0px");
        expect(
          await toggle.evaluate((node) => getComputedStyle(node).boxShadow),
        ).toBe("none");
        expect(
          await toggle.evaluate(
            (node) => getComputedStyle(node).backgroundColor,
          ),
        ).toBe("rgba(0, 0, 0, 0)");
        await expect(
          toggle.locator(colorScheme === "dark" ? ".theme-moon" : ".theme-sun"),
        ).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          `${colorScheme} ${path} ${width}`,
        ).toBe(true);
        await expect(page.locator("main h1")).toBeVisible();
        if (path === "/" && width !== 768) {
          await page.evaluate(() => document.fonts.ready);
          await page.screenshot({
            path: testInfo.outputPath(`${colorScheme}-${width}.png`),
            fullPage: true,
            style: "astro-dev-toolbar { display: none !important; }",
          });
        }
      }
    }
  }
  expect(errors).toEqual([]);
});

test("without JavaScript the default theme and content remain usable", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
  });
  try {
    const page = await context.newPage();
    expect((await page.goto("/"))?.status()).toBe(200);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator(".theme-toggle")).toBeHidden();
  } finally {
    await context.close();
  }
});

test("dark theme covers pages linked by the main menu", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/");
  const paths = await page.locator("header a[href]").evaluateAll((links) => [
    ...new Set(
      links
        .map((link) => new URL((link as HTMLAnchorElement).href))
        .filter((url) => url.origin === location.origin && !url.hash)
        .map((url) => url.pathname),
    ),
  ]);
  for (const [index, path] of paths.entries()) {
    expect((await page.goto(path))?.status(), path).toBeLessThan(400);
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      themeConfig.dark.name,
    );
    await expect(page.locator("main h1")).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`dark-page-${index}.png`),
      fullPage: true,
      style: "astro-dev-toolbar { display: none !important; }",
    });
  }
});
