import type { Dictionary } from "../providers/translations";
type Batch = {
  status: "queued" | "running" | "complete" | "partial" | "failed";
  total: number;
  completed: number;
  failed: number;
  processed: number;
};
export function useAdminSync(
  root: HTMLElement,
  t: Dictionary,
  api: (path: string, method?: string, body?: unknown) => Promise<unknown>,
  refresh: () => Promise<void>,
) {
  const button = root.querySelector<HTMLButtonElement>("[data-sync-start]");
  const panel = root.querySelector<HTMLElement>("[data-sync-panel]");
  const output = root.querySelector<HTMLElement>("[data-sync-status]");
  let visible = false,
    busy = false,
    timer: ReturnType<typeof setTimeout> | undefined;
  let reading = false;
  const active = (data: Batch | null) =>
    data?.status === "queued" || data?.status === "running";
  function render(data: Batch | null) {
    if (!button || !output) return;
    busy = active(data);
    button.disabled = busy;
    button.textContent = busy ? t.admin.syncRunning : t.admin.syncStart;
    output.textContent = data
      ? `${t.admin.syncStates[data.status]} · ${data.completed}/${data.total} · ${t.admin.syncProcessed}: ${data.processed} · ${t.admin.syncErrors}: ${data.failed}`
      : "";
  }
  async function poll() {
    if (!visible || reading || !button || !output) return;
    reading = true;
    try {
      const wasBusy = busy;
      render((await api("sync/status/")) as Batch | null);
      if (wasBusy && !busy) await refresh();
    } catch {
      output.textContent = t.admin.syncStatusError;
      // Failed polling must not automatically repeat the POST.
    } finally {
      reading = false;
      if (visible) timer = setTimeout(() => void poll(), 3000);
    }
  }
  button?.addEventListener("click", async () => {
    if (busy || !output) return;
    busy = true;
    button.disabled = true;
    clearTimeout(timer);
    output.textContent = t.admin.syncStarting;
    try {
      render((await api("sync/start/", "POST", {})) as Batch);
    } catch {
      busy = false;
      button.disabled = false;
      output.textContent = t.admin.syncStartError;
    }
    if (visible) timer = setTimeout(() => void poll(), 1000);
  });
  window.addEventListener("pagehide", () => {
    visible = false;
    clearTimeout(timer);
  });
  return {
    select(resource: string) {
      visible = resource === "sync-jobs";
      if (button) button.hidden = !visible;
      if (panel) panel.hidden = !visible;
      clearTimeout(timer);
      if (visible) void poll();
    },
  };
}
