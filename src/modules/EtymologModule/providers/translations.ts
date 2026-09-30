import cs from "../locales/cs.json";
import en from "../locales/en.json";
import de from "../locales/de.json";
import type { Locale } from "../../LangModule/config";

/**
 * Překlady EtymologModule (detail, hledání, administrace) pro podporované jazyky.
 * @param locale Aktuální jazyk webu.
 * @returns Kompletní slovník modulu EtymologModule pro daný jazyk.
 */
export const dictionary = (locale: Locale) => ({ cs, en, de })[locale];

/** Typ slovníku EtymologModule odvozený z české verze. */
export type Dictionary = typeof cs;
