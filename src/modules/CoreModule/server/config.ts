import type { CoreConfig } from "./php-core";

/**
 * Sestaví konfiguraci klienta php-core ze serverového prostředí.
 *
 * Stejný smluvný kontrakt prostředí jako v projektu nuxt/fann; tenanta se nikdy
 * neodvozuje z hlaviček požadavku (např. `X-Forwarded-Host` od klienta).
 * @param env Hodnoty z `astro:env/server`; všechny jsou volitelné.
 * @returns `CoreConfig` s adresou backendu, klíčem API a hostem tenanta.
 */
export function coreConfigFromEnv(env: {
  PHP_API_BASE_URL?: string;
  INTERNAL_API_KEY?: string;
  FRONTEND_HOST?: string;
}): CoreConfig {
  let tenantHost = "";
  try {
    const frontend = new URL(env.FRONTEND_HOST ?? "");
    if (
      ["http:", "https:"].includes(frontend.protocol) &&
      !frontend.username &&
      !frontend.password &&
      !frontend.search &&
      !frontend.hash &&
      frontend.pathname === "/"
    ) {
      tenantHost = frontend.hostname;
    }
  } catch {
    // Veřejné statické stránky fungují i bez konfigurace backendu.
  }
  return {
    baseUrl: env.PHP_API_BASE_URL ?? "",
    apiKey: env.INTERNAL_API_KEY?.trim() ?? "",
    tenantHost,
  };
}
