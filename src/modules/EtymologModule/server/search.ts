import type { APIRoute } from "astro";
import { errorResponse } from "../../CoreModule/server/errors";
export const searchHandler: APIRoute = async ({ url, locals }) => {
  try {
    const data = await locals.providers.etymolog.search(
      url.searchParams.get("q") ?? "",
      url.searchParams.get("kind") ?? "",
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
