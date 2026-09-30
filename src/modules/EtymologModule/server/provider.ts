import type { CoreClient } from "../../CoreModule/server/php-core";
import { HttpError } from "../../CoreModule/server/errors";
import { resourceDefinition } from "../config/resources";
import type {
  NameRecord,
  SearchResult,
  Dossier,
  AdminRecord,
  TodayNamedays,
} from "../types";

/**
 * Projekce odpovědi backendu na záměrně vybraná pole.
 *
 * Bezpečnostní záměr: veřejná API vrstva nikdy nepropíše celý řádek z php-core.
 * Vyjde jen whitelist polí, chybějící hodnoty se nahradí `null`.
 * @param value Položka z odpovědi backendu.
 * @param keys Whitelist polí oddělených mezerem.
 * @returns Objekt s pouze uvedenými poli.
 * @throws HttpError 502 `invalid_backend_response`, pokud položka není objekt.
 */
function pick<T>(value: unknown, keys: string): T {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new HttpError(502, "invalid_backend_response");
  const source = value as Record<string, unknown>;
  return Object.fromEntries(
    keys.split(" ").map((key) => [key, source[key] ?? null]),
  ) as T;
}

/** Whitelist polí veřejného záznamu jména. */
const nameFields = "id name kind language country_code summary";

/** Whitelist polí jednotlivých sekcí detailu jména. */
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

/**
 * Vytvoří serverového providera EtymologModule nad klientem php-core.
 *
 * Záměr zabezpečení: provider vlastní allowlist cest (`/etymolog/public/…`
 * pro veřejné čtení, `/etymolog/<resource>` jen s relací), validuje vstupy před
 * odesláním a nepropouští žádná data z klienta ani nestandardní cesty. Role uživatele
 * se neposílá – autorizaci nad daty vždy ověřuje php-core.
 * @param core Klient php-core pro jeden request.
 * @param token Bearer token relace; bez něj jsou administrativní metody nepřístupné.
 * @returns Objekt s veřejnými metodami `search` a `detail` a metodami administrace.
 */
