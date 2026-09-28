import test from "node:test";
import assert from "node:assert/strict";
import {
  locales,
  localeFromPath,
} from "../src/modules/LangModule/providers/locale";
import {
  pages,
  url,
  resolveRoute,
  legacyRedirect,
  routeDictionary,
  nameUrl,
  resolveName,
} from "../src/config/routes";
test("all locale/page combinations round-trip through shared routes", () => {
  for (const locale of locales)
    for (const page of pages)
      assert.deepEqual(resolveRoute(url(locale, page)), { locale, page });
  assert.equal(url("cs"), "/");
  assert.equal(url("de", "account"), "/de/konto/");
});
test("unknown routes never render a home page with HTTP 200", () => {
  for (const path of [
    "/missing/",
    "/fr/",
    "/cs/",
    "/en/unknown/",
    "/o-nas/extra/",
  ])
    assert.equal(resolveRoute(path), null);
  assert.equal(localeFromPath("/en/unknown/"), "en");
});

test("localized slugs are unique and legacy URLs redirect once", () => {
  assert.equal(url("cs", "about"), "/o-nas/");
  assert.equal(url("de", "about"), "/de/ueber-uns/");
  for (const locale of locales) {
    assert.deepEqual(
      Object.keys(routeDictionary(locale).routes).sort(),
      [...pages].sort(),
    );
    const paths = pages.map((page) => url(locale, page));
    assert.equal(new Set(paths).size, pages.length);
    for (const page of pages) {
      const canonical = url(locale, page);
      const old = `${url(locale)}${page === "home" ? "" : `${page}/`}`;
      assert.equal(legacyRedirect(old), old === canonical ? null : canonical);
      assert.equal(legacyRedirect(canonical), null);
    }
  }
  for (const path of [
    "/api/auth/login/",
    "/unknown/",
    "/about/extra/",
    "//example.com/about/",
  ])
    assert.equal(legacyRedirect(path), null);
});

test("localized detail URLs preserve IDs and reject malformed aliases", () => {
  assert.equal(nameUrl("cs", 123), "/jmeno/123/");
  assert.equal(legacyRedirect("/name/123/"), "/jmeno/123/");
  for (const locale of locales) {
    assert.deepEqual(resolveName(nameUrl(locale, 123)), { locale, id: 123 });
    assert.equal(legacyRedirect(nameUrl(locale, 123)), null);
  }
  for (const value of ["0", "-1", "01", "1/extra", "2147483648", "%31"]) {
    assert.equal(resolveName(`/jmeno/${value}/`), null);
    assert.equal(legacyRedirect(`/name/${value}/`), null);
  }
});
