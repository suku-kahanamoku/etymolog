import type { APIRoute } from "astro";
import { locales, pages, publicPages, url } from "../config/routes";
export const GET: APIRoute = ({ site }) => {
  const privatePages = pages.filter((page) => !publicPages.includes(page));
  const paths = new Set(
    locales.flatMap((locale) =>
      privatePages.flatMap((page) => [
        url(locale, page),
        `${url(locale)}${page}/`,
      ]),
    ),
  );
  return new Response(
    `User-agent: *\nAllow: /\nDisallow: /api/\n${[...paths].map((path) => `Disallow: ${path}`).join("\n")}\nSitemap: ${new URL("/sitemap-index.xml", site)}\n`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
};
