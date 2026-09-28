import { defineMiddleware } from "astro:middleware";
import { assertSameOrigin } from "./request";
import { errorResponse } from "./errors";

// Shared request/response lifecycle. Add tracing here without logging cookies or request bodies.
export const requestHook = defineMiddleware(async (context, next) => {
  context.locals.requestId = crypto.randomUUID();
  if (
    context.url.pathname.startsWith("/api/") &&
    !["GET", "HEAD", "OPTIONS"].includes(context.request.method)
  ) {
    try {
      assertSameOrigin(
        context.request,
        context.site?.origin ?? context.url.origin,
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
