/** Zachová navigaci v rámci originu, kotvy i odkazy na e-mail/telefon v jejich obvyklém kontextu. */
export function externalLinkAttributes(href: string | undefined, pageUrl: URL) {
  /**
   * @param href Odkaz, který se má vykreslit jako `<a>`.
   * @param pageUrl URL aktuální stránky pro porovnání originu.
   * @returns `target="_blank"` a `rel="noopener noreferrer"` pro externí http(s) odkaz,
   * jinak prázdný objekt (atributy se nesmějí přidávat interním odkazům).
   */
  if (!href) return {};
  try {
    const target = new URL(href, pageUrl);
    if (
      (target.protocol === "https:" || target.protocol === "http:") &&
      target.origin !== pageUrl.origin
    ) {
      return { target: "_blank", rel: "noopener noreferrer" };
    }
  } catch {
    // Ověření neplatné URL je věcí volajícího; neplatný odkaz není externí.
  }
  return {};
}
