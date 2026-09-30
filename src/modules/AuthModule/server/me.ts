import type { APIRoute } from "astro";
import { site } from "../../../config/site";
import { errorResponse, HttpError } from "../../CoreModule/server/errors";

/**
 * `GET /api/auth/me/` – profil přihlášeného uživatele.
 *
 * Vstup: pouze session cookie (nebere žádné parametry ani tělo).
 * Návrat: `{ success: true, data: user }` s veřejnou podobou profilu.
 * @param context Kontext Astro API routy (použije `locals.getUser()`).
 * @returns JSON odpověď; 401 `unauthorized` bez platné relace, 404 při vypnutém modulu,
 * 503 při nedostupném backendu.
 */
export const meHandler: APIRoute = async ({ locals }) => {
  try {
    if (!site.modules.auth) throw new HttpError(404, "not_found");
    const user = await locals.getUser();
    if (!user) throw new HttpError(401, "unauthorized");
    return Response.json({ success: true, data: user });
  } catch (error) {
    return errorResponse(error);
  }
};
