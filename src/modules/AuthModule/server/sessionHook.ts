import { defineMiddleware } from "astro:middleware";
import { clearToken, readToken } from "./session";
import { HttpError } from "../../CoreModule/server/errors";
import type { User } from "../types";

/**
 * Middleware pro odložené načtení relace.
 *
 * `getUser` se vyhodnocuje při prvním použití a výsledek se v rámci requestu
 * cachuje, aby se backend nevolal opakovaně. Neplatná relace smaže cookie,
 * ostatní chyby se propíší dál, aby se nezatěžoval backend při výpadku.
 * @param context Kontext Astro požadavku.
 * @param next Pokračování zpracování v dalších middlewarerch a routě.
 * @returns Odpověď routy; funkci `context.locals.getUser` předtím doplní.
 */
export const sessionHook = defineMiddleware(async (context, next) => {
  let userPromise: Promise<User | null> | undefined;
  context.locals.getUser = () =>
    (userPromise ??= (async () => {
      const token = readToken(context.cookies);
      if (!token) return null;
      try {
        return await context.locals.providers.auth.me(token);
      } catch (error) {
        if (error instanceof HttpError && error.status === 401) {
          clearToken(context.cookies);
          return null;
        }
        throw error;
      }
    })());
  return next();
});
