import { test, expect } from "@playwright/test";

test("responsive frame keeps content visible and hides rails below xl", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [360, 640, 768, 1024, 1280, 1536, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await expect(page.locator("main h1")).toBeVisible();
    const headerBounds = await page.locator(".site-header").boundingBox();
    const headerInner = await page.locator(".header-inner").boundingBox();
    expect(headerBounds!.x).toBeCloseTo(0, 0);
    expect(headerBounds!.width).toBeCloseTo(width, 0);
    expect(headerInner!.x).toBeGreaterThan(0);
    expect(headerInner!.width).toBeLessThan(width);
    await expect(page.locator(".masthead")).toContainText("ETYMOLOG");
    await expect(page.locator("[data-name-search]")).toBeVisible();
    for (const section of await page.locator("main > .page-section").all()) {
      const bounds = await section.boundingBox();
      expect(bounds!.x).toBeCloseTo(0, 0);
      expect(bounds!.width).toBeCloseTo(width, 0);
      const inner = await section.locator(".section-inner").boundingBox();
      expect(inner!.x).toBeGreaterThan(0);
      expect(inner!.width).toBeLessThan(width);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width < 768) {
      await expect(page.locator(".login-link")).toBeHidden();
      const menu = await page.locator(".menu-toggle").boundingBox();
      const header = await page.locator(".site-header").boundingBox();
      expect(menu!.x + menu!.width).toBeLessThanOrEqual(
        header!.x + header!.width,
      );
    }
    if (width < 1280) await expect(page.locator(".ad-left")).toBeHidden();
    else {
      await expect(page.locator(".ad-left")).toBeVisible();
      await expect(page.locator(".ad-right")).toBeVisible();
    }
  }
  expect(errors).toEqual([]);
  await page.screenshot({
    path: "test-results/home-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.screenshot({
    path: "test-results/home-mobile.png",
    fullPage: true,
  });
});
test("localized SEO, navigation, mobile menu and not-found status", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/about/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "http://localhost:4338/en/about/",
  );
  const picker = page.locator(".language-picker");
  const currentFlag = picker.locator(".language-current img");
  await expect(currentFlag).toHaveAttribute(
    "src",
    (await picker.locator('[lang="en"] img').getAttribute("src"))!,
  );
  await expect
    .poll(() =>
      currentFlag.evaluate(
        (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
      ),
    )
    .toBe(true);
  await picker.locator("summary").click();
  await expect(
    picker.getByRole("link", { name: "Deutsch", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(picker).not.toHaveAttribute("open");
  await expect(picker.locator("summary")).toBeFocused();
  await picker.locator("summary").click();
  await page.locator("main h1").click();
  await expect(picker).not.toHaveAttribute("open");
  await picker.locator("summary").click();
  await picker.getByRole("link", { name: "Deutsch", exact: true }).click();
  await expect(page).toHaveURL(/\/de\/about\/$/);
  await expect(picker.locator(".language-current img")).toHaveAttribute(
    "src",
    (await picker.locator('[lang="de"] img').getAttribute("src"))!,
  );
  const menuToggle = page.locator(".menu-toggle");
  await menuToggle.click();
  await expect(menuToggle).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(menuToggle).toHaveAttribute("aria-expanded", "false");
  await expect(menuToggle).toBeFocused();
  await menuToggle.click();
  await page.locator(".top-ad-reveal .ad-label").click();
  await expect(page.locator(".mobile-nav")).toBeHidden();
  await menuToggle.click();
  await page
    .locator(".mobile-nav")
    .getByRole("link", { name: "Suchen" })
    .click();
  await expect(page).toHaveURL(/\/de\/$/);
  const response = await page.goto("/en/unknown/");
  expect(response?.status()).toBe(404);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});
test("auth forms, HttpOnly token, protected account and logout follow php-core contract", async ({
  page,
  context,
}) => {
  await page.goto("/en/account/");
  await expect(page).toHaveURL(/\/en\/login\/$/);
  await page.getByLabel("Email", { exact: true }).fill("user@example.test");
  await page.getByLabel("Password", { exact: true }).fill("incorrect");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toContainText("check your email");
  await page.getByLabel("Email", { exact: true }).fill("user@example.test");
  await page.getByLabel("Password", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/en\/admin\/$/);
  await page.goto("/en/account/");
  await expect(page.locator("main h1")).toContainText("Test Account");
  const cookie = (await context.cookies()).find(
    (cookie) => cookie.name === "etymolog_session",
  );
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe("Lax");
  expect(await page.evaluate(() => document.cookie)).not.toContain(
    "etymolog_session",
  );
  const me = await context.request.get("/api/auth/me/");
  expect(me.headers()["cache-control"]).toContain("no-store");
  expect(await me.text()).not.toMatch(/token|private_field|test-only-secret/);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/en\/login\/$/);
  expect((await context.request.get("/api/auth/me/")).status()).toBe(401);
});
test("foreign origins cannot log in and default ads contact no third parties", async ({
  page,
  request,
}) => {
  const response = await request.post("/api/auth/login/", {
    headers: { Origin: "https://foreign.test" },
    data: { email: "user@example.test", password: "test-password" },
  });
  expect(response.status()).toBe(403);
  const external: string[] = [];
  page.on("request", (request) => {
    if (/googlesyndication|ssp\.seznam/.test(request.url()))
      external.push(request.url());
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  expect(external).toEqual([]);
  expect(await page.content()).not.toContain("test-only-secret");
});

test("footer reaches viewport bottom on short pages and follows long content", async ({
  page,
}) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1200 });
    for (const path of ["/login/", "/missing/"]) {
      await page.goto(path);
      const footer = await page.locator(".site-footer").boundingBox();
      expect(footer!.y + footer!.height).toBeCloseTo(1200, 0);
      const main = await page.locator("main").boundingBox();
      expect(main!.y + main!.height).toBeLessThanOrEqual(footer!.y + 1);
    }
    // The shared layout must also work when a project disables advertising.
    await page.evaluate(() => {
      document.querySelector(".site-frame")!.classList.remove("with-ads");
      document
        .querySelectorAll(".top-ad-reveal, .ad-left, .ad-right")
        .forEach((el) => el.remove());
    });
    const footerWithoutAds = await page.locator(".site-footer").boundingBox();
    expect(footerWithoutAds!.y + footerWithoutAds!.height).toBeCloseTo(1200, 0);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const footer = await page.locator(".site-footer").boundingBox();
  expect(footer!.y).toBeGreaterThan(844);
  const main = await page.locator("main").boundingBox();
  expect(main!.y + main!.height).toBeLessThanOrEqual(footer!.y + 1);
});

