/** Životní cyklus spojení: stav připojení, opakování po výpadku a bezpečné ukončení. */
export type ConnectionState =
  "idle" | "connecting" | "open" | "retrying" | "closed";

/** Nastavení realtime klienta. */
export interface RealtimeOptions {
  /** URL WebSocketu (musí být `ws:` nebo `wss:`). */
  url: string;
  /** Volá se pro každou přijatou zprávu po úspěšném rozparsování JSON. */
  onMessage: (data: unknown) => void;
  /** Volitelný zpětný callback změny stavu spojení. */
  onState?: (state: ConnectionState) => void;
  /** Maximální počet automatických pokusů o reconnect; výchozí 8. */
  maxRetries?: number;
  // Použijte krátkodobé tickety vydané serverem, pokud gateway vyžaduje autentizaci.
  // Nikdy nepředávejte INTERNAL_API_KEY ani bearer token php-core v URL či protokolu.
  /** Volitelné subprotokoly předané konstruktoru `WebSocket`. */
  protocols?: string[];
}

/**
 * Vytvoří realtime klienta nad WebSocketem.
 *
 * Bezpečnostní záměr: URL se ověřuje (jen `ws:`/`wss:`, žádné přihlašovací
 * údaje, na HTTPS pouze `wss:`), data se odesílají pouze v otevřeném stavu
 * a uzavření z důvodů autentizace či politiky (`1000`, `1008`, `4001`, `4003`,
 * `4401`, `4403`) nespouští nekonečnou smyčku připojování.
 * @param options Nastavení klienta.
 * @returns Objekt s metodami `connect`, `send` a `close`.
 * @throws Error `Invalid WebSocket URL` nebo `HTTPS requires WSS` při `connect()`.
 */
export function createRealtimeClient(options: RealtimeOptions) {
  let socket: WebSocket | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let retries = 0;
  let stopped = true;
  /** @param value Nový stav spojení předávaný do `options.onState`. */
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
      // Uzavření kvůli autentizaci či politice nesmí spouštět nekonečnou smyčku připojování.
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
    /** Otevře spojení (nebo ho znovu otevře po výpadku). */
    connect,
    /**
     * Odešle zprávu jako JSON.
     * @param data Data k serializaci.
     * @returns `true`, pokud byla zpráva přijata k odeslání, jinak `false`.
     */
    send(data: unknown): boolean {
      if (
        socket?.readyState !== WebSocket.OPEN ||
        socket.bufferedAmount > 1_000_000
      )
        return false;
      socket.send(JSON.stringify(data));
      return true;
    },
    /** Zavíře spojení, zruší časovač reconnectu a vyvolá stav `closed`. */
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
