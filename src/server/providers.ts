import {
  PHP_API_BASE_URL,
  INTERNAL_API_KEY,
  FRONTEND_HOST,
} from "astro:env/server";
import { coreConfigFromEnv } from "../modules/CoreModule/server/config";
import { createCoreClient } from "../modules/CoreModule/server/php-core";
import { createAuthProvider } from "../modules/AuthModule/server/provider";

import { createEtymologProvider } from "../modules/EtymologModule/server/provider";

/**
 * Kompoziční kořen serverových providerů.
 *
 * Konfigurace klienta php-core pochází výhradně ze serverového prostředí;
 * `token` je volitelný Bearer relace návštěvníka a zůstává uvnitř serverové
 * vrstvy (nikdy se neposílá do prohlížeče).
 * @param token Bearer token ze session cookie, pokud je návštěvník přihlášen.
 * @returns Sada providerů `auth` a `etymolog` pro jeden request.
 */
export function createProviders(token?: string) {
  const core = createCoreClient(
    coreConfigFromEnv({ PHP_API_BASE_URL, INTERNAL_API_KEY, FRONTEND_HOST }),
  );
  return {
    auth: createAuthProvider(core),
    etymolog: createEtymologProvider(core, token),
  };
}

/** Typ sady providerů vytvořené funkcí `createProviders`. */
export type Providers = ReturnType<typeof createProviders>;
