import cs from "./locales/cs.json" with { type: "json" };
import en from "./locales/en.json" with { type: "json" };
import de from "./locales/de.json" with { type: "json" };
import { locales, type Locale } from "../modules/LangModule/config";
export { locales, type Locale } from "../modules/LangModule/config";

/** Identifikátory všech stránek, které umí směrování vyrenderovat. */
export const pages = [
  "home",
  "about",
  "login",
  "account",
  "contact",
  "admin",
] as const;

/** Odkazová hodnota jedné stránky (`home` = domovská). */
export type PageId = (typeof pages)[number];

/** Stránky zahrnuté ve veřejném sitemapu; zbytek je zakázaný v `robots.txt`. */
export const publicPages: PageId[] = ["home", "about", "contact"];

/** Překladové tabulky tras v `src/config/locales` (segmenty URL a cesta detailu). */
const dictionaries = { cs, en, de } satisfies Record<Locale, typeof cs>;

/**
 * Vrátí překlad tras pro daný jazyk.
 * @param locale Jazyk webu (`cs`, `en`, `de`).
 * @returns Objekt s `routes` (segmenty stránek) a `detail` (segment detailu jména).
 */
export const routeDictionary = (locale: Locale) => dictionaries[locale];

/**
 * Sestaví absolutní cestu stránky včetně jazykového prefixu.
 * @param locale Jazyk webu; `cs` se v URL neuvádí.
 * @param page Cílová stránka, výchozí je `home`.
 * @returns Cesta končící lomítkem, např. `/de/o-nas/`, pro českou domovskou `/`.
 */
export function url(locale: Locale, page: PageId = "home") {
  const parts = [
    locale === "cs" ? "" : locale,
    routeDictionary(locale).routes[page],
  ].filter(Boolean);
  return parts.length ? `/${parts.join("/")}/` : "/";
}

/**
 * Přeloží cestu požadavku na jazyk a stránku.
 * @param pathname Cesta z `Astro.url.pathname`.
 * @returns Dvojice `{ locale, page }`, nebo `null` když cesta neodpovídá žádné stránce.
 */
export function resolveRoute(
  pathname: string,
): { locale: Locale; page: PageId } | null {
  for (const locale of locales)
    for (const page of pages) {
      if (url(locale, page) === pathname) return { locale, page };
    }
  return null;
}

/**
 * Sestaví cestu detailu jednoho jména.
 * @param locale Jazyk webu.
 * @param id Identifikátor záznamu jména z php-core.
 * @returns Cesta `/<jazyk>/<detail>/<id>/` s kódovaným ID.
 */
export function nameUrl(locale: Locale, id: number | string) {
  return `${url(locale)}${routeDictionary(locale).detail.name}/${encodeURIComponent(String(id))}/`;
}

/**
 * Přeloží cestu požadavku na detail jména.
 * @param path Cesta z `Astro.url.pathname`.
 * @returns Dvojice `{ locale, id }` s bezpečným celým ID, nebo `null` pro neplatnou cestu.
 */
export function resolveName(
  path: string,
): { locale: Locale; id: number } | null {
  for (const locale of locales) {
    const prefix = `${url(locale)}${routeDictionary(locale).detail.name}/`;
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

/**
 * Původní nelokalizované cesty jsou pouze aliasy, nikoli další kanonické stránky.
 * @param pathname Cesta z `Astro.url.pathname`.
 * @returns Kanonická cesta pro přesměrování, nebo `null` když alias neexistuje.
 */
export function legacyRedirect(pathname: string): string | null {
  for (const locale of locales) {
    for (const page of pages) {
      const legacy = `${url(locale)}${page === "home" ? "" : `${page}/`}`;
      const canonical = url(locale, page);
      if (pathname === legacy && legacy !== canonical) return canonical;
    }
    const prefix = `${url(locale)}name/`;
    if (pathname.startsWith(prefix)) {
      const canonical = `${url(locale)}${routeDictionary(locale).detail.name}/${pathname.slice(prefix.length)}`;
      if (canonical !== pathname && resolveName(canonical)) return canonical;
    }
  }
  return null;
}
