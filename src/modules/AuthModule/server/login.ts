import type { APIRoute } from "astro";
import { site } from "../../../config/site";
import { HttpError, errorResponse } from "../../CoreModule/server/errors";
import { readFields } from "../../CoreModule/server/request";
import { writeToken } from "./session";
import {
  isLocale,
  defaultLocale,
  type Locale,
} from "../../LangModule/providers/locale";
import { url } from "../../../config/routes";

/**
 * `POST /api/auth/login/` – přihlášení uživatele.
 *
 * Vstup: JSON nebo formulářová data s `email`, `password` a volitelným `locale`.
 * Formulářové odeslání vrací přesměrování 303 na administraci (resp. zpět na
 * přihlášení s kódem `invalid`/`unavailable`), JSON volání vrací
 * `{ success: true, data: user }` bez tokenu (ten zůstává v cookie).
 * Vedlejší účinek: uloží Bearer token do session cookie (`httpOnly`).
 * @param context Kontext Astro API routy.
 * @returns Přesměrování 303 nebo JSON odpověď; chyby přes `errorResponse` (404, 415, 413, 422, 401, 502, 503).
 */
export const loginHandler: APIRoute = async (context) => {
  const form = context.request.headers
    .get("content-type")
    ?.startsWith("application/x-www-form-urlencoded");
  let locale: Locale = defaultLocale;
  try {
    if (!site.modules.auth) throw new HttpError(404, "not_found");
    const data = await readFields(context.request);
    if (typeof data.locale === "string" && isLocale(data.locale))
      locale = data.locale;
    if (
      typeof data.email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()) ||
      data.email.length > 254 ||
      typeof data.password !== "string" ||
      !data.password ||
      data.password.length > 1024
    )
      throw new HttpError(422, "invalid_input");
    const result = await context.locals.providers.auth.login(
      data.email.trim(),
      data.password,
    );
    writeToken(
      context.cookies,
      result.token,
      context.site?.protocol === "https:" || import.meta.env.PROD,
    );
    return form
      ? context.redirect(url(locale, "admin"), 303)
      : Response.json({ success: true, data: result.user });
  } catch (error) {
    if (form) {
      const code =
        error instanceof HttpError && [401, 422].includes(error.status)
          ? "invalid"
          : "unavailable";
      return context.redirect(`${url(locale, "login")}?error=${code}`, 303);
    }
    return errorResponse(error);
  }
};
