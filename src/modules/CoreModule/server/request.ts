import { HttpError } from "./errors";
export function assertSameOrigin(request: Request, expectedOrigin: string) {
  if (
    request.headers.get("origin") !== expectedOrigin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new HttpError(403, "invalid_origin");
}
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
