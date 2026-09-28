/** A bfcache entry is still live; dispose only when its document is discarded. */
export function onDocumentDispose(cleanup: () => void) {
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
