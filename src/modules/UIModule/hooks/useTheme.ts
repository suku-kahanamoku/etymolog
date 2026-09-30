import { themeConfig } from "../config/theme";

/** Uklidní předchozí instanci při opakovaném spuštění skriptu (Astro navigace). */
let dispose: (() => void) | undefined;

/**
 * Sleduje systémové nastavení, dokud si návštěvník výslovně nevybere motiv.
 *
 * Vedlejší účinky: přepisuje `data-theme`, `data-theme-mode` a meta `theme-color`
 * na `<html>` a ukládá volbu do `localStorage`; odposlouchává události změny
 * systémového motivu, `storage` (jiná karta), `pageshow` (návrat z bfcache) a
 * `astro:before-swap`.
 * @returns Uvolňující funkce, která odpojí všechny listenery; volá se automaticky
 * při opětovném spuštění hooku a při zániku dokumentu.
 */
export function useTheme() {
  dispose?.();
  const abort = new AbortController();
  const { signal } = abort;
  const system = matchMedia("(prefers-color-scheme: dark)");
  const buttons = document.querySelectorAll<HTMLButtonElement>(".theme-toggle");
  let preference: string | null = null;
  const validPreference = (value: string | null) =>
    value === themeConfig.light.name || value === themeConfig.dark.name
      ? value
      : null;
  try {
    preference = validPreference(localStorage.getItem(themeConfig.storageKey));
  } catch {
    /* Úložiště je volitelné. */
  }
  const apply = () => {
    const dark = preference
      ? preference === themeConfig.dark.name
      : system.matches;
    const theme = dark ? themeConfig.dark : themeConfig.light;
    document.documentElement.dataset.theme = theme.name;
    document.documentElement.dataset.themeMode = dark ? "dark" : "light";
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme.color);
    buttons.forEach((button) => {
      button.hidden = false;
      button.setAttribute("aria-pressed", String(dark));
    });
  };
  buttons.forEach((button) =>
    button.addEventListener(
      "click",
      () => {
        preference =
          document.documentElement.dataset.themeMode === "dark"
            ? themeConfig.light.name
            : themeConfig.dark.name;
        try {
          localStorage.setItem(themeConfig.storageKey, preference);
        } catch {
          /* Volba zůstane pouze pro tuto stránku. */
        }
        apply();
      },
      { signal },
    ),
  );
  system.addEventListener("change", apply, { signal });
  window.addEventListener(
    "storage",
    (event) => {
      if (event.key !== null && event.key !== themeConfig.storageKey) return;
      preference = validPreference(event.newValue);
      apply();
    },
    { signal },
  );
  document.addEventListener("astro:before-swap", () => abort.abort(), {
    once: true,
    signal,
  });
  window.addEventListener(
    "pageshow",
    (event) => {
      if (!event.persisted) return;
      try {
        preference = validPreference(
          localStorage.getItem(themeConfig.storageKey),
        );
      } catch {
        /* Úložiště je volitelné. */
      }
      apply();
    },
    { signal },
  );
  dispose = () => abort.abort();
  apply();
  return dispose;
}
