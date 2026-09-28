import type { APIRoute } from "astro";
import { site } from "../../../config/site";
import { errorResponse, HttpError } from "../../CoreModule/server/errors";
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
