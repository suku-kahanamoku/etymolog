/** Jazyky podporované webem; zároveň zdroj typu `Locale`. */
export const locales = ["cs", "en", "de"] as const;

/** Kód jazyka stránky (jedna z `locales`). */
export type Locale = (typeof locales)[number];

/** Jazyk použitý, když nelze jazyk určit z URL; zároveň jazyk bez prefixu. */
export const defaultLocale: Locale = "cs";
