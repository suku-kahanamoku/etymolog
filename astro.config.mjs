import { defineConfig, envField } from "astro/config";
import node from "@astrojs/node";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { loadEnv } from "vite";
import { locales, publicPages, url } from "./src/config/routes";

const env = loadEnv(
  process.env.NODE_ENV ?? "development",
  process.cwd(),
  "PUBLIC_",
);
const site =
  process.env.PUBLIC_SITE_URL || env.PUBLIC_SITE_URL || "http://localhost:4321";
export default defineConfig({
  site,
  output: "server",
  devToolbar: { enabled: false },
  adapter: node({ mode: "standalone" }),
  server: { port: 4321 },
  trailingSlash: "always",
  i18n: {
    defaultLocale: "cs",
    locales: [...locales],
    routing: { prefixDefaultLocale: false },
  },
  env: {
    schema: {
      PHP_CORE_URL: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      PHP_CORE_API_KEY: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      PHP_CORE_TENANT_HOST: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
    },
  },
  integrations: [
    sitemap({
      customPages: locales.flatMap((locale) =>
        publicPages.map((page) => new URL(url(locale, page), site).href),
      ),
      filter: (value) =>
        locales.some((locale) =>
          publicPages.some(
            (page) => new URL(url(locale, page), site).href === value,
          ),
        ),
    }),
  ],
  vite: { plugins: [tailwindcss()] },
});
