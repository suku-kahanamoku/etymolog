import cs from "../locales/cs.json";
import en from "../locales/en.json";
import de from "../locales/de.json";
import { createDictionary } from "../../LangModule/providers/locale";

/**
 * Překlady AdsModule (popisky slotů a stavů) pro všechny podporované jazyky.
 * @param locale Aktuální jazyk webu.
 * @returns Kompletní slovník modulu AdsModule pro daný jazyk.
 */
export const dictionary = createDictionary<typeof cs>({ cs, en, de });
