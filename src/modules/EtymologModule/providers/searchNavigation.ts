import { nameUrl, type Locale } from "../../../config/routes";
import type { SearchResult } from "../types";

/** Pouze jediný výsledek v celém hledání smí obejít výběrový seznam. */
export function singleResultUrl(result: SearchResult, locale: Locale) {
  /**
   * @param result Výsledek hledání s položkami a celkovým počtem.
   * @param locale Jazyk, ve kterém má být výsledná adresa.
   * @returns URL detailu, pokud je výsledek jednoznačný, jinak `undefined`
   * (návštěvník zůstane na seznamu a vybíru si sám).
   */
  const item = result.items[0];
  if (result.total === 1 && result.items.length === 1 && item)
    return nameUrl(locale, item.id);
}
