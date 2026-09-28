import {
  createRealtimeClient,
  type RealtimeOptions,
} from "../providers/client";

// Framework-independent hook: call from a client component and invoke cleanup on unmount.
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
