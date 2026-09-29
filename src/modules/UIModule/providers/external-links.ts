// Keep same-origin navigation, anchors and mail/phone links in their usual context.
export function externalLinkAttributes(href: string | undefined, pageUrl: URL) {
  if (!href) return {};
  try {
    const target = new URL(href, pageUrl);
    if (
      (target.protocol === "https:" || target.protocol === "http:") &&
      target.origin !== pageUrl.origin
    ) {
      return { target: "_blank", rel: "noopener noreferrer" };
    }
  } catch {
    // URL validation belongs to the caller; an invalid link is not external.
  }
  return {};
}
