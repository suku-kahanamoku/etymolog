import { legacyRedirect } from "./config/routes";
import { defineMiddleware, sequence } from "astro:middleware";
import { requestHook } from "./modules/CoreModule/server/requestHook";
import { sessionHook } from "./modules/AuthModule/server/sessionHook";
import { createProviders } from "./server/providers";
import { readToken } from "./modules/AuthModule/server/session";
export const onRequest = sequence(
  defineMiddleware((context, next) => {
    if (context.request.method === "GET" || context.request.method === "HEAD") {
      const target = legacyRedirect(context.url.pathname);
      if (target) return context.redirect(target + context.url.search, 308);
    }
    return next();
  }),
  requestHook,
  defineMiddleware(async (context, next) => {
    context.locals.providers = createProviders(readToken(context.cookies));
    return next();
  }),
  sessionHook,
);
