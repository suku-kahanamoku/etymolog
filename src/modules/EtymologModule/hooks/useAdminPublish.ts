import type { Dictionary } from "../providers/translations";

/** Souhrn jedné hromadné publikace vrácený backendem. */
type Publication = {
  published: number;
  skipped: number;
  skipped_records: { resource: string; id: number; reason: string }[];
};

/**
 * Obsluha tlačítka „publikovat vše“ v administraci.
 *
 * Vedlejší účinky: mění text a stav tlačítka, zapisuje stav do
 * `[data-publish-status]`, vypisuje přeskočené záznamy a po dokončení volá
 * `refresh()`. Tlačítko se blokuje během běhu i během probíhající synchronizace.
 * @param root Kořen administrace, ve kterém se hledají prvky UI.
 * @param t Slovník EtymologModule pro aktuální jazyk.
 * @param api Volající funkce pro požadavek na administrativní API.
 * @param refresh Obnovení seznamu záznamů po dokončení akce.
 * @returns Objekt s `select` (zobrazení tlačítka jen pro `sync-jobs`)
 * a `setSyncBusy` (blokování tlačítka během synchronizace).
 */
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
  /** Zobrazí správný stav tlačítka podle probíhajících akcí. */
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
    /**
     * @param resource Aktuálně vybraný zdroj administrace.
     * @returns `void`; tlačítko je viditelné pouze u zdroje `sync-jobs`.
     */
    select(resource: string) {
      if (button) button.hidden = resource !== "sync-jobs";
    },
    /**
     * @param value `true`, když právě běží synchronizace.
     * @returns `void`; tlačítko publikace se při běžící synchronizaci zablokuje.
     */
    setSyncBusy(value: boolean) {
      syncBusy = value;
      render();
    },
  };
}
