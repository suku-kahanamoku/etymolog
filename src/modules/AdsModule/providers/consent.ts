/** Reklamní síť s vlastním souhlasem vendora v CMP. */
export type AdProvider = "google" | "seznam";

/** Odběratel změny souhlasu pro jednu reklamní síť. */
export type ConsentListener = (allowed: boolean) => void;

const listeners: Record<AdProvider, Set<ConsentListener>> = {
  google: new Set(),
  seznam: new Set(),
};

/** Bez výslovného souhlasu CMP se žádná síť nesmí načíst. */
const allowed: Record<AdProvider, boolean> = { google: false, seznam: false };

/**
 * Most mezi projektovou CMP a jednotlivými reklamními sítěmi.
 * Nevytváří souhlas ani TCF řetězec; pouze předává skutečné rozhodnutí CMP.
 */
export const consentProvider = {
  /** Vrací souhlas pouze pro zadanou síť. */
  isAllowed(provider: AdProvider) {
    return allowed[provider];
  },
  /** Uloží rozhodnutí CMP a upozorní odběratele dané sítě. */
  setProviderConsent(provider: AdProvider, value: boolean) {
    if (allowed[provider] === value) return;
    allowed[provider] = value;
    for (const listener of listeners[provider]) listener(value);
  },
  /** Přihlásí odběratele a ihned mu sdělí aktuální stav. */
  subscribeProvider(provider: AdProvider, listener: ConsentListener) {
    listeners[provider].add(listener);
    listener(allowed[provider]);
    return () => {
      listeners[provider].delete(listener);
    };
  },
};
