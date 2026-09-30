import type { APIRoute } from "astro";
import { locales, pages, publicPages, url } from "../config/routes";

/**
 * `GET /robots.txt` – pravidla pro crawlery.
 *
 * Vstup: žádný (pouze konfigurace webu). Návrat: `text/plain` s povolením veřejných
 * stránek, zákazem API a neveřejných stránek ve všech jazycích a odkazem na sitemap.
 * @param context Kontext Astro API routy (použije `site` pro absolutní URL sitemapy).
 * @returns Odpověď `text/plain; charset=utf-8` s obsahem `robots.txt`.
 */
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
