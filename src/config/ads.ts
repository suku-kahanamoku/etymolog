export type AdPosition = "top" | "left" | "right";
export type AdUnit =
  | { provider: "placeholder" }
  | { provider: "google"; client: string; slot: string }
  | { provider: "seznam"; zoneId: number; width: number; height: number };

// Public publisher IDs only. Replace a slot with a provider definition to enable it.
export const ads: Record<AdPosition, AdUnit> = {
  top: { provider: "placeholder" },
  left: { provider: "placeholder" },
  right: { provider: "placeholder" },
};
