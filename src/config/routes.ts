import { locales, type Locale } from "../modules/LangModule/config";
export { locales, type Locale } from "../modules/LangModule/config";
export const pages = [
  "home",
  "about",
  "login",
  "account",
  "contact",
  "admin",
] as const;
export type PageId = (typeof pages)[number];
export const publicPages: PageId[] = ["home", "about", "contact"];
export function url(locale: Locale, page: PageId = "home") {
  const parts = [
    locale === "cs" ? "" : locale,
    page === "home" ? "" : page,
  ].filter(Boolean);
  return parts.length ? `/${parts.join("/")}/` : "/";
}

export function resolveRoute(
  pathname: string,
): { locale: Locale; page: PageId } | null {
  for (const locale of locales)
    for (const page of pages) {
      if (url(locale, page) === pathname) return { locale, page };
    }
  return null;
}

export function nameUrl(locale: Locale, id: number | string) {
  return `${url(locale)}name/${encodeURIComponent(String(id))}/`;
}
export function resolveName(
  path: string,
): { locale: Locale; id: number } | null {
  for (const locale of locales) {
    const prefix = `${url(locale)}name/`;
    if (
      path.startsWith(prefix) &&
      /^[1-9][0-9]*\/$/.test(path.slice(prefix.length))
    ) {
      const id = Number(path.slice(prefix.length, -1));
      if (Number.isSafeInteger(id) && id <= 2147483647) return { locale, id };
    }
  }
  return null;
}
