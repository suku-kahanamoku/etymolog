import cs from "../locales/cs.json";
import en from "../locales/en.json";
import de from "../locales/de.json";
import { createDictionary } from "../providers/locale";

/**
 * Překlady LangModule (názvy jazyků, přepínač) pro podporované jazyky.
 * @param locale Aktuální jazyk webu.
 * @returns Kompletní slovník modulu LangModule pro daný jazyk.
 */
export const dictionary = createDictionary<typeof cs>({ cs, en, de });
