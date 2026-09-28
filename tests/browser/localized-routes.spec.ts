import { test, expect } from "@playwright/test";
import { locales, publicPages, pages, url } from "../../src/config/routes";

test("localized pages, menu, SEO and language switch share canonical routes", async ({
  page,
}) => {
  for (const locale of locales) {
    for (const id of publicPages) {
      const response = await page.goto(url(locale, id));
      expect(response?.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        new URL(url(locale, id), page.url()).href,
      );
      for (const code of locales) {
        await expect(
          page.locator(`.language-options [lang="${code}"]`),
        ).toHaveAttribute("href", url(code, id));
        await expect(page.locator(`link[hreflang="${code}"]`)).toHaveAttribute(
          "href",
          new URL(url(code, id), page.url()).href,
        );
      }
    }
  }
  await page.goto("/o-nas/");
  for (const code of ["en", "de", "cs"] as const) {
    await page.locator(".language-picker summary").click();
    await page.locator(`.language-options [lang="${code}"]`).click();
    await expect(page).toHaveURL(url(code, "about"));
  }
});

test("old paths permanently redirect with query intact and private routes remain excluded", async ({
  request,
}) => {
  const robots = await (await request.get("/robots.txt")).text();
  for (const locale of locales)
    for (const id of pages) {
      const path = url(locale, id);
      const old = `${url(locale)}${id === "home" ? "" : `${id}/`}`;
      if (!publicPages.includes(id))
        expect(robots).toContain(`Disallow: ${path}\n`);
      if (old === path) continue;
      const response = await request.get(`${old}?ref=legacy&value=a%2Fb`, {
        maxRedirects: 0,
      });
      expect(response.status()).toBe(308);
      expect(response.headers().location).toBe(
        `${path}?ref=legacy&value=a%2Fb`,
      );
    }
  const response = await request.get("/ucet/", { maxRedirects: 0 });
  expect(response.status()).toBe(302);
  expect(response.headers().location).toBe("/prihlaseni/");
});

test("detail aliases and hreflang preserve the same record across languages", async ({
  page,
  request,
}) => {
  const response = await request.get("/name/1/?ref=old", { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  expect(response.headers().location).toBe("/jmeno/1/?ref=old");
  await page.goto("/jmeno/1/");
  for (const [code, path] of [
    ["cs", "/jmeno/1/"],
    ["en", "/en/name/1/"],
    ["de", "/de/name/1/"],
  ]) {
    await expect(page.locator(`link[hreflang="${code}"]`)).toHaveAttribute(
      "href",
      new URL(path, page.url()).href,
    );
    await page.locator(".language-picker summary").click();
    await page.locator(`.language-options [lang="${code}"]`).click();
    await expect(page).toHaveURL(path);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      new URL(path, page.url()).href,
    );
  }
});
