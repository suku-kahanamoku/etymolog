import type { APIRoute } from "astro";
export const GET: APIRoute = ({ site }) =>
  new Response(
    `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin/\nDisallow: /account/\nDisallow: /login/\nDisallow: /*/admin/\nDisallow: /*/account/\nDisallow: /*/login/\nSitemap: ${new URL("/sitemap-index.xml", site)}\n`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
