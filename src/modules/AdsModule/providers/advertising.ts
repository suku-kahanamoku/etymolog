import type { AdUnit } from "../../../config/ads";
import { consentProvider } from "./consent";

declare global {
  interface Window {
    /** Queue naplněná jednotkami AdSense po vložení značky `<ins class="adsbygoogle">`. */
    adsbygoogle?: Record<string, never>[];
    /** API českého SSP pro vykreslení jednotek podle `zoneId`. */
    sssp?: {
      getAds: (
        config: {
          zoneId: number;
          id: string;
          width: number;
          height: number;
        }[],
      ) => void;
    };
  }
}

/** Memoizace načtených skriptů, aby se značka vložila do stránky jen jednou. */
const scripts = new Map<string, Promise<void>>();

/**
 * Načte externí skript reklamního providera.
 * @param src URL skriptu poskytovatele.
 * @returns Promise splněná po načtení skriptu.
 * @throws Error `Ad script timeout` po 10 s nebo `Ad script unavailable` při chybě sítě.
 */
function loadScript(src: string): Promise<void> {
  const existing = scripts.get(src);
  if (existing) return existing;
  const pending = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.crossOrigin = "anonymous";
    const timeout = setTimeout(() => {
      script.remove();
      reject(new Error("Ad script timeout"));
    }, 10_000);
    script.onload = () => {
      clearTimeout(timeout);
      resolve();
    };
    script.onerror = () => {
      clearTimeout(timeout);
      script.remove();
      reject(new Error("Ad script unavailable"));
    };
    document.head.append(script);
  });
  scripts.set(src, pending);
  return pending;
}

/**
 * Vykreslí jednu reklamní jednotku do cílového kontejneru.
 * @param target Kontejner slotu, jehož obsah se nahradí jednotkou.
 * @param unit Definice jednotky z konfigurace webu.
 * @returns Promise po vložení jednotky.
 * @throws Error Při neplatné konfiguraci jednotky nebo chybějícím API SSP.
 * Bez souhlasu nebo při skrytém/s úzkým kontejnerem se jednotka přeskočí.
 */
async function renderAd(target: HTMLElement, unit: AdUnit) {
  if (unit.provider === "google") {
    if (!/^ca-pub-\d+$/.test(unit.client) || !/^\d+$/.test(unit.slot))
      throw new Error("Invalid ad configuration");
    await loadScript(
      `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${unit.client}`,
    );
    if (!consentProvider.advertising || !target.getClientRects().length) return;
    const ad = document.createElement("ins");
    ad.className = "adsbygoogle";
    ad.style.display = "block";
    ad.dataset.adClient = unit.client;
    ad.dataset.adSlot = unit.slot;
    ad.dataset.adFormat = "auto";
    ad.dataset.fullWidthResponsive = "true";
    target.replaceChildren(ad);
    (window.adsbygoogle ??= []).push({});
  } else if (unit.provider === "seznam") {
    if (!Number.isInteger(unit.zoneId) || unit.zoneId <= 0)
      throw new Error("Invalid ad configuration");
    await loadScript("https://ssp.seznam.cz/static/js/ssp.js");
    if (!consentProvider.advertising || !target.getClientRects().length) return;
    if (!window.sssp) throw new Error("Ad provider unavailable");
    if (target.clientWidth < unit.width) return;
    const zone = document.createElement("div");
    zone.id = `ssp-zone-${unit.zoneId}`;
    target.replaceChildren(zone);
    window.sssp.getAds([
      {
        zoneId: unit.zoneId,
        id: zone.id,
        width: unit.width,
        height: unit.height,
      },
    ]);
  }
}

/**
 * Napojí reklamní sloty na souhlas, viditelnost a rozměr viewportu.
 *
 * Bezpečnostní záměr: skripty třetích stran se nikdy nenačítají bez kladného
 * rozhodnutí CMP a jednotka se požaduje jen pro slot, který je viditelný
 * (nastavení `rootMargin` předběžně načítá těsně nad okrajem viewportu) a jehož
 * kontejner má dostatečnou šířku pro daný formát.
 * @param root Kořen, ve kterém se hledají sloty (`[data-ad-unit]`).
 * @returns Funkce uvolňující všechny pozorovatele a odběratele souhlasu.
 */
export function mountAds(root: ParentNode = document) {
  const slots = [...root.querySelectorAll<HTMLElement>("[data-ad-unit]")];
  const requested = new Set<HTMLElement>();
  let issued = false;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const target = entry.target as HTMLElement;
        if (
          !entry.isIntersecting ||
          !target.getClientRects().length ||
          !consentProvider.advertising ||
          requested.has(target)
        )
          continue;
        const unit = JSON.parse(target.dataset.adUnit ?? "{}") as AdUnit;
        if (unit.provider === "placeholder") continue;
        if (unit.provider === "seznam" && target.clientWidth < unit.width)
          continue;
        requested.add(target);
        issued = true;
        void renderAd(target, unit).catch(() => {
          target.dataset.adState = "unavailable";
        });
      }
    },
    { rootMargin: "100px" },
  );
  // Znovu prověříme sloty, které dosud nebyly požadovány, jakmile viewport umožní jejich formát.
  const resizeObserver = new ResizeObserver((entries) => {
    if (!consentProvider.advertising) return;
    for (const { target } of entries) {
      if (requested.has(target as HTMLElement)) continue;
      observer.unobserve(target);
      observer.observe(target);
    }
  });
  slots.forEach((slot) => resizeObserver.observe(slot));
  const unsubscribe = consentProvider.subscribe((allowed) => {
    observer.disconnect();
    if (allowed) slots.forEach((slot) => observer.observe(slot));
    // Kód třetí strany nelze bezpečně odebrat. Nový dokument začíná se stavem odepřeno.
    else if (issued) window.location.reload();
  });
  return () => {
    unsubscribe();
    observer.disconnect();
    resizeObserver.disconnect();
  };
}
