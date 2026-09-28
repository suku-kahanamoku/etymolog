import { mountConsentManager } from "../providers/consentmanager";
import { mountAds } from "../providers/advertising";
import { mountTopAdReveal } from "./useTopAdReveal";
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
