import { HttpError } from "./errors";

/**
 * Konfigurace jednoho klienta php-core.
 *
 * `apiKey` i `tenantHost` jsou důvěrné serverové hodnoty; vznikají výhradně
 * z prostředí, nikdy z požadavku prohlížeče.
 */
export interface CoreConfig {
  /** Základní URL php-core, např. `https://api.example.cz`. */
  baseUrl: string;
  /** Interní klíč posílaný v hlavičce `X-Internal-Key`. */
  apiKey: string;
  /** Pevný host tenanta posílaný v hlavičce `X-Forwarded-Host`. */
  tenantHost: string;
}

/** Obálka odpovědi php-core: `{ success, data }`. */
interface Envelope<T> {
  /** Příznak úspěchu; `false` se vyhodnotí jako `HttpError 502`. */
  success: boolean;
  /** Data odpovědi rozbalená z obálky. */
  data: T;
}

/** Typ klienta vytvořeného funkcí `createCoreClient`. */
export type CoreClient = ReturnType<typeof createCoreClient>;

/**
 * Vytvoří klienta php-core pro jeden požadavek.
 *
 * Klient se vytváří per request. Od prohlížeče se nikdy nepřijímá URL
 * upstreamu, tenant ani hlavičky – vše pochází z konfigurace prostředí.
 *
 * @param config Doporučené `coreConfigFromEnv()`; obsahuje origin, timeout a host tenanta.
 * @param fetcher Volitelná náhrada `fetch` pro testy; výchozí je globální `fetch`.
 * @returns Objekt s metodou `request` pro volání php-core včetně tenanta.
 */
export function createCoreClient(
  config: CoreConfig,
  fetcher: typeof fetch = fetch,
) {
  return {
    /**
     * Provede jeden ověřený požadavek do php-core a vrátí rozbalená `data`.
     * @param path Cesta začínající lomítkem, např. `/etymolog/public/names`.
     * @param options Metoda, tělo, nepovinný Bearer token uživatele a dotaz.
     * @returns Data z obálky `{ success: true, data }`.
     * @throws HttpError 503 při neúplné či neplatné konfiguraci, 500 pro neplatnou cestu,
     * 502 při nedostupnosti nebo nečitelném/vyhovujícím rozkladu odpovědi;
     * známé stavy 401/403/404/409/422/429 se propíší návštěvníkovi.
     */
    async request<T>(
      path: string,
      options: {
        method?: "GET" | "POST" | "PATCH" | "DELETE";
        body?: unknown;
        token?: string;
        query?: Record<string, string>;
      } = {},
    ): Promise<T> {
      if (!config.baseUrl || !config.apiKey || !config.tenantHost)
        throw new HttpError(503, "backend_not_configured");
      if (!/^\/[a-z0-9/-]+$/i.test(path) || path.startsWith("//"))
        throw new HttpError(500, "invalid_backend_path");
      if (!/^[a-z0-9.-]+(?::\d+)?$/i.test(config.tenantHost))
        throw new HttpError(503, "invalid_tenant_host");
      let base: URL;
      try {
        base = new URL(config.baseUrl);
      } catch {
        throw new HttpError(503, "invalid_backend_url");
      }
      if (
        !["https:", "http:"].includes(base.protocol) ||
        base.username ||
        base.password ||
        base.search ||
        base.hash
      )
        throw new HttpError(503, "invalid_backend_url");
      const headers = new Headers({
        Accept: "application/json",
        "X-Internal-Key": config.apiKey,
        "X-Forwarded-Host": config.tenantHost,
      });
      if (options.token)
        headers.set("Authorization", `Bearer ${options.token}`);
      if (options.body !== undefined)
        headers.set("Content-Type", "application/json");
      let response: Response;
      try {
        response = await fetcher(
          `${base.href.replace(/\/$/, "")}${path}${options.query ? `?${new URLSearchParams(options.query)}` : ""}`,
          {
            method: options.method ?? "GET",
            headers,
            body:
              options.body === undefined
                ? undefined
                : JSON.stringify(options.body),
            signal: AbortSignal.timeout(10_000),
            redirect: "error",
            cache: "no-store",
          },
        );
      } catch {
        throw new HttpError(502, "backend_unavailable");
      }
      // Neprodrážujeme návštěvníkovi zprávy, HTML stránky s výjimkou ani tajné údaje z upstreamu.
      if (!response.ok) {
        const status = [401, 403, 404, 409, 422, 429].includes(response.status)
          ? response.status
          : 502;
        throw new HttpError(
          status,
          status === 401
            ? "unauthorized"
            : status === 429
              ? "rate_limited"
              : "backend_error",
        );
      }
      let payload: Envelope<T>;
      try {
        payload = await response.json();
      } catch {
        throw new HttpError(502, "invalid_backend_response");
      }
      if (!payload || payload.success !== true || !("data" in payload))
        throw new HttpError(502, "invalid_backend_response");
      return payload.data;
    },
  };
}
