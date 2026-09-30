import cs from "../locales/cs.json";
import en from "../locales/en.json";
import de from "../locales/de.json";
import { createDictionary } from "../../LangModule/providers/locale";

/**
 * Překlady AuthModule (přihlášení, účet, chyby) pro všechny podporované jazyky.
 * @param locale Aktuální jazyk webu.
 * @returns Kompletní slovník modulu AuthModule pro daný jazyk.
 */
export const dictionary = createDictionary<typeof cs>({ cs, en, de });
