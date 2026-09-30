import type { APIRoute } from "astro";
import { HttpError, errorResponse } from "../../CoreModule/server/errors";
import { readFields } from "../../CoreModule/server/request";
import { resourceDefinition } from "../config/resources";
import { site } from "../../../config/site";

/**
 * `GET|POST|PATCH|DELETE /api/admin/etymolog/[...path]` – univerzální API administrace.
 *
 * Vstup: cesta tvaru `/<resource>/[/<id>[/<action>]]`, dotaz `page` a `q`,
 * u `DELETE` parametr `force`; tělo `POST`/`PATCH` ve formátu JSON s klíči
 * odpovídajícími definici zdroje.
 * Návrat: `{ success: true, data }` s `Cache-Control: private, no-store`;
 * `POST` bez podakce vrací 201, spuštění synchronizace 202.
 * Bezpečnostní záměr: vyžaduje přihlášenou relaci, zdroje i podakce se
 * kontrolují proti allowlistu v `config/resources.json`, tělo se limituje velikostí,
 * neznámá pole se odmítají a kaskádové mazání je vyhrazeno roli `admin`.
 * Chyby: 401, 403, 404, 405, 413, 415, 422, 502, 503 přes `errorResponse`.
 * @param context Kontext Astro API routy (`params`, `request`, `url`, `locals`).
 * @returns JSON odpověď s daty, nebo chybová JSON odpověď.
 */
export const adminHandler: APIRoute = async ({
  params,
  request,
  url,
  locals,
}) => {
  try {
    if (!site.modules.auth) throw new HttpError(404, "not_found");
    const user = await locals.getUser();
    if (!user) throw new HttpError(401, "unauthorized");
    const parts = (params.path ?? "").split("/").filter(Boolean);
    const [resource, rawId, action] = parts;
    // Publikace všeho je globální akce omezená na administrátora.
    if (resource === "publish-all" && parts.length === 1) {
      if (user.role !== "admin") throw new HttpError(403, "forbidden");
      if (request.method !== "POST")
        throw new HttpError(405, "method_not_allowed");
      const body = await readFields(request, 1024);
      if (Object.keys(body).length) throw new HttpError(422, "invalid_input");
      const data = await locals.providers.etymolog.publishAll();
      return Response.json(
        { success: true, data },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }
    // Spuštění a stav synchronizace jsou jen pro administrátora.
    if (resource === "sync" && parts.length === 2) {
      if (user.role !== "admin") throw new HttpError(403, "forbidden");
      let data: unknown;
      if (rawId === "start" && request.method === "POST") {
        const body = await readFields(request, 1024);
        if (Object.keys(body).length) throw new HttpError(422, "invalid_input");
        data = await locals.providers.etymolog.startSync();
      } else if (rawId === "stop" && request.method === "POST") {
        const body = await readFields(request, 1024);
        if (
          Object.keys(body).length !== 1 ||
          typeof body.request_id !== "string" ||
          !/^[a-f0-9]{32}$/.test(body.request_id)
        )
          throw new HttpError(422, "invalid_input");
        data = await locals.providers.etymolog.stopSync(body.request_id);
      } else if (rawId === "status" && request.method === "GET") {
        data = await locals.providers.etymolog.syncStatus();
      } else throw new HttpError(405, "method_not_allowed");
      return Response.json(
        { success: true, data },
        {
          status: rawId === "start" ? 202 : 200,
          headers: { "Cache-Control": "private, no-store" },
        },
      );
    }
    const definition = resourceDefinition(resource ?? "");
    if (!definition || parts.length > 3) throw new HttpError(404, "not_found");
    if (definition.admin && user.role !== "admin")
      throw new HttpError(403, "forbidden");
    const id = rawId === undefined ? undefined : Number(rawId);
    if (
      rawId !== undefined &&
      (!/^[1-9][0-9]*$/.test(rawId) ||
        !Number.isSafeInteger(id) ||
        id! > 2147483647)
    )
      throw new HttpError(422, "invalid_input");
    const page = url.searchParams.get("page") ?? "1";
    if (!/^[1-9][0-9]{0,6}$/.test(page) || Number(page) > 1000000)
      throw new HttpError(422, "invalid_input");
    const provider = locals.providers.etymolog;
    let data: unknown;
    if (action) {
      if (!id) throw new HttpError(404, "not_found");
      if (
        request.method === "POST" &&
        resource === "sync-jobs" &&
        action === "reset"
      ) {
        await readFields(request);
        data = await provider.reset(id);
      } else if (request.method === "GET")
        data = await provider.evidence(resource, id, action, page);
      else throw new HttpError(405, "method_not_allowed");
    } else if (request.method === "GET") {
      const search = url.searchParams.get("q")?.trim() ?? "";
      if (search.length > 255) throw new HttpError(422, "invalid_input");
      // Zdroj bez textového pole filtruje pouze podle přesného ID.
      const field = Object.hasOwn(definition.fields, "name")
        ? "name"
        : Object.hasOwn(definition.fields, "title")
          ? "title"
          : Object.hasOwn(definition.fields, "variant")
            ? "variant"
            : "id";
      if (search && field === "id" && !/^[1-9][0-9]*$/.test(search))
        throw new HttpError(422, "invalid_input");
      const filter = search
        ? JSON.stringify(
            field === "id"
              ? { id: Number(search) }
              : { [field]: { $regex: search } },
          )
        : "";
      data = id
        ? await provider.get(resource, id)
        : await provider.list(resource, page, filter);
    } else if (
      (request.method === "POST" && !id) ||
      (request.method === "PATCH" && id)
    ) {
      const body = await readFields(request, 262144);
      if (
        Object.keys(body).some((key) => !Object.hasOwn(definition.fields, key))
      )
        throw new HttpError(422, "invalid_input");
      for (const [key, value] of Object.entries(body)) {
        const [type] = definition.fields[key];
        if (
          value !== null &&
          typeof value !== "string" &&
          typeof value !== "number" &&
          typeof value !== "boolean"
        )
          throw new HttpError(422, "invalid_input");
        const max = type.startsWith("text:")
          ? Number(type.slice(5))
          : type === "url"
            ? 2048
            : 255;
        if (typeof value === "string" && value.length > max)
          throw new HttpError(422, "invalid_input");
      }
      data = await provider.save(resource, body, id);
    } else if (request.method === "DELETE" && id) {
      const force = url.searchParams.get("force") ?? "false";
      if (!["true", "false"].includes(force))
        throw new HttpError(422, "invalid_input");
      if (force === "true" && user.role !== "admin")
        throw new HttpError(403, "forbidden");
      data = await provider.remove(resource, id, force === "true");
    } else throw new HttpError(405, "method_not_allowed");
    return Response.json(
      { success: true, data },
      {
        status: request.method === "POST" && !action ? 201 : 200,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
};
