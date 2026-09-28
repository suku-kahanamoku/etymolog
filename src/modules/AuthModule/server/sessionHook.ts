import { defineMiddleware } from "astro:middleware";
import { clearToken, readToken } from "./session";
import { HttpError } from "../../CoreModule/server/errors";
import type { User } from "../types";
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
