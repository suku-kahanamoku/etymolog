import type { AstroCookies } from "astro";

/** Název cookie, ve které je uložen Bearer token relace. */
const cookieName = "etymolog_session";

/**
 * Přečte Bearer token ze session cookie.
 * @param cookies Cookie kontext požadavku.
 * @returns Token relace, nebo `undefined` když cookie není nastavena.
 */
export const readToken = (cookies: AstroCookies) =>
  cookies.get(cookieName)?.value;

/**
 * Uloží Bearer token do session cookie.
 * @param cookies Cookie kontext požadavku.
 * @param token Token získaný přihlášením v php-core.
 * @param secure `true`, když stránka běží přes HTTPS nebo v produkci.
 * @throws Neprodlužuje relaci: vypršení zůstává v kompetenci php-core.
 */
export function writeToken(
  cookies: AstroCookies,
  token: string,
  secure: boolean,
) {
  // Relace v cookie: php-core zůstává autoritou pro vypršení tokenu; expires_at se nikde neparsuje.
  cookies.set(cookieName, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
  });
}

/**
 * Smaže session cookie.
 * @param cookies Cookie kontext požadavku (např. při odhlášení nebo neplatné relaci).
 */
export function clearToken(cookies: AstroCookies) {
  cookies.delete(cookieName, { path: "/" });
}
