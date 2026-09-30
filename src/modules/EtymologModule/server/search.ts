import type { APIRoute } from "astro";
import { errorResponse } from "../../CoreModule/server/errors";

/**
 * `GET /api/etymolog/search/` – veřejné hledání jmen.
 *
 * Vstup: dotaz `q` (2–100 znaků, vyžadováno) a volitelné `page` (1–1 000 000).
 * Návrat: `{ success: true, data: { items, total, page, limit } }` s projektovanými
 * položkami a hlavičkou `Cache-Control: no-store`.
 * Chyby: 422 `invalid_input` pro neplatné parametry, 502 při neočekávané odpovědi
 * backendu, 503 při nedostupném backendu.
 * @param context Kontext Astro API routy (`url`, `locals`).
 * @returns JSON odpověď s výsledky, nebo chybová JSON odpověď.
 */
export const searchHandler: APIRoute = async ({ url, locals }) => {
  try {
    const data = await locals.providers.etymolog.search(
      url.searchParams.get("q") ?? "",
      "",
      url.searchParams.get("page") ?? "1",
    );
    return Response.json(
      { success: true, data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
};
