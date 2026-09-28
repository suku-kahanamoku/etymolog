import { test as base, expect, type BrowserContext } from "@playwright/test";

export const cmpScriptUrl =
  "https://cdn.consentmanager.net/delivery/autoblocking/def3913d82dce.js";
export async function blockExternalCmp(context: BrowserContext) {
  // Other suites exercise the app without making real CMP/ad requests.
  await context.route(cmpScriptUrl, (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: "/* CMP unavailable in this test. */",
    }),
  );
}
export const test = base.extend({
  context: async ({ context }, use) => {
    await blockExternalCmp(context);
    await use(context);
  },
});
export { expect };
