import { locales, defaultLocale, type Locale } from "../config";
export { locales, defaultLocale, type Locale } from "../config";

/**
 * Type guard, zda řetězec odpovídá podporovanému jazyku.
 * @param value Testovaný řetězec (např. z URL nebo z formuláře).
 * @returns `true` pro `cs`, `en` a `de`.
 */
export const isLocale = (value: string): value is Locale =>
  locales.includes(value as Locale);

/**
 * Určí jazyk z prvního segmentu cesty.
 * @param pathname Cesta z `Astro.url.pathname`.
 * @returns Jazyk ze segmentu, jinak `defaultLocale` pro českou/neznámou cestu.
 */
export function localeFromPath(pathname: string): Locale {
  const segment = pathname.split("/")[1] ?? "";
  return isLocale(segment) ? segment : defaultLocale;
}

/** Modul dodává vlastní kompletní slovník; neexistuje globální registr funkcí. */
export function createDictionary<T>(dictionaries: Record<Locale, T>) {
  /**
   * @param locale Jazyk, pro který chceme texty.
   * @returns Slovník daného modulu pro zvolený jazyk.
   */
  return (locale: Locale): T => dictionaries[locale];
}
