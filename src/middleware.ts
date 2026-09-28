import { defineMiddleware, sequence } from "astro:middleware";
import { requestHook } from "./modules/CoreModule/server/requestHook";
import { sessionHook } from "./modules/AuthModule/server/sessionHook";
import { createProviders } from "./server/providers";
import { readToken } from "./modules/AuthModule/server/session";
export const onRequest = sequence(
  requestHook,
  defineMiddleware(async (context, next) => {
    context.locals.providers = createProviders(readToken(context.cookies));
    return next();
  }),
  sessionHook,
);
