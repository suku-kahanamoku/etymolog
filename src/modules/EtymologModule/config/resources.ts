import definitions from "./resources.json";

/**
 * Definice jednoho administračního zdroje (např. `names`, `entries`, `sync-jobs`).
 *
 * Zdrojový soubor `resources.json` je zároveň allowlist: backendová vrstva
 * odmítá klíče, které v `fields` nejsou, takže se přes API nedostanou
 * neznámé ani systémové sloupce.
 */
export interface ResourceDefinition {
  /** Klíče, které musí být při vytvoření záznamu vyplněné. */
  required: string[];
  /**
   * Editovatelná pole: `[typ, výchozí hodnota]`.
   * Typ může být `text:N`, `url`, `country`, `bool`, `date`, `id`, `year`,
   * `count`, `month`, `day`, `batch`, `interval`, `language` nebo `enum:…`.
   */
  fields: Record<string, [string, string | number | null]>;
  /** Systémová pole, která se v editoru jen zobrazí (nelze je měnit). */
  system?: string[];
  /** Pole s cizím klíčem: mapuje pole na cílový zdroj (např. `source_id` → `sources`). */
  references?: Record<string, string>;
  /** `true`, pokud je zdroj dostupný výhradně roli `admin`. */
  admin?: boolean;
}

/** Všechny zdroje podle klíče z `resources.json`. */
export const resources = definitions as unknown as Record<
  string,
  ResourceDefinition
>;

/** Klíče všech definovaných zdrojů (pořadí jako v `resources.json`). */
export const resourceKeys = Object.keys(resources);

/**
 * Bezpečné vyhledání definice zdroje.
 *
 * Používá `Object.hasOwn`, aby se zabránilo průchodu prototypem (např. klíč
 * `__proto__` se nesmí chovat jako existující zdroj).
 * @param key Klíč zdroje z URL administrace.
 * @returns Definici zdroje, nebo `undefined` když klíč není definován.
 */
export function resourceDefinition(key: string) {
  return Object.hasOwn(resources, key) ? resources[key] : undefined;
}
