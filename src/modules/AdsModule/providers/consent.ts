export type ConsentListener = (allowed: boolean) => void;
const listeners = new Set<ConsentListener>();
let advertising = false;

// Deliberately denied by default. The project's CMP calls this after resolving consent.
// This bridge is not a CMP and does not fabricate vendor consent strings.
export const consentProvider = {
  get advertising() {
    return advertising;
  },
  setAdvertising(allowed: boolean) {
    if (advertising === allowed) return;
    advertising = allowed;
    for (const listener of listeners) listener(allowed);
  },
  subscribe(listener: ConsentListener) {
    listeners.add(listener);
    listener(advertising);
    return () => {
      listeners.delete(listener);
    };
  },
};
