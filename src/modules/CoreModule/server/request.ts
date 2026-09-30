import { HttpError } from "./errors";

/**
 * During local development Astro can serve the same site through localhost and
 * a configured *.localhost canonical domain. Only allow that loopback alias on
 * the same protocol and port; production always uses the configured site origin.
 */
export function expectedWriteOrigin(
  requestUrl: URL,
  siteUrl: URL | undefined,
  development: boolean,
): string {
  const canonical = siteUrl?.origin ?? requestUrl.origin;
  if (!development || !siteUrl) return canonical;
  if (
    siteUrl.hostname.endsWith(".localhost") &&
    ["localhost", "127.0.0.1", "[::1]"].includes(requestUrl.hostname) &&
    requestUrl.protocol === siteUrl.protocol &&
    requestUrl.port === siteUrl.port
  )
    return requestUrl.origin;
  return canonical;
}

/**
 * Ověří, že zápis pochází ze stejného originu jako stránka webu.
 *
 * Ochrana proti cross-site POST z neznámého webu; volá se v middlewaru pro
 * všechny zápisové metody pod `/api/`.
 * @param request Příchozí požadavek (hledá hlavičky `Origin` a `Sec-Fetch-Site`).
 * @param expectedOrigin Origin, proti kterému se porovnává.
 * @throws HttpError 403 `invalid_origin` při jiném originu nebo `cross-site` požadavku.
 */
export function assertSameOrigin(request: Request, expectedOrigin: string) {
  if (
    request.headers.get("origin") !== expectedOrigin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new HttpError(403, "invalid_origin");
}

/**
 * Načte a zvaliduje tělo požadavku objektem.
 *
 * Podporuje pouze JSON a formulářová data, čte tělo po dávkách a při překročení
 * limitu přeruší čtení, aby se nestahoval neomezeně velký payload.
 * @param request Požadavek s tělem (`application/json` nebo `x-www-form-urlencoded`).
 * @param maxBytes Maximální velikost těla v bajtech; výchozí 16 KiB.
 * @returns Objekt s políčkami požadavku.
 * @throws HttpError 415 pro nepodporovaný typ obsahu, 413 pro příliš velké tělo,
 * 422 pro chybějící tělo, neplatný JSON nebo neobjektové pole.
 */
export async function readFields(
  request: Request,
  maxBytes = 16_384,
): Promise<Record<string, unknown>> {
  const type = request.headers.get("content-type")?.split(";")[0];
  if (
    type !== "application/json" &&
    type !== "application/x-www-form-urlencoded"
  )
    throw new HttpError(415, "unsupported_media_type");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(422, "invalid_input");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new HttpError(413, "body_too_large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const text = new TextDecoder().decode(bytes);
  try {
    const data =
      type === "application/json"
        ? JSON.parse(text)
        : Object.fromEntries(new URLSearchParams(text));
    if (!data || typeof data !== "object" || Array.isArray(data))
      throw new Error();
    return data;
  } catch {
    throw new HttpError(422, "invalid_input");
  }
}
