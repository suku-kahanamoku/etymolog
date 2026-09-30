import {
  createRealtimeClient,
  type RealtimeOptions,
} from "../providers/client";

// Hook nezávislý na frameworku: zavolejte jej z klientské komponenty a uvolnění proveďte při unmountu.
/**
 * Zapne realtime spojení a vrátí funkce pro odesílání zpráv a uvolnění.
 *
 * Vedlejší účinky: otevře WebSocket a registruje listener `pagehide`, který
 * spojení automaticky uzavře při opuštění stránky.
 * @param options Nastavení realtime klienta; `enabled: false` nebo chybějící `url` realtime vypne.
 * @returns Objekt s `send` a `cleanup`; při vypnutém realtime je `send` nefunkční (vrací `false`).
 * @throws Error Při neplatném URL WebSocketu (vyhodnoceno při otevírání spojení).
 */
export function useRealtime(options: RealtimeOptions & { enabled?: boolean }) {
  if (options.enabled === false || !options.url)
    return { send: (_: unknown) => false, cleanup() {} };
  const client = createRealtimeClient(options);
  client.connect();
  const cleanup = () => {
    client.close();
    window.removeEventListener("pagehide", cleanup);
  };
  window.addEventListener("pagehide", cleanup, { once: true });
  return { send: client.send, cleanup };
}
