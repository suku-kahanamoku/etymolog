import { test } from "node:test";
import { strict as assert } from "node:assert";
import { todayNarrative } from "../src/modules/EtymologModule/providers/todayNarrative";
import type { Entry } from "../src/modules/EtymologModule/types";

function entry(type: string, language: string, body: string): Entry {
  return {
    id: 1,
    type,
    language,
    body,
    title: "Published text",
    source_url: null,
    certainty: "documented",
    region: null,
    year_from: null,
    year_to: null,
  };
}

test("today preview selects a readable etymology, then sourced mythology", () => {
  const entries = [
    entry("history", "cs", "Historical record"),
    entry("mythology", "cs", "Czech myth"),
    entry("etymology", "en", "English origin"),
    entry("etymology", "cs", "Czech origin"),
  ];
  assert.equal(todayNarrative(entries, "cs")?.body, "Czech origin");
  assert.equal(todayNarrative(entries, "en")?.body, "English origin");
  assert.equal(
    todayNarrative(
      entries.filter((item) => item.type !== "etymology"),
      "cs",
    )?.body,
    "Czech myth",
  );
  assert.equal(
    todayNarrative(
      [
        entry("history", "cs", "Historical record"),
        entry("etymology", "cs", "   "),
      ],
      "cs",
    ),
    undefined,
  );
});
