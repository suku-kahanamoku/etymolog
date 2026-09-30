/** Umístění reklamního slotu v rozvržení stránky. */
export type AdPosition = "top" | "left" | "right";

/**
 * Reklamní jednotka jednoho slotu.
 *
 * - `placeholder` – slot se vykreslí, ale nic se nenačte (výchozí stav).
 * - `google` – jednotka AdSense (`client` ve tvaru `ca-pub-…`, číselný `slot`).
 * - `seznam` – jednotka SSP Seznam (`zoneId` a požadované rozměry `width`/`height`).
 */
export type AdUnit =
  | { provider: "placeholder" }
  | { provider: "google"; client: string; slot: string }
  | { provider: "seznam"; zoneId: number; width: number; height: number };

/** Vlastní účet AdSense; pro konkrétní pozici je ještě nutné ID jednotky `data-ad-slot`. */
export const googleAdSenseClient = "ca-pub-5191551009181826";

/**
 * Reklamní jednotky pro jednotlivé sloty rozvržení.
 *
 * Obsahuje pouze veřejné publikační ID. Slot se aktivuje nahrazením definicí
 * providera; skripty se načítají až po souhlasu CMP (viz
 * `AdsModule/providers/consent.ts`), takže bez souhlasu se nic nestáhne.
 */
export const ads: Record<AdPosition, AdUnit> = {
  top: { provider: "seznam", zoneId: 429132, width: 728, height: 90 },
  left: { provider: "seznam", zoneId: 429135, width: 160, height: 600 },
  right: { provider: "seznam", zoneId: 429138, width: 160, height: 600 },
};
