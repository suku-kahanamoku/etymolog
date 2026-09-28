import { defineConfig, envField } from "astro/config";
import node from "@astrojs/node";
import netlify from "@astrojs/netlify";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { loadEnv } from "vite";
import { locales, publicPages, url } from "./src/config/routes";

const env = loadEnv(
  process.env.NODE_ENV ?? "development",
  process.cwd(),
  "FRONTEND_HOST",
);
const site =
  process.env.FRONTEND_HOST ||
  env.FRONTEND_HOST ||
  "http://etymolog.localhost:4321";
export default defineConfig({
  site,
  output: "server",
  devToolbar: { enabled: false },
  adapter:
    process.env.NETLIFY === "true" ? netlify() : node({ mode: "standalone" }),
  server: { port: 4321 },
  trailingSlash: "always",
  i18n: {
    defaultLocale: "cs",
    locales: [...locales],
    routing: { prefixDefaultLocale: false },
  },
  env: {
    schema: {
      PHP_API_BASE_URL: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      INTERNAL_API_KEY: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      FRONTEND_HOST: envField.string({
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
  vite: { server: { strictPort: true }, plugins: [tailwindcss()] },
});
