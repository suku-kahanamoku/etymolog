/** Společný stav odesílání pro formuláře s fetch() i běžným POSTem. */
type Control =
  | HTMLButtonElement
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;

type PendingState = {
  release: () => void;
};

const pending = new WeakMap<HTMLFormElement, PendingState>();

/**
 * Zamkne formulář a zobrazí spinner na jeho submit tlačítku.
 *
 * Volající nejprve přečte FormData. Při nativním POSTu ponecháváme datová pole
 * enabled: disabled hodnoty by se vůbec neodeslaly. `inert` přesto zamezí
 * uživatelským změnám a všechna tlačítka jsou skutečně disabled.
 *
 * @returns Funkce obnovující původní stavy; undefined při probíhajícím odeslání.
 */
export function beginFormPending(
  form: HTMLFormElement,
  native = false,
): (() => void) | undefined {
  if (pending.has(form)) return;
  const controls = Array.from(
    form.querySelectorAll<Control>("button, input, select, textarea"),
  );
  const disabled = controls.map((control) => control.disabled);
  const wasInert = form.inert;
  const wasBusy = form.getAttribute("aria-busy");
  for (const control of controls) {
    if (!native || control instanceof HTMLButtonElement)
      control.disabled = true;
  }
  form.inert = true;
  form.dataset.submitPending = "true";
  form.setAttribute("aria-busy", "true");
  const release = () => {
    if (pending.get(form)?.release !== release) return;
    controls.forEach((control, index) => (control.disabled = disabled[index]));
    form.inert = wasInert;
    delete form.dataset.submitPending;
    if (wasBusy === null) form.removeAttribute("aria-busy");
    else form.setAttribute("aria-busy", wasBusy);
    pending.delete(form);
  };
  pending.set(form, { release });
  return release;
}

/** Připojí stav načítání k nativnímu POSTu a obnoví jej po návratu z historie. */
export function useNativeFormPending(form: HTMLFormElement | null): void {
  if (!form) return;
  let release: (() => void) | undefined;
  form.addEventListener("submit", (event) => {
    if (release) {
      event.preventDefault();
      return;
    }
    release = beginFormPending(form, true);
  });
  window.addEventListener("pageshow", () => {
    release?.();
    release = undefined;
  });
}
