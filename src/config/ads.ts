export type AdPosition = "top" | "left" | "right";
export type AdUnit =
  | { provider: "placeholder" }
  | { provider: "google"; client: string; slot: string }
  | { provider: "seznam"; zoneId: number; width: number; height: number };

// Public publisher IDs only. Replace a slot with a provider definition to enable it.
export const ads: Record<AdPosition, AdUnit> = {
  top: { provider: "seznam", zoneId: 429132, width: 728, height: 90 },
  left: { provider: "seznam", zoneId: 429135, width: 160, height: 600 },
  right: { provider: "seznam", zoneId: 429138, width: 160, height: 600 },
};
