/**
 * `GET /api/auth/me/` – profil přihlášeného uživatele.
 *
 * Obsluhuje `meHandler` z AuthModule/server; čte pouze session cookie a vrací
 * `{ success: true, data: user }`, bez relace 401 `unauthorized`.
 */
export { meHandler as GET } from "../../../modules/AuthModule/server/me";
