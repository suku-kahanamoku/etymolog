import type { Locale } from "../../LangModule/config";
import type { Entry } from "../types";

/** Pick a published detail entry suitable for a short name-day preview. */
export function todayNarrative(
  entries: Entry[],
  locale: Locale,
): Entry | undefined {
  const usable = entries.filter(
    (entry) =>
      (entry.type === "etymology" || entry.type === "mythology") &&
      entry.body.trim().length > 0,
  );
  for (const language of [locale, "cs", undefined]) {
    for (const type of ["etymology", "mythology"]) {
      const match = usable.find(
        (entry) =>
          entry.type === type &&
          (language === undefined || entry.language === language),
      );
      if (match) return match;
    }
  }
  return undefined;
}
