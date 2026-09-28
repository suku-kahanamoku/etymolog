import type { AdUnit } from "../../../config/ads";
import { consentProvider } from "./consent";

declare global {
  interface Window {
    adsbygoogle?: Record<string, never>[];
    sssp?: {
      getAds: (config: {
        zoneId: number;
        id: string;
        width: number;
        height: number;
      }) => void;
    };
  }
}
const scripts = new Map<string, Promise<void>>();
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
    target.replaceChildren();
    window.sssp.getAds({
      zoneId: unit.zoneId,
      id: target.id,
      width: unit.width,
      height: unit.height,
    });
  }
}

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
        requested.add(target);
        issued = true;
        void renderAd(target, unit).catch(() => {
          target.dataset.adState = "unavailable";
        });
      }
    },
    { rootMargin: "100px" },
  );
  const unsubscribe = consentProvider.subscribe((allowed) => {
    observer.disconnect();
    if (allowed) slots.forEach((slot) => observer.observe(slot));
    // Third-party code cannot be unloaded safely. A fresh document starts denied.
    else if (issued) window.location.reload();
  });
  return () => {
    unsubscribe();
    observer.disconnect();
  };
}
