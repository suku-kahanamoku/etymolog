import { mountConsentManager } from "../providers/consentmanager";
import { mountAds } from "../providers/advertising";
import { mountTopAdReveal } from "./useTopAdReveal";

/**
 * Životní cyklus reklamy na stránce: souhlas, jednotky a parallax horního banneru.
 * @returns Uvolňující funkce, která ukončí všechny tři části.
 */
export function useAds() {
  const cleanupAds = mountAds();
  const cleanupConsent = mountConsentManager();
  const cleanupReveal = mountTopAdReveal();
  return () => {
    cleanupConsent();
    cleanupAds();
    cleanupReveal();
  };
}
