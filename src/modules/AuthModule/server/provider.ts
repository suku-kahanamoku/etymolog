import type { CoreClient } from "../../CoreModule/server/php-core";
import { HttpError } from "../../CoreModule/server/errors";
import type { User, LoginResult } from "../types";

/**
 * Normalizuje odpověď php-core na veřejnou podobu uživatele.
 *
 * Bezpečnostní záměr: do výsledku se dostanou pouze explicitně vybraná pole,
 * takže se ze srdce backendu nepropagují hesla, hashy ani cítlivé údaje.
 * @param data Data uživatele z backendu.
 * @returns Uživatel s garantovanými typy polí.
 * @throws HttpError 502 `invalid_backend_response`, pokud chybí `id`, `email` nebo `role`.
 */
export function publicUser(data: User): User {
  if (
    !data ||
    !Number.isInteger(data.id) ||
    typeof data.email !== "string" ||
    typeof data.role !== "string"
  )
    throw new HttpError(502, "invalid_backend_response");
  return {
    id: data.id,
    email: data.email,
    first_name: String(data.first_name ?? ""),
    last_name: String(data.last_name ?? ""),
    role: data.role,
  };
}

/**
 * Vytvoří serverového providera autentizace nad klientem php-core.
 *
 * Provider vlastní allowlist volaných endpointů (`/auth/login`, `/auth/me`,
 * `/auth/logout`) i validační pravidla pro payloady. Relace se nikdy neřadí
 * do konfigurace ani do URL, token se posílá výhradně v hlavičce `Authorization`.
 * @param core Klient php-core pro jeden request.
 * @returns Objekt s metodami `login`, `me` a `logout`.
 */
export function createAuthProvider(core: CoreClient) {
  return {
    /**
     * Přihlásí uživatele v php-core.
     * @param email E-mail pro autentizaci.
     * @param password Heslo pro autentizaci.
     * @returns Dvojice `{ token, user }` s ověřeným profilem.
     * @throws HttpError 401 `unauthorized` při špatných údajích, 502 při neplatné odpovědi.
     */
    async login(email: string, password: string) {
      const data = await core.request<LoginResult>("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      if (
        !data ||
        typeof data.token !== "string" ||
        !/^[a-f0-9]{64}$/i.test(data.token)
      )
        throw new HttpError(502, "invalid_backend_response");
      return { token: data.token, user: publicUser(data) };
    },
    /**
     * Ověří relaci a načte profil uživatele.
     * @param token Bearer token ze session cookie.
     * @returns Veřejná podoba uživatele.
     * @throws HttpError 401 při neplatném tokenu, 502 při neplatné odpovědi.
     */
    async me(token: string) {
      return publicUser(await core.request<User>("/auth/me", { token }));
    },
    /**
     * Invaliduje relaci na backendu.
     * @param token Bearer token relace, která se ukončuje.
     * @returns `null` po úspěšném zrušení relace.
     * @throws HttpError 401, pokud relace už neplatí, nebo 502 při chybě backendu.
     */
    logout(token: string) {
      return core.request<null>("/auth/logout", { method: "POST", token });
    },
  };
}

/** Typ serverového providera autentizace. */
export type AuthProvider = ReturnType<typeof createAuthProvider>;
