import { HttpError } from "./errors";

export interface CoreConfig {
  baseUrl: string;
  apiKey: string;
  tenantHost: string;
}
interface Envelope<T> {
  success: boolean;
  data: T;
}
export type CoreClient = ReturnType<typeof createCoreClient>;

// Instantiate per request. Never accept an upstream URL, tenant or headers from the browser.
export function createCoreClient(
  config: CoreConfig,
  fetcher: typeof fetch = fetch,
) {
  return {
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
      // Do not reflect upstream messages, HTML exception pages or secrets to visitors.
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
