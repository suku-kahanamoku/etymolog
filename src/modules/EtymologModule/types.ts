/** Základní záznam jména (křestní jméno nebo příjmení). */
export interface NameRecord {
  /** Primární klíč záznamu. */
  id: number;
  /** Samotné jméno. */
  name: string;
  /** Druh záznamu: `given` (křestní) nebo `surname` (příjmení). */
  kind: "given" | "surname";
  /** Jazyk, ve kterém se jméno vyskytuje; `null`, pokud neznámý. */
  language: string | null;
  /** Kód země ve tvaru ISO 3166-1 alpha-2; `null`, pokud neznámý. */
  country_code: string | null;
  /** Krátký souhrn významu jména; `null`, pokud chybí. */
  summary: string | null;
}

/** Jedna stránka výsledků veřejného hledání v php-core. */
export interface SearchResult {
  /** Nalezené záznamy pro požadovanou stránku. */
  items: NameRecord[];
  /** Celkový počet nalezených záznamů. */
  total: number;
  /** Aktuální stránka (od 1). */
  page: number;
  /** Počet záznamů na stránku. */
  limit: number;
}

/** Výklad původu jména – jedna sekrace detailu. */
export interface Entry {
  /** Primární klíč výkladu. */
  id: number;
  /** Typ výkladu (např. `etymology`, `mythology`, `legend`). */
  type: string;
  /** Krátký nadpis výkladu. */
  title: string;
  /** Tělo výkladu v jazyce položky. */
  body: string;
  /** Odkaz na primární zdroj; `null`, pokud chybí. */
  source_url: string | null;
  /** Stupeň jistoty tvrzení (`documented`, `hypothesis`, …). */
  certainty: string;
  /** Jazyk textu výkladu. */
  language: string;
  /** Oblast původu; `null`, pokud neznámá. */
  region: string | null;
  /** Počátek platnosti roku; `null`, pokud neomezeno. */
  year_from: number | null;
  /** Konec platnosti roku; `null`, pokud neomezeno. */
  year_to: number | null;
}

/** Bibliografický zdroj citovaný v detailu jména. */
export interface Source {
  /** Primární klíč zdroje. */
  id: number;
  /** Název zdroje. */
  title: string;
  /** Autor nebo sestavovatel; `null`, pokud neznámý. */
  author: string | null;
  /** Odkaz na zdroj; `null`, pokud chybí. */
  url: string | null;
  /** Označení licence; `null`, pokud neuvedeno. */
  license: string | null;
  /** Odkaz na text licence; `null`, pokud chybí. */
  license_url: string | null;
  /** Požadovaná atribuce; `null`, pokud není třeba. */
  attribution: string | null;
}

/** Odkaz z výkladu na konkrétní místo ve zdroji. */
export interface Citation {
  /** Primární klíč citace. */
  id: number;
  /** Výklad, ke kterému citace patří. */
  entry_id: number;
  /** Zdroj, ze kterého se cituje. */
  source_id: number;
  /** Přímý odkaz na citované místo; `null`, pokud chybí. */
  url: string | null;
  /** Lokalizace v zdroji (strana, řádek); `null`, pokud chybí. */
  locator: string | null;
  /** Přímá citace textu; `null`, pokud chybí. */
  quotation: string | null;
}

/** Historická podoba jména nebo vlastní jméno. */
export interface Variant {
  /** Primární klíč podoby. */
  id: number;
  /** Vlastní podoba jména. */
  variant: string;
  /** Vztah k hlavnímu záznamu (např. `diminutive`, `translation`). */
  relation: string;
  /** Jazyk podoby; `null`, pokud neznámý. */
  language: string | null;
  /** Oblast výskytu; `null`, pokud neznámá. */
  region: string | null;
  /** Počátek platnosti; `null`, pokud neomezeno. */
  year_from: number | null;
  /** Konec platnosti; `null`, pokud neomezeno. */
  year_to: number | null;
  /** Zdroj, ze kterého podoba pochází; `null`, pokud neznámý. */
  source_id: number | null;
  /** Odkaz na jiný záznam jména, pokud podoba odkazuje na existující záznam. */
  target_name_id: number | null;
}

