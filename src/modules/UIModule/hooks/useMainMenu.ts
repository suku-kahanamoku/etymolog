import { useNavigation } from "./useNavigation";
import { useHeaderOffset } from "./useHeaderOffset";
import { onDocumentDispose } from "./onDocumentDispose";
/** Uklidí předchozí instanci při opakovaném spuštění skriptu (Astro navigace). */
let dispose: (() => void) | undefined;

/**
 * Napojí všechna hlavní menu na stránce (offset hlavičky, přepínač, panel).
 *
 * Vedlejší účinky: registruje DOM listenery; při opakovaném spuštění nejprve
 * uvolní předchozí instanci a při zániku dokumentu (mimo bfcache) vše uklidí.
 * @returns `void`; uvolnění probíhá automaticky při `pagehide`.
 */
export function useMainMenu() {
  dispose?.();
  const cleanups: (() => void)[] = [];
  document
    .querySelectorAll<HTMLElement>("[data-main-menu]")
    .forEach((header) => {
      const toggle =
        header.querySelector<HTMLButtonElement>("[data-menu-toggle]");
      const menu = header.querySelector<HTMLElement>(".mobile-nav");
      cleanups.push(useHeaderOffset(header));
      if (toggle && menu) cleanups.push(useNavigation(toggle, menu));
    });
  const cleanup = () => cleanups.forEach((fn) => fn());
  const removeDisposeListener = onDocumentDispose(cleanup);
  dispose = () => {
    removeDisposeListener();
  };
}
