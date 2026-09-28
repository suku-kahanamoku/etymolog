/** Native details stay usable without JavaScript. Returns listener cleanup. */
export function useDisclosure(selector: string, root: Document = document) {
  const controller = new AbortController();
  const options = { signal: controller.signal };

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
