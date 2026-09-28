import {
  PHP_API_BASE_URL,
  INTERNAL_API_KEY,
  FRONTEND_HOST,
} from "astro:env/server";
import { coreConfigFromEnv } from "../modules/CoreModule/server/config";
import { createCoreClient } from "../modules/CoreModule/server/php-core";
import { createAuthProvider } from "../modules/AuthModule/server/provider";

import { createEtymologProvider } from "../modules/EtymologModule/server/provider";
export function createProviders(token?: string) {
  const core = createCoreClient(
    coreConfigFromEnv({ PHP_API_BASE_URL, INTERNAL_API_KEY, FRONTEND_HOST }),
  );
  return {
    auth: createAuthProvider(core),
    etymolog: createEtymologProvider(core, token),
  };
}
export type Providers = ReturnType<typeof createProviders>;
