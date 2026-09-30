import { consentProvider } from "./consent";

/** Obsluha události CMP bez dalších argumentů. */
type CmpEventHandler = () => void;

/** Volitelná funkce `window.__cmp` poskytovaná projektovou CMP. */
type CmpApi = (
  command: string,
  parameter?: unknown,
  callback?: unknown,
  async?: boolean,
) => unknown;

/** Část dat, která CMP vrací v `getCMPData` (TCF metadata a vendor souhlasy). */
interface CmpData {
  tcfcompliant?: boolean;
  tcfversion?: number;
  consentstring?: string;
  vendorConsents?: Record<string, boolean | number>;
  purposeConsents?: Record<string, boolean | number>;
}
declare global {
  interface Window {
    /** API projektové CMP propojené přes `ConsentScript.astro`. */
    __cmp?: CmpApi;
  }
}

/** Události CMP, na nichž se souhlas přepočítává. */
const events = [
  "settings",
  "consent",
  "consentapproved",
  "consentrejected",
  "consentcustom",
];

/** CMP vrací `true` i číslo `1`; obě hodnoty znamenají kladný souhlas. */
const granted = (value: unknown) => value === true || value === 1;

/**
 * Přečítá skutečné rozhodnutí projektové CMP a předává ho reklamnímu mostu.
 *
 * Vedlejší účinky: registruje CMP události, periodicky kontroluje načtení
 * `window.__cmp` a při události `astro:before-swap` zruší všechny listenery,
 * aby se neduplikovaly. Souhlas se nikdy nevytváří a zavření dialogu se nikdy
 * nepovažuje za schválení.
 *
 * @returns Funkci pro odpojení všech listenerů a zastavení časovače.
 */
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
        // CMP hlásí pro současné TCF EU nastavení 4; starší hodnota 2 zůstává podporována.
        (data.tcfversion === 2 || data.tcfversion === 4) &&
        typeof data.consentstring === "string" &&
        data.consentstring.length > 0 &&
        granted(data.vendorConsents?.["621"]) &&
        granted(data.purposeConsents?.["1"]);
      // Jakákoli změna rozhodnutí musí platit i pro vendor(y) již načtené SSP.
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
