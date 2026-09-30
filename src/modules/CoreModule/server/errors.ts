/**
 * Chyba serverové vrstvy s bezpečným kódem a HTTP stavem.
 *
 * Používá se ve všech modulech, které volají php-core, tak aby se na veřejné
 * API nikdy nepropsaly surové zprávy nebo HTML stránky s výjimkou backendu.
 */
export class HttpError extends Error {
  /**
   * @param status HTTP stav vrácený klientovi.
   * @param code Strojový kód chyby (např. `backend_unavailable`).
   */
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}

/**
 * Převede libovolnou chybu na jednotnou JSON odpověď `{ success, error }`.
 *
 * Neznámé chyby se schovají pod kód `internal_error` se stavem 500, aby se
 * ven neprosákly stack trace ani detaily implementace. Odpověď je vždy
 * označena `Cache-Control: no-store`.
 * @param error Chyba, typicky zachycená v `catch`.
 * @returns `Response` s JSON tělem a příslušným HTTP stavem.
 */
export function errorResponse(error: unknown): Response {
  const known = error instanceof HttpError;
  return Response.json(
    { success: false, error: known ? error.code : "internal_error" },
    {
      status: known ? error.status : 500,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
