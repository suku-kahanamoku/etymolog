import { defineMiddleware } from "astro:middleware";
import { assertSameOrigin, expectedWriteOrigin } from "./request";
import { errorResponse } from "./errors";

/**
 * Sdílený životní cyklus requestu a odpovědi.
 *
 * Přiřadí `requestId`, u zápisových požadavků pod `/api/` ověří origin a všechny
 * odpovědi opatří bezpečnostními hlavičkami. Trasování zde přidávejte bez logování
 * cookies a těl požadavků.
 * @param context Kontext Astro požadavku.
 * @param next Pokračování zpracování v dalších middlewarerch a routě.
 * @returns Odpověď routy s doplněnými hlavičkami; při chybě originu chybová JSON odpověď.
 */
export const requestHook = defineMiddleware(async (context, next) => {
  context.locals.requestId = crypto.randomUUID();
  if (
    context.url.pathname.startsWith("/api/") &&
    !["GET", "HEAD", "OPTIONS"].includes(context.request.method)
  ) {
    try {
      assertSameOrigin(
        context.request,
        expectedWriteOrigin(context.url, context.site, import.meta.env.DEV),
      );
    } catch (error) {
      return errorResponse(error);
    }
  }
  const response = await next();
  response.headers.set("X-Request-Id", context.locals.requestId);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  if (context.url.pathname.startsWith("/api/") || context.locals.privatePage)
    response.headers.set("Cache-Control", "private, no-store");
  return response;
});