test("translucent main menu sticks while scrolling and remains usable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const header = page.locator(".site-header");
    expect((await header.boundingBox())!.y).toBeGreaterThan(0);
    for (const y of [350, 500]) {
      await page.evaluate((y) => scrollTo({ top: y, behavior: "instant" }), y);
      await expect
        .poll(async () => (await header.boundingBox())!.y)
        .toBeCloseTo(0, 0);
    }
    const styles = await header.evaluate((el) => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + 20, rect.top + 20);
      return {
        background: style.backgroundColor,
        blur: style.backdropFilter,
        onTop: hit !== null && el.contains(hit),
      };
    });
    expect(styles.background).toMatch(/0\.94/);
    expect(styles.blur).toBe("blur(8px)");
    expect(styles.onTop).toBe(true);
    await page.locator(".language-picker summary").click();
    await expect(page.locator(".language-options")).toBeVisible();
    await page.keyboard.press("Escape");
    if (width < 768) {
      await page.locator(".menu-toggle").click();
      await page
        .locator(".mobile-nav")
        .getByRole("link", { name: "O nás", exact: true })
        .click();
      await expect(page).toHaveURL(/\/about\/$/);
    }
  }
});

test("sticky offsets and anchors follow the actual menu height", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    // Leave enough document below the target for native fragment alignment.
    await page.evaluate(() => {
      const target = document.querySelector(".archive-note h2")!;
      target.id = "features";
      (
        document.querySelector(".archive-note") as HTMLElement
      ).style.paddingBottom = "1000px";
    });
    for (const padding of [22, 42]) {
      await page.locator(".header-inner").evaluate((el, padding) => {
        el.style.paddingBlock = `${padding}px`;
      }, padding);
      const height = (await page.locator(".site-header").boundingBox())!.height;
      await expect
        .poll(() =>
          page.evaluate(() =>
            parseFloat(
              getComputedStyle(document.documentElement).getPropertyValue(
                "--site-header-height",
              ),
            ),
          ),
        )
        .toBeCloseTo(height, 0);
      await page.evaluate(() => {
        history.replaceState(null, "", location.pathname);
        location.hash = "features";
      });
      await expect
        .poll(async () => (await page.locator("#features").boundingBox())!.y)
        .toBeCloseTo(height + 16, 0);
      if (width >= 1280) {
        for (const selector of [".ad-left", ".ad-right"]) {
          await expect
            .poll(async () => (await page.locator(selector).boundingBox())!.y)
            .toBeCloseTo(height + 16, 0);
        }
      }
    }
    await page.goto("/#main-content");
    await expect
      .poll(async () => {
        const header = (await page.locator(".site-header").boundingBox())!;
        const main = (await page.locator("main").boundingBox())!;
        return main.y >= header.y + header.height;
      })
      .toBe(true);
  }
});

test("module navigation and language picker remain usable without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  try {
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator(".mobile-nav")).toBeVisible();
    await expect(page.locator(".menu-toggle")).toBeHidden();
    await page
      .locator(".mobile-nav")
      .getByRole("link", { name: "O nás", exact: true })
      .click();
    await expect(page).toHaveURL(/\/about\/$/);
    await page.locator(".language-picker summary").click();
    await page
      .locator(".language-picker")
      .getByRole("link", { name: "English", exact: true })
      .click();
    await expect(page).toHaveURL(/\/en\/about\/$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  } finally {
    await context.close();
  }
});
