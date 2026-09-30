/// <reference types="astro/client" />

/**
 * Data dostupná každému requestu přes `Astro.locals`.
 *
 * Sestavuje je `src/middleware.ts`: `requestId` a hlavičky od `requestHook`,
 * `providers` složené v `src/server/providers.ts` a `getUser` z `sessionHook`.
 */
declare namespace App {
  interface Locals {
    /** Jednoznačný identifikátor requestu (UUID); vrací se v hlavičce `X-Request-Id`. */
    requestId: string;
    /**
     * `true` pro neveřejné stránky (login, účet, administrace).
     * Vypíná reklamní rám a vynucuje hlavičku `Cache-Control: private, no-store`.
     */
    privatePage?: boolean;
    /** Sada modulových providerů vytvořená pro tento request. */
    providers: import("./server/providers").Providers;
    /**
     * Načte ověřeného uživatele; výsledek se v rámci requestu cachuje.
     * @returns Aktuální uživatel, nebo `null` když není přihlášen.
     */
    getUser: () => Promise<import("./modules/AuthModule/types").User | null>;
  }
}
