import type { Dictionary } from "../providers/translations";

/** Stav jedné dávky synchronizace tak, jak jej vrací php-core. */
type Batch = {
  status: "queued" | "running" | "stopping" | "stopped" | "complete" | "partial" | "failed";
  request_id: string;
  total: number;
  completed: number;
  failed: number;
  processed: number;
  step_index?: number;
  retry_at?: string | null;
};

/**
 * Obsluha spuštění a sledování synchronizace dat v administraci.
 *
 * Vedlejší účinky: spouští `POST sync/start/` nebo `POST sync/stop/`, poté každé 3 s dotazuje
 * `sync/status`, zapisuje stav do `[data-sync-status]`, volá `refresh()` po
 * dokončení dávky a při `pagehide` ukončí dotazování.
 * @param root Kořen administrace, ve kterém se hledají prvky UI.
 * @param t Slovník EtymologModule pro aktuální jazyk.
 * @param api Volající funkce pro požadavek na administrativní API.
 * @param refresh Obnovení seznamu záznamů po dokončení synchronizace.
 * @param onBusy Volitelný callback, který informuje publikaci o běžící synchronizaci.
 * @returns Objekt s `select`, které přepíná viditelnost panelu podle vybraného zdroje.
 */
export function useAdminSync(
  root: HTMLElement,
  t: Dictionary,
  api: (path: string, method?: string, body?: unknown) => Promise<unknown>,
  refresh: () => Promise<void>,
  onBusy: (busy: boolean) => void = () => {},
) {
  const button = root.querySelector<HTMLButtonElement>("[data-sync-start]");
  const panel = root.querySelector<HTMLElement>("[data-sync-panel]");
  const output = root.querySelector<HTMLElement>("[data-sync-status]");
  let visible = false,
    busy = false,
    timer: ReturnType<typeof setTimeout> | undefined;
  let reading = false;
  let pending = false;
  let current: Batch | null = null;
  /** @param data Stav dávky; `null` znamená žádnou rozpracovanou dávku. */
  const active = (data: Batch | null) =>
    data?.status === "queued" ||
    data?.status === "running" ||
    data?.status === "stopping";
  /**
   * Vypíše stav dávky a podle něj nastaví tlačítko a blokování publikace.
   * @param data Stav dávky vrácený backendem.
   * @returns `void`
   */
  function render(data: Batch | null) {
    if (!button || !output) return;
    current = data;
    busy = active(data);
    onBusy(busy);
    button.disabled =
      pending || data?.status === "stopping" || (busy && !data?.request_id);
    button.textContent =
      data?.status === "stopping"
        ? t.admin.syncStopping
        : busy
          ? t.admin.syncStop
          : t.admin.syncStart;
    output.textContent = data
      ? `${t.admin.syncStates[data.status]} · ${data.completed}/${data.total} · ${t.admin.syncProcessed}: ${data.processed} · ${t.admin.syncErrors}: ${data.failed}`
      : "";
    if (data && Number.isInteger(data.step_index)) {
      output.textContent += ` · ${t.admin.syncBatches}: ${data.step_index}`;
    }
    if (data?.status === "running" && data.retry_at) {
      const retry = new Date(data.retry_at.replace(" ", "T") + "Z");
      if (retry.getTime() > Date.now())
        output.textContent += ` · ${t.admin.syncRetryAt}: ${retry.toLocaleString(document.documentElement.lang)}`;
    }
  }
  /**
   * Načte stav synchronizace a naplánuje další dotaz.
   * @returns `void`; dotaz se přeskakuje, když panel není viditelný nebo už probíhá.
   */
  async function poll() {
    if (!visible || reading || !button || !output) return;
    reading = true;
    try {
      const wasBusy = busy;
      render((await api("sync/status/")) as Batch | null);
      if (wasBusy && !busy) await refresh();
    } catch {
      output.textContent = t.admin.syncStatusError;
      // Selhání dotazování nesmí automaticky zopakovat POST.
    } finally {
      reading = false;
      if (visible) timer = setTimeout(() => void poll(), 3000);
    }
  }
  button?.addEventListener("click", async () => {
    if (pending || !output || current?.status === "stopping") return;
    const stopping = busy;
    const requestId = current?.request_id;
    if (stopping && !requestId) return;
    pending = true;
    onBusy(true);
    button.disabled = true;
    clearTimeout(timer);
    output.textContent = stopping
      ? t.admin.syncStopping
      : t.admin.syncStarting;
    try {
      const state = (await api(
        stopping ? "sync/stop/" : "sync/start/",
        "POST",
        stopping ? { request_id: requestId } : {},
      )) as Batch;
      pending = false;
      render(state);
      if (stopping && !busy) await refresh();
    } catch {
      pending = false;
      render(current);
      output.textContent = stopping
        ? t.admin.syncStopError
        : t.admin.syncStartError;
    }
    if (visible) timer = setTimeout(() => void poll(), 1000);
  });
  window.addEventListener("pagehide", () => {
    visible = false;
    clearTimeout(timer);
  });
  return {
    /**
     * @param resource Aktuálně vybraný zdroj administrace.
     * @returns `void`; panel a tlačítko se zobrazí jen pro `sync-jobs` a spustí se dotazování.
     */
    select(resource: string) {
      visible = resource === "sync-jobs";
      if (button) button.hidden = !visible;
      if (panel) panel.hidden = !visible;
      clearTimeout(timer);
      if (visible) void poll();
    },
  };
}
