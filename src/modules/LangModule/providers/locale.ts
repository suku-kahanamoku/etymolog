import { locales, defaultLocale, type Locale } from "../config";
export { locales, defaultLocale, type Locale } from "../config";
export const isLocale = (value: string): value is Locale =>
  locales.includes(value as Locale);
export function localeFromPath(pathname: string): Locale {
  const segment = pathname.split("/")[1] ?? "";
  return isLocale(segment) ? segment : defaultLocale;
}
/** A module supplies its own complete dictionary; no global feature registry. */
export function createDictionary<T>(dictionaries: Record<Locale, T>) {
  return (locale: Locale): T => dictionaries[locale];
}