/** Historicky doložený výskyt jména v úředním záznamu. */
export interface Occurrence {
  /** Primární klíč výskytu. */
  id: number;
  /** Zdroj, ve kterém je výskyt doložen. */
  source_id: number;
  /** Kód země výskytu. */
  country_code: string;
  /** Oblast výskytu; `null`, pokud neznámá. */
  region: string | null;
  /** Rok pozorování. */
  observed_year: number;
  /** Přesné datum pozorování; `null`, pokud známo jen rok. */
  observed_on: string | null;
  /** Pohlaví v záznamu; `null`, pokud neuváděno. */
  sex: string | null;
  /** Měřítko (např. `count`); `null`, pokud neuváděno. */
  measure: string | null;
  /** Hodnota měřítka; `null`, pokud neuváděno. */
  count: number | null;
  /** Původní pravopis v prameni; `null`, pokud neuváděno. */
  original_spelling: string | null;
  /** Lokalizace v prameni; `null`, pokud chybí. */
  locator: string | null;
}

/** Jmenodenní nebo kalendářní tradice spojená s jménem. */
export interface CalendarDay {
  /** Primární klíč záznamu. */
  id: number;
  /** Zdroj tradice. */
  source_id: number;
  /** Název svátku nebo tradice. */
  title: string;
  /** Druh záznamu (např. `birthday`, `feast`). */
  kind: string;
  /** Způsob určení data (`fixed` nebo pravidlo). */
  date_kind: string;
  /** Měsíc; `null` u pohyblivých svátků. */
  month: number | null;
  /** Den v měsíci; `null` u pohyblivých svátků. */
  day: number | null;
  /** Textové pravidlo data (např. „první pátek po úplňku“); `null` u pevných dat. */
  date_rule: string | null;
  /** Odkaz na zdroj; u tradic povinný. */
  source_url: string;
  /** Lokalizace ve zdroji; `null`, pokud chybí. */
  locator: string | null;
  /** Název kalendáře, do kterého tradice patří. */
  calendar_title: string;
  /** Kód země tradice. */
  country_code: string;
  /** Kalendářní systém (např. `gregorian`). */
  system: string;
  /** Tradice, do které svátek patří. */
  tradition: string;
  /** Oblast tradice; `null`, pokud neznámá. */
  region: string | null;
  /** Počátek platnosti; `null`, pokud neomezeno. */
  year_from: number | null;
  /** Konec platnosti; `null`, pokud neomezeno. */
  year_to: number | null;
}

/**
 * Kompletní veřejný detail jednoho jména.
 *
 * Každá sekce je již projektovaná na záměrně vybraná pole (viz serverový
 * provider EtymologModule), takže se do prohlížeče nedostávají interní sloupce.
 */
export interface Dossier {
  /** Hlavní záznam jména. */
  name: NameRecord;
  /** Výklady původu a tradic. */
  entries: Entry[];
  /** Citace u výkladů. */
  citations: Citation[];
  /** Historické podoby jména. */
  variants: Variant[];
  /** Doložené výskyty v pramenech. */
  occurrences: Occurrence[];
  /** Kalendářní a jmenodenní tradice. */
  calendar_days: CalendarDay[];
  /** Zdroje citované v detailu. */
  sources: Source[];
}

/** Volný záznam z administrace; pole se řídí definicí zdroje v `config/resources.json`. */
export type AdminRecord = Record<string, string | number | null> & {
  /** Primární klíč záznamu. */
  id: number;
};

/** Published Czech calendar overview for the current Prague date. */
export interface TodayNamedays {
  date: string;
  timezone: string;
  proverb: {
    body: string;
    source_url: string | null;
    source_title: string;
    name_id: number | null;
  } | null;
  items: {
    name_id: number;
    name: string;
    source_url: string | null;
    source_title: string;
    source_fallback_url: string | null;
    calendar_title: string;
  }[];
}