export function createEtymologProvider(core: CoreClient, token?: string) {
  /**
   * Volání administrativního endpointu vyžadující platnou relaci.
   * @param path Cesta za `/etymolog/` včetně případného ID.
   * @param options Volitelná metoda, tělo a dotaz.
   * @returns Data z odpovědi php-core.
   * @throws HttpError 401 `unauthorized`, když v requestu není relace.
   */
  const privateRequest = <T>(
    path: string,
    options: Parameters<CoreClient["request"]>[1] = {},
  ) => {
    if (!token) throw new HttpError(401, "unauthorized");
    return core.request<T>(`/etymolog/${path}`, { ...options, token });
  };
  /**
   * Sestaví cestu zdroje z allowlistu v `config/resources.json`.
   * @param resource Klíč zdroje z URL administrace.
   * @param id Volitelný kladný ID záznamu.
   * @returns Cesta `resource` nebo `resource/<id>`.
   * @throws HttpError 404 pro nedefinovaný zdroj, 422 pro neplatné ID.
   */
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
    async today(): Promise<TodayNamedays> {
      const result = await core.request<TodayNamedays>(
        "/etymolog/public/today",
      );
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(result.date) ||
        result.timezone !== "Europe/Prague" ||
        !Array.isArray(result.items)
      )
        throw new HttpError(502, "invalid_backend_response");
      const proverb = result.proverb;
      if (
        proverb != null &&
        (typeof proverb.body !== "string" ||
          (proverb.date !== undefined &&
            (typeof proverb.date !== "string" ||
              !/^\d{4}-\d{2}-\d{2}$/.test(proverb.date))) ||
          typeof proverb.source_title !== "string" ||
          (proverb.source_url !== null &&
            typeof proverb.source_url !== "string") ||
          (proverb.name_id !== null &&
            (!Number.isSafeInteger(proverb.name_id) || proverb.name_id < 1)))
      )
        throw new HttpError(502, "invalid_backend_response");
      return {
        date: result.date,
        timezone: result.timezone,
        proverb: proverb
          ? {
              ...pick<NonNullable<TodayNamedays["proverb"]>>(
                proverb,
                "body source_url source_title name_id",
              ),
              date: proverb.date ?? result.date,
            }
          : null,
        items: result.items.map((item) =>
          pick<TodayNamedays["items"][number]>(
            item,
            "name_id name source_url source_title source_fallback_url calendar_title",
          ),
        ),
      };
    },
    /**
     * Veřejné hledání jmen.
     * @param q Hledaný řetězec (2–100 znaků), používá se jako regulární výraz backendu.
     * @param kind Volitelný filtr druhu (`given`, `surname`), prázdný = obojí.
     * @param page Číslo stránky jako řetězec (1–1 000 000).
     * @returns Výsledek s projektovanými položkami, celkovým počtem a stránkou.
     * @throws HttpError 422 pro neplatné parametry, 502 při neočekávaném tvaru odpovědi.
     */
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
      const filter = JSON.stringify({
        name: { $regex: name },
        ...(kind ? { kind: { $eq: kind } } : {}),
      });
      const result = await core.request<SearchResult>(
        "/etymolog/public/names",
        { query: { q: filter, page } },
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
    /**
     * Veřejný detail jednoho jména včetně výkladů, variant, výskytů a zdrojů.
     * @param id Identifikátor záznamu jména.
     * @returns Dossier s projektovanými poli; každá sekce musí být v odpovědi pole.
     * @throws HttpError 404/502 při chybějícím nebo neúplném záznamu.
     */
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
    /**
     * Stránka záznamů zdroje pro administraci.
     * @param resource Klíč zdroje z allowlistu.
     * @param page Číslo stránky.
     * @param q Volitelný filtr (JSON filtr předaný do dotazu `q`).
     * @returns Záznamy vybrané podle `id` sestupně.
     * @throws HttpError 401 bez relace, 404 pro nedefinovaný zdroj, 422 pro neplatné ID.
     */
    list(resource: string, page: string, q: string) {
      return privateRequest<AdminRecord[]>(resourcePath(resource), {
        query: {
          page,
          limit: "20",
          sort: JSON.stringify([{ id: -1 }]),
          ...(q ? { q } : {}),
        },
      });
    },
    /**
     * Jeden záznam zdroje.
     * @param resource Klíč zdroje z allowlistu.
     * @param id Kladné ID záznamu.
     * @returns Záznam z php-core.
     * @throws HttpError 401/404/422 dle pravidel `resourcePath`.
     */
    get(resource: string, id: number) {
      return privateRequest<AdminRecord>(resourcePath(resource, id));
    },
    /**
     * Vytvoří (`POST`) nebo upraví (`PATCH`) záznam.
     * @param resource Klíč zdroje z allowlistu.
     * @param body Tělo s políčky, která handler předem ověřil proti definici zdroje.
     * @param id Při `PATCH` ID záznamu; bez něj se vytváří nový záznam.
     * @returns Vytvořený nebo upravený záznam.
     * @throws HttpError 401/404/422 dle pravidel `resourcePath`.
     */
    save(resource: string, body: unknown, id?: number) {
      return privateRequest<AdminRecord>(resourcePath(resource, id), {
        method: id ? "PATCH" : "POST",
        body,
      });
    },
    /**
     * Smaže záznam; `force` předává kaskádové mazání a vyžaduje roli `admin`.
     * @param resource Klíč zdroje z allowlistu.
     * @param id Kladné ID záznamu.
     * @param force `true` pro vynucené (kaskádové) smazání.
     * @returns Odpověď backendu.
     * @throws HttpError 401/404/422 dle pravidel `resourcePath`.
     */
    remove(resource: string, id: number, force: boolean) {
      return privateRequest(resourcePath(resource, id), {
        method: "DELETE",
        query: { force: String(force) },
      });
    },
    /**
     * Důkazní podklady (importy, běhy synchronizace) k záznamu.
     * @param resource Klíč zdroje z allowlistu.
     * @param id Kladné ID záznamu.
     * @param action Podakce zdroje; povolena jen dle interního allowlistu.
     * @param page Číslo stránky.
     * @returns Stránka důkazních podkladů.
     * @throws HttpError 401 bez relace, 404 pro nedefinovanou dvojici zdroj/podakce, 422 pro neplatné ID.
     */
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
    /**
     * Spustí publikaci všech připravených záznamů.
     * @returns Souhrn publikace včetně přeskočených záznamů a důvodů.
     * @throws HttpError 401 bez relace, 502 při chybě backendu.
     */
    publishAll() {
      return privateRequest("publish-all", { method: "POST", body: {} });
    },
    /**
     * Zahájí synchronizaci dat.
     * @returns Aktuální stav dávky synchronizace.
     * @throws HttpError 401 bez relace, 502 při chybě backendu.
     */
    startSync() {
      return privateRequest("sync/start", { method: "POST", body: {} });
    },
    /** Zastaví konkrétní běh po dokončení rozpracované dávky. */
    stopSync(requestId: string) {
      return privateRequest("sync/stop", {
        method: "POST",
        body: { request_id: requestId },
      });
    },
    /**
     * Načte stav probíhající synchronizace.
     * @returns Stav dávky, nebo `null` když žádná neprobíhá.
     * @throws HttpError 401 bez relace, 502 při chybě backendu.
     */
    syncStatus() {
      return privateRequest("sync/status");
    },
    /**
     * Resetuje chybnou úlohu synchronizace, aby šla znovu spustit.
     * @param id Kladné ID úlohy synchronizace.
     * @returns Zresetovaná úloha.
     * @throws HttpError 401 bez relace, 422 pro neplatné ID, 502 při chybě backendu.
     */
    reset(id: number) {
      return privateRequest(resourcePath("sync-jobs", id) + "/reset", {
        method: "POST",
        body: {},
      });
    },
  };
}
