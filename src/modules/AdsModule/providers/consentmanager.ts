import { consentProvider } from "./consent";

type CmpEventHandler = () => void;
type CmpApi = (
  command: string,
  parameter?: unknown,
  callback?: unknown,
  async?: boolean,
) => unknown;
interface CmpData {
  tcfcompliant?: boolean;
  tcfversion?: number;
  consentstring?: string;
  vendorConsents?: Record<string, boolean | number>;
  purposeConsents?: Record<string, boolean | number>;
}
declare global {
  interface Window {
    __cmp?: CmpApi;
  }
}

const events = [
  "settings",
  "consent",
  "consentapproved",
  "consentrejected",
  "consentcustom",
];
const granted = (value: unknown) => value === true || value === 1;

// Read the real CMP choice. Never create consent or treat closing the dialog as approval.
export function mountConsentManager() {
  let api: CmpApi | undefined;
  let previousString: string | undefined;
  let attempts = 0;
  let timer: ReturnType<typeof setInterval> | undefined;
  const sync: CmpEventHandler = () => {
    try {
      const currentApi = window.__cmp;
      const status = currentApi?.("consentStatus", null, null, false) as
        { consentExists?: boolean } | undefined;
      const data = currentApi?.("getCMPData", null, null, false) as
        CmpData | undefined;
      const allowed =
        status?.consentExists === true &&
        data?.tcfcompliant === true &&
        // CMP reports 4 for the current TCF EU setup; retain legacy value 2.
        (data.tcfversion === 2 || data.tcfversion === 4) &&
        typeof data.consentstring === "string" &&
        data.consentstring.length > 0 &&
        granted(data.vendorConsents?.["621"]) &&
        granted(data.purposeConsents?.["1"]);
      // Any changed choice must also take effect for vendors already loaded by SSP.
      if (
        previousString &&
        data?.consentstring !== previousString &&
        consentProvider.advertising
      ) {
        consentProvider.setAdvertising(false);
      }
      previousString = data?.consentstring;
      consentProvider.setAdvertising(allowed);
    } catch {
      consentProvider.setAdvertising(false);
    }
  };
  const connect = () => {
    if (api || typeof window.__cmp !== "function") return;
    api = window.__cmp;
    for (const event of events)
      api("addEventListener", [event, sync, false], null);
    sync();
    clearInterval(timer);
  };
  connect();
  if (!api) {
    timer = setInterval(() => {
      connect();
      if (++attempts >= 120) clearInterval(timer);
    }, 250);
  }
  window.addEventListener("load", connect);
  return () => {
    clearInterval(timer);
    window.removeEventListener("load", connect);
    for (const event of events)
      window.__cmp?.("removeEventListener", [event, sync, false], null);
  };
}
