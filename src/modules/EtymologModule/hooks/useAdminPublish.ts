import type { Dictionary } from "../providers/translations";
type Publication = {
  published: number;
  skipped: number;
  skipped_records: { resource: string; id: number; reason: string }[];
};
export function useAdminPublish(
  root: HTMLElement,
  t: Dictionary,
  api: (path: string, method?: string, body?: unknown) => Promise<unknown>,
  refresh: () => Promise<void>,
) {
  const button = root.querySelector<HTMLButtonElement>("[data-publish-all]");
  const output = root.querySelector<HTMLElement>("[data-publish-status]");
  const skipped = root.querySelector<HTMLElement>("[data-publish-skipped]");
  let publishing = false,
    syncBusy = false;
  function render() {
    if (!button) return;
    button.disabled = publishing || syncBusy;
    button.textContent = publishing ? t.admin.publishing : t.admin.publishAll;
  }
  button?.addEventListener("click", async () => {
    if (publishing || syncBusy || !output) return;
    publishing = true;
    render();
    output.textContent = t.admin.publishing;
    skipped?.replaceChildren();
    try {
      const result = (await api("publish-all/", "POST", {})) as Publication;
      output.textContent = `${t.admin.publishDone}: ${result.published}. ${t.admin.publishSkipped}: ${result.skipped}.`;
      if (result.skipped)
        output.textContent += ` ${t.admin.publishSkippedHelp}`;
      for (const item of result.skipped_records) {
        const row = document.createElement("li");
        row.textContent = `${(t.resources as Record<string, string>)[item.resource] ?? item.resource} #${item.id}: ${item.reason}`;
        skipped?.append(row);
      }
      await refresh();
    } catch {
      output.textContent = t.admin.publishError;
    } finally {
      publishing = false;
      render();
    }
  });
  return {
    select(resource: string) {
      if (button) button.hidden = resource !== "sync-jobs";
    },
    setSyncBusy(value: boolean) {
      syncBusy = value;
      render();
    },
  };
}
