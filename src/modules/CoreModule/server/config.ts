import type { CoreConfig } from "./php-core";

/** Same server environment contract as nuxt/fann; never derive tenant from request headers. */
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
    // Public static pages still work without backend configuration.
  }
  return {
    baseUrl: env.PHP_API_BASE_URL ?? "",
    apiKey: env.INTERNAL_API_KEY?.trim() ?? "",
    tenantHost,
  };
}
