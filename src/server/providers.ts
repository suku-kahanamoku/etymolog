import {
  PHP_CORE_URL,
  PHP_CORE_API_KEY,
  PHP_CORE_TENANT_HOST,
} from "astro:env/server";
import { createCoreClient } from "../modules/CoreModule/server/php-core";
import { createAuthProvider } from "../modules/AuthModule/server/provider";

import { createEtymologProvider } from "../modules/EtymologModule/server/provider";
export function createProviders(token?: string) {
  const core = createCoreClient({
    baseUrl: PHP_CORE_URL ?? "",
    apiKey: PHP_CORE_API_KEY ?? "",
    tenantHost: PHP_CORE_TENANT_HOST ?? "",
  });
  return {
    auth: createAuthProvider(core),
    etymolog: createEtymologProvider(core, token),
  };
}
export type Providers = ReturnType<typeof createProviders>;
