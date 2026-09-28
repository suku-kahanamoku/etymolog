import { mountAds } from "../providers/advertising";
import { mountTopAdReveal } from "./useTopAdReveal";
export function useAds() {
  const cleanupAds = mountAds();
  const cleanupReveal = mountTopAdReveal();
  return () => {
    cleanupAds();
    cleanupReveal();
  };
}
