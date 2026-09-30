/**
 * Omezí odkaz ze zdroje na bezpečné webové URL.
 *
 * Bezpečnostní záměr: propouští pouze `http:` a `https:` bez přihlašovacích
 * údajů v URL, takže se do stránky nedostane `javascript:`, `data:` ani
 * podvržená schémata z importovaných dat.
 * @param value Odkaz tak, jak ho vrátil php-core.
 * @returns Normalizované URL, nebo `undefined` pro prázdnou či neplatnou hodnotu.
 */
export function safeWebUrl(
  value: string | null | undefined,
): string | undefined {
  if (!value) return;
  try {
    const parsed = new URL(value);
    if (
      ["https:", "http:"].includes(parsed.protocol) &&
      !parsed.username &&
      !parsed.password
    )
      return parsed.href;
  } catch {
    /* Neplatný odkaz na historický zdroj. */
  }
}
