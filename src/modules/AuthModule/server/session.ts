import type { AstroCookies } from "astro";

const cookieName = "etymolog_session";
export const readToken = (cookies: AstroCookies) =>
  cookies.get(cookieName)?.value;
export function writeToken(
  cookies: AstroCookies,
  token: string,
  secure: boolean,
) {
  // Session cookie: php-core remains authoritative for token expiry; no timezone parsing of expires_at.
  cookies.set(cookieName, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
  });
}
export function clearToken(cookies: AstroCookies) {
  cookies.delete(cookieName, { path: "/" });
}
