/** Small DOM hook; each menu owns its listeners and hover timer. */
export function useNavigation(
  toggle: HTMLButtonElement,
  mobileNav: HTMLElement,
) {
  const controller = new AbortController();
  const options = { signal: controller.signal };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancelLeave = () => {
    clearTimeout(timer);
    timer = undefined;
  };
  const close = () => {
    cancelLeave();
    toggle.setAttribute("aria-expanded", "false");
    mobileNav.hidden = true;
  };
  toggle.addEventListener(
    "click",
    () => {
      cancelLeave();
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
      mobileNav.hidden = expanded;
    },
    options,
  );
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
  matchMedia("(min-width: 768px)").addEventListener(
    "change",
    (event) => {
      if (event.matches) close();
    },
    options,
  );
  return () => {
    cancelLeave();
    controller.abort();
  };
}
