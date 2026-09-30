/** Sdílený odsaz pro přilepený obsah a nativní navigaci na kotvy stránky. */
export function useHeaderOffset(
  header: HTMLElement,
  root = document.documentElement,
) {
  /**
   * @param header Změřovaný element hlavičky.
   * @param root Element, na který se zapisuje CSS proměnná (obvykle `<html>`).
   * @returns Uvolňující funkce rušící pozorovatel a listener.
   */
  const update = () =>
    root.style.setProperty(
      "--site-header-height",
      `${header.getBoundingClientRect().height}px`,
    );
  const observer = new ResizeObserver(update);
  observer.observe(header);
  update();
  window.addEventListener("pageshow", update);
  return () => {
    observer.disconnect();
    window.removeEventListener("pageshow", update);
  };
}
