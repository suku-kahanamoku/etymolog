/**
 * `POST /api/auth/login/` – přihlášení.
 *
 * Obsluhuje `loginHandler` z AuthModule/server; návratová hodnota, validace
 * vstupu i chybové stavy jsou popsány u handleru. `prerender` zůstává vypnuté
 * (endpoint běží na serveru, kde se kontroluje origin a čte se session cookie).
 */
export { loginHandler as POST } from "../../../modules/AuthModule/server/login";
