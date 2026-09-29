import type { CoreClient } from "../../CoreModule/server/php-core";
import { HttpError } from "../../CoreModule/server/errors";
import { resourceDefinition } from "../config/resources";
import type { NameRecord, SearchResult, Dossier, AdminRecord } from "../types";
function pick<T>(value: unknown, keys: string): T {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new HttpError(502, "invalid_backend_response");
  const source = value as Record<string, unknown>;
  return Object.fromEntries(
    keys.split(" ").map((key) => [key, source[key] ?? null]),
  ) as T;
}
const nameFields = "id name kind language country_code summary";
const detailFields = {
  entries:
    "id type title body source_url certainty language region year_from year_to",
  citations: "id entry_id source_id url locator quotation",
  variants:
    "id variant relation language region year_from year_to source_id target_name_id",
  occurrences:
    "id source_id country_code region observed_year observed_on sex measure count original_spelling locator",
  calendar_days:
    "id source_id title kind date_kind month day date_rule source_url locator calendar_title country_code system tradition region year_from year_to",
  sources: "id title author url license license_url attribution",
};
export function createEtymologProvider(core: CoreClient, token?: string) {
  const privateRequest = <T>(
    path: string,
    options: Parameters<CoreClient["request"]>[1] = {},
  ) => {
    if (!token) throw new HttpError(401, "unauthorized");
    return core.request<T>(`/etymolog/${path}`, { ...options, token });
  };
  const resourcePath = (resource: string, id?: number) => {
    if (!resourceDefinition(resource)) throw new HttpError(404, "not_found");
    if (
      id !== undefined &&
      (!Number.isSafeInteger(id) || id < 1 || id > 2147483647)
    )
      throw new HttpError(422, "invalid_input");
    return resource + (id === undefined ? "" : `/${id}`);
  };
  return {
    async search(q: string, kind = "", page = "1"): Promise<SearchResult> {
      const name = q.trim();
      if (
        name.length < 2 ||
        name.length > 100 ||
        !["", "given", "surname"].includes(kind) ||
        !/^[1-9][0-9]{0,6}$/.test(page) ||
        Number(page) > 1000000
      )
        throw new HttpError(422, "invalid_input");
      const filter = JSON.stringify({ name: { $regex: name } });
      const result = await core.request<SearchResult>(
        "/etymolog/public/names",
        { query: { q: filter, kind, page } },
      );
      if (!Array.isArray(result.items) || !Number.isFinite(result.total))
        throw new HttpError(502, "invalid_backend_response");
      return {
        items: result.items.map((item) => pick<NameRecord>(item, nameFields)),
        total: result.total,
        page: Number(page),
        limit: 20,
      };
    },
    async detail(id: number): Promise<Dossier> {
      const result = await core.request<Dossier>(
        `/etymolog/public/names/${id}`,
      );
      const data = {
        name: pick<NameRecord>(result.name, nameFields),
      } as Dossier;
      for (const key of Object.keys(
        detailFields,
      ) as (keyof typeof detailFields)[]) {
        if (!Array.isArray(result[key]))
          throw new HttpError(502, "invalid_backend_response");
        Object.assign(data, {
          [key]: result[key].map((item) => pick(item, detailFields[key])),
        });
      }
      return data;
    },
    list(resource: string, page: string, q: string) {
      return privateRequest<AdminRecord[]>(resourcePath(resource), {
        query: { page, limit: "20", sort: "id DESC", ...(q ? { q } : {}) },
      });
    },
    get(resource: string, id: number) {
      return privateRequest<AdminRecord>(resourcePath(resource, id));
    },
    save(resource: string, body: unknown, id?: number) {
      return privateRequest<AdminRecord>(resourcePath(resource, id), {
        method: id ? "PATCH" : "POST",
        body,
      });
    },
    remove(resource: string, id: number, force: boolean) {
      return privateRequest(resourcePath(resource, id), {
        method: "DELETE",
        query: { force: String(force) },
      });
    },
    evidence(resource: string, id: number, action: string, page: string) {
      const allowed: Record<string, string[]> = {
        names: ["imports", "external-records"],
        entries: ["imports"],
        occurrences: ["imports"],
        "calendar-days": ["imports"],
        "sync-jobs": ["runs"],
      };
      if (!allowed[resource]?.includes(action))
        throw new HttpError(404, "not_found");
      return privateRequest(`${resourcePath(resource, id)}/${action}`, {
        query: { page, limit: "20" },
      });
    },
    publishAll() {
      return privateRequest("publish-all", { method: "POST", body: {} });
    },
    startSync() {
      return privateRequest("sync/start", { method: "POST", body: {} });
    },
    syncStatus() {
      return privateRequest("sync/status");
    },
    reset(id: number) {
      return privateRequest(resourcePath("sync-jobs", id) + "/reset", {
        method: "POST",
        body: {},
      });
    },
  };
}
