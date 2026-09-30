import cs from "../locales/cs.json";
import en from "../locales/en.json";
import de from "../locales/de.json";
import { createDictionary } from "../../LangModule/providers/locale";

/**
 * Překlady ContentModule (úvod, sekce s funkcemi, poznámka k archivu).
 * @param locale Aktuální jazyk webu.
 * @returns Kompletní slovník modulu ContentModule pro daný jazyk.
 */
export const dictionary = createDictionary<typeof cs>({ cs, en, de });
