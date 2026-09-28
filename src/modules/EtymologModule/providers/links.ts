export function safeWebUrl(
  value: string | null | undefined,
): string | undefined {
  if (!value) return;
  try {
    const parsed = new URL(value);
    if (
      ["https:", "http:"].includes(parsed.protocol) &&
      !parsed.username &&
      !parsed.password
    )
      return parsed.href;
  } catch {
    /* Invalid historical source link. */
  }
}
