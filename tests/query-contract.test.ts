import assert from "node:assert/strict";
import test from "node:test";
import { createEtymologProvider } from "../src/modules/EtymologModule/server/provider";
import type { CoreClient } from "../src/modules/CoreModule/server/php-core";

test("public and admin lists use the shared php-core q/sort wire contract", async () => {
  const calls: Array<{ path: string; query?: Record<string, string> }> = [];
  const core = {
    request: async (
      path: string,
      options?: { query?: Record<string, string> },
    ) => {
      calls.push({ path, query: options?.query });
      return path.includes("/public/") ? { items: [], total: 0 } : [];
    },
  } as CoreClient;
  const provider = createEtymologProvider(core, "test-token");
  await provider.search("Anna", "surname", "2");
  assert.deepEqual(JSON.parse(calls[0].query!.q), {
    name: { $regex: "Anna" },
    kind: { $eq: "surname" },
  });
  assert.equal(calls[0].query!.page, "2");
  assert.equal("kind" in calls[0].query!, false);
  await provider.list(
    "names",
    "1",
    JSON.stringify({ name: { $regex: "Novák" } }),
  );
  assert.deepEqual(JSON.parse(calls[1].query!.sort), [{ id: -1 }]);
  assert.deepEqual(JSON.parse(calls[1].query!.q), {
    name: { $regex: "Novák" },
  });
});
