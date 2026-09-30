/**
 * `POST /api/auth/logout/` – ukončení relace.
 *
 * Obsluhuje `logoutHandler` z AuthModule/server; maže relaci v php-core i
 * session cookie, návrat a chybové stavy jsou popsány u handleru.
 */
export { logoutHandler as POST } from "../../../modules/AuthModule/server/logout";
