/**
 * Chyba veřejného API vrstvy webu.
 *
 * `code` je krátký, bezpečný identifikátor, který se propíše do JSON odpovědi;
 * nikdy neobsahuje detail ze zbytkové chyby sítě nebo backendu.
 */
export class ApiError extends Error {
  /**
   * @param status HTTP stav, který se vrátí klientovi.
   * @param code Strojový kód chyby (např. `unauthorized`).
   */
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}

/**
 * Volání vlastního API webe z prohlížeče (relace jde v cookie `same-origin`).
 * @param path Cesta začínající `/api/`.
 * @param options Volitelná metoda (`GET`/`POST`), tělo požadavku a signál zrušení.
 * @returns Rozbalený payload `data` z odpovědi `{ success, data }`.
 * @throws ApiError Při chybovém HTTP stavu nebo `success: false`.
 * @throws Error Při cestě mimo `/api/` nebo s Backslashem.
 */
export async function api<T>(
  path: `/api/${string}`,
  options: {
    method?: "GET" | "POST";
    body?: unknown;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  if (!path.startsWith("/api/") || path.includes("\\"))
    throw new Error("Invalid API path");
  const response = await fetch(path, {
    method: options.method ?? "GET",
    credentials: "same-origin",
    signal: options.signal,
    headers: {
      Accept: "application/json",
      ...(options.body !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const data = await response.json();
  if (!response.ok || !data.success)
    throw new ApiError(response.status, data.error ?? "request_failed");
  return data.data as T;
}
