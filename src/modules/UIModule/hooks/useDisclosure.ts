/** Nativní prvek `details` funguje i bez JavaScriptu. Vrací funkci pro odpojení listenerů. */
export function useDisclosure(selector: string, root: Document = document) {
  /**
   * @param selector Selektor otevřených rozbalovacích prvků (např. `.language-picker`).
   * @param root Kořen dokumentu, ve kterém se hledají prvky a registrují listenery.
   * @returns Funkce, která odpojí všechny přidané listenery.
   */
  const controller = new AbortController();
  const options = { signal: controller.signal };

  // Escape zavře všechny otevřené rozklady a vrátí fokus na jejich `summary`.
  root.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Escape") return;
      root
        .querySelectorAll<HTMLDetailsElement>(`${selector}[open]`)
        .forEach((picker) => {
          picker.open = false;
          picker.querySelector("summary")?.focus();
        });
    },
    options,
  );
  // Kliknutí mimo otevřený rozbalovací prvek jej zavře.
  root.addEventListener(
    "click",
    (event) => {
      root
        .querySelectorAll<HTMLDetailsElement>(`${selector}[open]`)
        .forEach((picker) => {
          if (event.target instanceof Node && !picker.contains(event.target))
            picker.open = false;
        });
    },
    options,
  );

  return () => controller.abort();
}
