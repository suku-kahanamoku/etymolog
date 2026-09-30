/** Malý DOM hook; každé menu vlastní své listenery a časovač odchodu kurzoru. */
export function useNavigation(
  toggle: HTMLButtonElement,
  mobileNav: HTMLElement,
) {
  /**
   * @param toggle Tlačítko hamburgeru (`aria-expanded`, `data-open-label`, `data-close-label`).
   * @param mobileNav Rozbalovací panel s navigací pro úzká zařízení.
   * @returns Uvolňující funkce rušící časovač a všechny listenery.
   * @throws Nevyvolá se; funkce vždy vrátí uvolnění listenerů.
   */
  const controller = new AbortController();
  const options = { signal: controller.signal };
  let timer: ReturnType<typeof setTimeout> | undefined;
  /**
   * Zruší čekající odložené zavření menu.
   * @throws Nevyvolá se.
   */
  const cancelLeave = () => {
    clearTimeout(timer);
    timer = undefined;
  };
  /**
   * Zavře panel a vrátí tlačítko do stavu „zavřeno“.
   * @throws Nevyvolá se.
   */
  const close = () => {
    cancelLeave();
    toggle.setAttribute("aria-expanded", "false");
    mobileNav.hidden = true;
    toggle.setAttribute("aria-label", toggle.dataset.openLabel ?? "");
  };
  // Kliknutí na tlačítko přepíná panel a aktualizuje přístupnostní popisky.
  toggle.addEventListener(
    "click",
    () => {
      cancelLeave();
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
      mobileNav.hidden = expanded;
      toggle.setAttribute(
        "aria-label",
        (expanded ? toggle.dataset.openLabel : toggle.dataset.closeLabel) ?? "",
      );
    },
    options,
  );
  /**
   * S myší zůstává otevřené menu otevřené, dokud kurzor neopustí tlačítko i panel.
   * @param event Událost `pointermove` nebo `pointerout`; relevantní je ukazatel myši.
   * @returns `void`; při opuštění oblasti naplánuje zavření s krátkým zpožděním.
   */
  const pointer = (event: PointerEvent) => {
    if (
      event.pointerType !== "mouse" ||
      toggle.getAttribute("aria-expanded") !== "true"
    )
      return;
    const target =
      event.type === "pointerout" ? event.relatedTarget : event.target;
    if (
      target instanceof Node &&
      (toggle.contains(target) || mobileNav.contains(target))
    ) {
      cancelLeave();
      return;
    }
    if (timer === undefined) timer = setTimeout(close, 180);
  };
  document.addEventListener("pointermove", pointer, options);
  document.addEventListener(
    "pointerout",
    (event) => {
      if (!event.relatedTarget) pointer(event);
    },
    options,
  );
  // Escape zavře otevřené menu a vrátí fokus na tlačítko.
  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Escape" &&
        toggle.getAttribute("aria-expanded") === "true"
      ) {
        close();
        toggle.focus();
      }
    },
    options,
  );
  // Kliknutí mimo tlačítko a panel zavře otevřené menu.
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      if (
        target instanceof Node &&
        !toggle.contains(target) &&
        !mobileNav.contains(target)
      )
        close();
    },
    options,
  );
  // Po přepnutí na široké rozvržení se mobilní panel sám skryje.
  matchMedia("(min-width: 1280px)").addEventListener(
    "change",
    (event) => {
      if (event.matches) close();
    },
    options,
  );
  // Kliknutí na odkaz v panelu menu zavře.
  mobileNav.addEventListener(
    "click",
    (event) => {
      if (event.target instanceof Element && event.target.closest("a")) close();
    },
    options,
  );
  return () => {
    cancelLeave();
    controller.abort();
  };
}
