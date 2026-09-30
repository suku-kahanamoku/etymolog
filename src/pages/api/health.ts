import type { APIRoute } from "astro";
/**
 * Živostní kontrola procesu.
 *
 * Endpoint je veřejný a bez autentizace; `prerender` zůstává vypnuté, protože
 * odpověď musí vznikat při každém požadavku. Vstup žádný, výstupem je
 * `{ success: true, data: { status: "ok" } }` a chyby nevznikají – kontrola
 * záměrně neznamená dostupnost php-core ani jeho databáze.
 */
export const GET: APIRoute = () =>
  Response.json({ success: true, data: { status: "ok" } });
