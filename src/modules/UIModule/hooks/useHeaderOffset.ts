/** Shared offset for sticky content and native fragment navigation. */
export function useHeaderOffset(
  header: HTMLElement,
  root = document.documentElement,
) {
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
