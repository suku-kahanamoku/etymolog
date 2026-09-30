import { defaultTheme } from "../modules/UIModule/config/theme";

/**
 * Centrální konfigurace webu a provozovatele.
 *
 * Obsahuje identitu a kontaktní údaje zveřejněné na stránkách, výchozí motiv
 * a přepínače modulů. `modules` řídí, které části webu se vůbec vykreslí
 * (např. přihlášení nebo reklamní rám); při `false` jsou trasy i API nedostupné.
 */
export const site = {
  /** Název webu používaný v titulku, hlavičce a patičce. */
  name: "Etymolog",
  /** Jméno provozovatele zobrazené na kontaktní stránce. */
  operatorName: "Süchceren Cecegé",
  /** Kontaktní e-mail (veřejný, bez tajných údajů). */
  email: "info@prasentace.cz",
  /** Kontaktní telefon ve formátu pro zobrazení. */
  phone: "+420 722 767 646",
  /** IČO provozovatele. */
  registrationId: "04473442",
  /** Adresa sídla využívaná v zápatí webu. */
  address: {
    street: "Eleonory Voračické 2167/29",
    city: "Brno – Žabovřesky",
    postalCode: "616 00",
    country: "CZ",
  },
  /** Výchozí motiv; motiv uživatele se řeší až na klientovi. */
  theme: defaultTheme,
  /** Zapnuté moduly: přihlášení, reklamní jednotky, realtime. */
  modules: { auth: true, ads: true, realtime: true },
} as const;
