import test from "node:test";
import assert from "node:assert/strict";
import { coreConfigFromEnv } from "../src/modules/CoreModule/server/config";
import { createCoreClient } from "../src/modules/CoreModule/server/php-core";

test("FAnn environment names determine the API and fixed tenant without a separate tenant variable", async () => {
  const config = coreConfigFromEnv({
    PHP_API_BASE_URL: "http://127.0.0.1/php/php-core/api",
    INTERNAL_API_KEY: " test-secret ",
    FRONTEND_HOST: "http://etymolog.localhost:4321",
  });
  let called = false;
  const client = createCoreClient(config, async (input, options) => {
    called = true;
    assert.equal(
      String(input),
      "http://127.0.0.1/php/php-core/api/etymolog/public/names?q=Anna",
    );
    const headers = new Headers(options?.headers);
    assert.equal(headers.get("X-Forwarded-Host"), "etymolog.localhost");
    assert.equal(headers.get("X-Internal-Key"), "test-secret");
    assert.equal(headers.get("Authorization"), null);
    return Response.json({ success: true, data: { items: [] } });
  });
  await client.request("/etymolog/public/names", { query: { q: "Anna" } });
  assert.equal(called, true);
});

test("missing or invalid frontend origins cannot fall back to browser-controlled tenant headers", async () => {
  for (const frontend of [
    undefined,
    "",
    "etymolog.localhost",
    "file:///tmp/site",
    "https://user:secret@example.test",
    "https://example.test/path",
    "https://example.test/?tenant=other",
  ]) {
    const config = coreConfigFromEnv({
      PHP_API_BASE_URL: "http://127.0.0.1/php/php-core/api",
      INTERNAL_API_KEY: "test-secret",
      FRONTEND_HOST: frontend,
    });
    const client = createCoreClient(config, async () => {
      throw new Error("Invalid tenant must not reach the backend");
    });
    await assert.rejects(client.request("/auth/me"), /backend_not_configured/);
  }
});
