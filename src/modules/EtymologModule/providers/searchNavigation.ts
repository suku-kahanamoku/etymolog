import { nameUrl, type Locale } from "../../../config/routes";
import type { SearchResult } from "../types";

/** Only a single result in the entire search may bypass the selection list. */
export function singleResultUrl(result: SearchResult, locale: Locale) {
  const item = result.items[0];
  if (result.total === 1 && result.items.length === 1 && item)
    return nameUrl(locale, item.id);
}
