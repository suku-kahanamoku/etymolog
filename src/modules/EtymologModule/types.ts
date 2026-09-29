export interface NameRecord {
  id: number;
  name: string;
  kind: "given" | "surname";
  language: string | null;
  country_code: string | null;
  summary: string | null;
}
export interface SearchResult {
  items: NameRecord[];
  total: number;
  page: number;
  limit: number;
}
export interface Entry {
  id: number;
  type: string;
  title: string;
  body: string;
  source_url: string | null;
  certainty: string;
  language: string;
  region: string | null;
  year_from: number | null;
  year_to: number | null;
}
export interface Source {
  id: number;
  title: string;
  author: string | null;
  url: string | null;
  license: string | null;
  license_url: string | null;
  attribution: string | null;
}
export interface Citation {
  id: number;
  entry_id: number;
  source_id: number;
  url: string | null;
  locator: string | null;
  quotation: string | null;
}
export interface Variant {
  id: number;
  variant: string;
  relation: string;
  language: string | null;
  region: string | null;
  year_from: number | null;
  year_to: number | null;
  source_id: number | null;
  target_name_id: number | null;
}
export interface Occurrence {
  id: number;
  source_id: number;
  country_code: string;
  region: string | null;
  observed_year: number;
  observed_on: string | null;
  sex: string | null;
  measure: string | null;
  count: number | null;
  original_spelling: string | null;
  locator: string | null;
}
export interface CalendarDay {
  id: number;
  source_id: number;
  title: string;
  kind: string;
  date_kind: string;
  month: number | null;
  day: number | null;
  date_rule: string | null;
  source_url: string;
  locator: string | null;
  calendar_title: string;
  country_code: string;
  system: string;
  tradition: string;
  region: string | null;
  year_from: number | null;
  year_to: number | null;
}
export interface Dossier {
  name: NameRecord;
  entries: Entry[];
  citations: Citation[];
  variants: Variant[];
  occurrences: Occurrence[];
  calendar_days: CalendarDay[];
  sources: Source[];
}
export type AdminRecord = Record<string, string | number | null> & {
  id: number;
};
