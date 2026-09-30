/**
 * Odběratel změny stavu souhlasu.
 *
 * @param allowed `true`, když je povoleno zobrazování reklamy.
 * @returns Nic; odběratel pouze reaguje na změnu stavu.
 */
export type ConsentListener = (allowed: boolean) => void;

/** Registrovaní odběratelé stavu souhlasu (Sdílené okno pro jednotlivé moduly). */
const listeners = new Set<ConsentListener>();

/** Aktuální rozhodnutí o souhlasu; ve výchozím stavu výslovně `false`. */
let advertising = false;

/**
 * Most mezi projektovou CMP a reklamou.
 *
 * Ve výchozím stavu je souhlas výslovně odepírán. Projektová CMP zavolá
 * `setAdvertising()` až po vyhodnocení skutečného souhlasu. Tento most není
 * CMP a nevytváří žádné vendor souhlasové řetězce.
 */
export const consentProvider = {
  /**
   * Aktuální stav souhlasu; `true` pouze po kladném rozhodnutí CMP.
   * @returns `true`, když je povoleno zobrazování reklamy.
   */
  get advertising() {
    return advertising;
  },
  /**
   * Uloží rozhodnutí o souhlasu a upozorní všechny odběratele.
   * @param allowed Výsledek rozhodnutí CMP.
   * @throws Nevyvolá se pro nezměněnou hodnotu, aby se neposílaly duplicitní události.
   */
  setAdvertising(allowed: boolean) {
    if (advertising === allowed) return;
    advertising = allowed;
    for (const listener of listeners) listener(allowed);
  },
  /**
   * Přidá odběratele změn souhlasu a rovnou ho informuje o aktuálním stavu.
   * @param listener Funkce volaná při každé změně stavu.
   * @returns Funkce, která odběratele odpojí.
   */
  subscribe(listener: ConsentListener) {
    listeners.add(listener);
    listener(advertising);
    return () => {
      listeners.delete(listener);
    };
  },
};
