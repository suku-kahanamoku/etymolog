/**
 * Konfigurace motivu UIModule.
 *
 * `storageKey` je klíč v `localStorage`, `name` hodnoty se propisují do
 * `data-theme` na `<html>` a `color` slouží do meta hlavičky `theme-color`.
 */
export const themeConfig = {
  /** Klíč uložené volby motivu v `localStorage`. */
  storageKey: "etymolog-theme",
  /** Světlý motiv. */
  light: {
    name: "newspaper",
    color: "#f5f0e5",
  },
  /** Tmavý motiv. */
  dark: {
    name: "newspaper-dark",
    color: "#24231f",
  },
} as const;

/** Motiv použitý při vykreslení na serveru, než se rozhodne klient. */
export const defaultTheme = themeConfig.light;
