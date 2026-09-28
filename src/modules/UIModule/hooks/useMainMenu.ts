import { useNavigation } from "./useNavigation";
import { useHeaderOffset } from "./useHeaderOffset";
import { onDocumentDispose } from "./onDocumentDispose";
let dispose: (() => void) | undefined;
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
