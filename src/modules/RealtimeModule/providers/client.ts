export type ConnectionState =
  "idle" | "connecting" | "open" | "retrying" | "closed";
export interface RealtimeOptions {
  url: string;
  onMessage: (data: unknown) => void;
  onState?: (state: ConnectionState) => void;
  maxRetries?: number;
  // Use short-lived, server-issued tickets if your gateway needs authentication.
  // Never pass INTERNAL_API_KEY or the php-core bearer token in a URL/protocol.
  protocols?: string[];
}

export function createRealtimeClient(options: RealtimeOptions) {
  let socket: WebSocket | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let retries = 0;
  let stopped = true;
  const state = (value: ConnectionState) => options.onState?.(value);
  const connect = () => {
    if (
      !stopped &&
      (timer ||
        socket?.readyState === WebSocket.OPEN ||
        socket?.readyState === WebSocket.CONNECTING)
    )
      return;
    const url = new URL(options.url);
    if (!["wss:", "ws:"].includes(url.protocol) || url.username || url.password)
      throw new Error("Invalid WebSocket URL");
    if (
      typeof location !== "undefined" &&
      location.protocol === "https:" &&
      url.protocol !== "wss:"
    )
      throw new Error("HTTPS requires WSS");
    stopped = false;
    state("connecting");
    const current = new WebSocket(url, options.protocols);
    socket = current;
    current.onopen = () => {
      retries = 0;
      state("open");
    };
    current.onmessage = (event) => {
      let data: unknown;
      try {
        data = JSON.parse(String(event.data));
      } catch {
        return;
      }
      options.onMessage(data);
    };
    current.onclose = (event) => {
      if (stopped || socket !== current) return;
      // Authentication/policy closures must not cause an endless reconnect loop.
      if (
        [1000, 1008, 4001, 4003, 4401, 4403].includes(event.code) ||
        retries >= (options.maxRetries ?? 8)
      ) {
        state("closed");
        return;
      }
      state("retrying");
      const delay =
        Math.min(30_000, 1000 * 2 ** retries++) + Math.random() * 500;
      timer = setTimeout(() => {
        timer = undefined;
        connect();
      }, delay);
    };
  };
  return {
    connect,
    send(data: unknown): boolean {
      if (
        socket?.readyState !== WebSocket.OPEN ||
        socket.bufferedAmount > 1_000_000
      )
        return false;
      socket.send(JSON.stringify(data));
      return true;
    },
    close() {
      stopped = true;
      clearTimeout(timer);
      timer = undefined;
      if (socket) {
        socket.onclose = null;
        socket.onopen = null;
        socket.onmessage = null;
        socket.close(1000, "Client disconnected");
        socket = undefined;
      }
      state("closed");
    },
  };
}
