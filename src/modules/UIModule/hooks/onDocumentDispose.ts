/** Položka bfcache je stále živá; uvolňujeme pouze tehdy, když je dokument zahozen. */
export function onDocumentDispose(cleanup: () => void) {
  /**
   * @param cleanup Funkce uvolňující hooky stránky (listenery, časovače, pozorovatele).
   * @returns Funkce, která ruší automatické volání a `cleanup` provede ihned.
   */
  const dispose = (event: PageTransitionEvent) => {
    if (event.persisted) return;
    window.removeEventListener("pagehide", dispose);
    cleanup();
  };
  window.addEventListener("pagehide", dispose);
  return () => {
    window.removeEventListener("pagehide", dispose);
    cleanup();
  };
}
