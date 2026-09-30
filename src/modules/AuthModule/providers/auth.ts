import { api } from "../../CoreModule/providers/api";
import type { User } from "../types";

/**
 * Klientský přístup k autentizačnímu API webu.
 *
 * Všechny volání jdou přes `fetch` se souběhem `same-origin`, takže se relace
 * přenáší jen v cookie `httpOnly`; token se nikdy neukládá v prohlížeči.
 */
export const authProvider = {
  /**
   * @param signal Volitelný signál pro zrušení požadavku.
   * @returns Aktuálně přihlášený uživatel.
   * @throws ApiError 401 `unauthorized`, pokud není platná relace.
   */
  me: (signal?: AbortSignal) => api<User>("/api/auth/me/", { signal }),
  /**
   * @param email Přihlašovací e-mail.
   * @param password Heslo uživatele.
   * @returns Profil přihlášeného uživatele (bez tokenu; ten zůstává v cookie).
   * @throws ApiError 401 při špatných údajích, 422 při neplatném vstupu.
   */
  login: (email: string, password: string) =>
    api<User>("/api/auth/login/", {
      method: "POST",
      body: { email, password },
    }),
  /**
   * Ukončí relaci na backendu a vymaže cookie.
   * @returns `null` po úspěšném odhlášení.
   * @throws ApiError Při chybě serveru (401 se při odhlášení ignoruje).
   */
  logout: () => api<null>("/api/auth/logout/", { method: "POST", body: {} }),
};
