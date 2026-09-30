import cs from "../locales/cs.json";
import en from "../locales/en.json";
import de from "../locales/de.json";
import type { Locale } from "../../LangModule/config";

/**
 * Překlady ContactModule (kontaktní údaje) pro podporované jazyky.
 * @param locale Aktuální jazyk webu.
 * @returns Kompletní slovník modulu ContactModule pro daný jazyk.
 */
export const dictionary = (locale: Locale) => ({ cs, en, de })[locale];
