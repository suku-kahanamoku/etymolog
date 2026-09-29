import { test } from "node:test";
import assert from "node:assert/strict";
import { singleResultUrl } from "../src/modules/EtymologModule/providers/searchNavigation";
import type { SearchResult } from "../src/modules/EtymologModule/types";
const result: SearchResult = {
  items: [
    {
      id: 12,
      name: "Anna",
      kind: "given",
      language: null,
      country_code: null,
      summary: null,
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
};
test("single-result navigation keeps the chosen locale", () => {
  assert.equal(singleResultUrl(result, "cs"), "/jmeno/12/");
  assert.equal(singleResultUrl(result, "en"), "/en/name/12/");
  assert.equal(singleResultUrl(result, "de"), "/de/name/12/");
});
test("a lone row on the final page of a larger search never redirects", () => {
  assert.equal(
    singleResultUrl({ ...result, total: 21, page: 2 }, "cs"),
    undefined,
  );
  assert.equal(
    singleResultUrl({ ...result, total: 0, items: [] }, "cs"),
    undefined,
  );
  assert.equal(singleResultUrl({ ...result, items: [] }, "cs"), undefined);
});
