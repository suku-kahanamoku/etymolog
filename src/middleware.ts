import { legacyRedirect } from "./config/routes";
import { defineMiddleware, sequence } from "astro:middleware";
import { requestHook } from "./modules/CoreModule/server/requestHook";
import { sessionHook } from "./modules/AuthModule/server/sessionHook";
import { createProviders } from "./server/providers";
import { readToken } from "./modules/AuthModule/server/session";

/**
 * Řetěz middleware pro každý request.
 *
 * Pořadí je záměrné: nejdříve přesměrování starých nelokalizovaných adres,
 * potom bezpečnostní hlavičky a kontrola originu (`requestHook`), složení
 * providerů pro tento request a nakonec odložené načtení relace (`sessionHook`).
 * Relace se načítá až když je potřeba, aby se nestahovala pro statické stránky.
 */
export const onRequest = sequence(
  // Přesměrování starých nelokalizovaných cest (aliasy), 308 kvůli cacheování.
  defineMiddleware((context, next) => {
    if (context.request.method === "GET" || context.request.method === "HEAD") {
      const target = legacyRedirect(context.url.pathname);
      if (target) return context.redirect(target + context.url.search, 308);
    }
    return next();
  }),
  requestHook,
  // Provideri se skládají per request; token relace se předá jen serverové vrstvě.
  defineMiddleware(async (context, next) => {
    context.locals.providers = createProviders(readToken(context.cookies));
    return next();
  }),
  sessionHook,
);
