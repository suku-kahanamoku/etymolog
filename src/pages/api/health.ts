import type { APIRoute } from "astro";
// Liveness only; deliberately does not imply that php-core or its database is available.
export const GET: APIRoute = () =>
  Response.json({ success: true, data: { status: "ok" } });
