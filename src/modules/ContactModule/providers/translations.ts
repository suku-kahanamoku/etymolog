import cs from "../locales/cs.json";
import en from "../locales/en.json";
import de from "../locales/de.json";
import type { Locale } from "../../LangModule/config";
export const dictionary = (locale: Locale) => ({ cs, en, de })[locale];
