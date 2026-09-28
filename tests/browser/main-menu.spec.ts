import { test, expect } from "@playwright/test";

test("shared desktop header centers links between branding and ordered actions", async ({
  page,
}) => {
  for (const width of [1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/en/", "/de/"]) {
      await page.goto(path);
      const menu = page.locator("[data-main-menu]");
      const brand = (await menu.locator(".header-brand").boundingBox())!;
      const nav = (await menu.locator(".desktop-nav").boundingBox())!;
      const row = (await menu.locator(".header-inner").boundingBox())!;
      const actions = (await menu.locator(".header-actions").boundingBox())!;
      expect(
        nav.x + nav.width / 2,
        `${path} ${width}: centered menu`,
      ).toBeCloseTo(row.x + row.width / 2, 0);
      expect(
        nav.x,
        `${path} ${width}: brand does not overlap links`,
      ).toBeGreaterThanOrEqual(brand.x + brand.width + 8);
      expect(
        actions.x,
        `${path} ${width}: actions do not overlap links`,
      ).toBeGreaterThanOrEqual(nav.x + nav.width + 8);
      const theme = (await menu.locator(".theme-toggle").boundingBox())!;
      const language = (await menu.locator(".language-picker").boundingBox())!;
      expect(language.x - theme.x - theme.width).toBeCloseTo(8, 0);
      const action = menu.locator(".header-primary-action");
      if (await action.count())
        expect((await action.boundingBox())!.x).toBeGreaterThan(
          language.x + language.width,
        );
      await expect(menu.locator(".menu-toggle")).toBeHidden();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
});

test("shared mobile header preserves icon spacing and closes menu after resizing", async ({
  page,
}) => {
  for (const width of [360, 768, 1100]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const menu = page.locator("[data-main-menu]");
    const toggle = menu.locator("[data-menu-toggle]");
    await expect(menu.locator(".desktop-nav")).toBeHidden();
    await expect(toggle).toBeVisible();
    const theme = (await menu.locator(".theme-toggle").boundingBox())!;
    const language = (await menu.locator(".language-picker").boundingBox())!;
    expect(language.x - theme.x - theme.width).toBeCloseTo(8, 0);
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(menu.locator(".mobile-nav")).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await page.setViewportSize({ width, height: 900 });
    await expect(menu.locator(".mobile-nav")).toBeHidden();
  }
});
