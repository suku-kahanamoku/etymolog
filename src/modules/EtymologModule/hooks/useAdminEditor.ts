import { useAdminPublish } from "./useAdminPublish";
import { useAdminSync } from "./useAdminSync";
import { resources, resourceDefinition } from "../config/resources";
import type { Dictionary } from "../providers/translations";
import type { AdminRecord } from "../types";
/**
 * Tablekový administrativní editor EtymologModule.
 *
 * Zajišťuje výběr zdroje, filtrování, stránkování, úpravu záznamů i zobrazení
 * důkazních podkladů. Data ovládá výhradně přes veřejné API administrace
 * (`/api/admin/etymolog/…`), oprávnění a role uživatele ověřuje server.
 * Vedlejší účinky: přepisuje obsah tabulky, panelu editoru a panelu důkazů,
 * zapisuje stavové texty a potvrzuje mazání přes `confirm()`.
 * @returns `void`; bez kořene `[data-admin]` se hook tiše ukončí.
 */
export function useAdminEditor() {
  // Celý editor je jeden vanilla DOM island: načte konfiguraci ze slovníku
  // vloženého do `data-text`, stav si drží v uzavřených proměnných a komunikuje
  // s backendem výhradně přes `/api/admin/etymolog/`.
  const found = document.querySelector<HTMLElement>("[data-admin]");
  if (!found) return;
  const root: HTMLElement = found;
  const t: Dictionary = JSON.parse(root.dataset.text!);
  const isAdmin = root.dataset.adminRole === "admin";
  /**
   * Vyhledá potomka uvnitř kořene administrace.
   * @param s Selektor potomka.
   * @returns Nalezený element (při chybějícím selektoru vyhodí chybu).
   */
  const select = <T extends Element>(s: string) => root.querySelector<T>(s)!;
  const status = select<HTMLElement>("[data-admin-status]");
  const editorStatus = select<HTMLElement>("[data-editor-status]");
  const rows = select<HTMLElement>("[data-admin-rows]");
  const dialog = select<HTMLDialogElement>("[data-editor]");
  const form = select<HTMLFormElement>("[data-edit-form]");
  const fields = select<HTMLElement>("[data-editor-fields]");
  const evidence = select<HTMLDialogElement>("[data-evidence]");
  // Stav seznamu; `requestId` slouží k zahození odpovědí ze starších požadavků.
  let resource = "names",
    page = 1,
    query = "",
    editId: number | undefined,
    requestId = 0,
    saving = false,
    evidencePage = 1,
    evidencePath = "";
  /**
   * @param key Klíč pole podle definice zdroje.
   * @returns Překlad názvu pole, nebo samotný klíč jako zálohu.
   */
  const label = (key: string) =>
    (t.fields as Record<string, string>)[key] ?? key;
  /**
   * Vytvoří element s textem a volitelnou třídou (bez vložení do DOM).
   * @param tag Název HTML značky.
   * @param text Textový obsah.
   * @param className Třída pro `class`.
   * @returns Nový element.
   */
  const element = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    text = "",
    className = "",
  ) => {
    const e = document.createElement(tag);
    e.textContent = text;
    e.className = className;
    return e;
  };
  /**
   * @param error Chyba z API nebo výjimka.
   * @returns Text chyby pro uživatele, nebo obecná hláška.
   */
  const errorText = (error: unknown) =>
    error instanceof Error ? error.message : t.admin.error;
  /**
   * Volání administrativního API s překladem stavů na uživatelské hlášky.
   * @param path Cesta za `/api/admin/etymolog/`.
   * @param method HTTP metoda; výchozí `GET`.
   * @param body Volitelné JSON tělo.
   * @returns Rozbalená data z odpovědi `{ success, data }`.
   * @throws Error S přeloženou hláškou pro 401, 403, 409, 422 a ostatní chyby.
   */
  async function api(
    path: string,
    method = "GET",
    body?: unknown,
  ): Promise<unknown> {
    const response = await fetch(`/api/admin/etymolog/${path}`, {
      method,
      headers:
        body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const messages: Record<number, string> = {
      401: t.admin.unauthorized,
      403: t.admin.forbidden,
      409: t.admin.conflict,
      422: t.admin.validation,
    };
    if (!response.ok)
      throw new Error(messages[response.status] ?? t.admin.error);
    const payload = await response.json();
    if (!payload.success) throw new Error(t.admin.error);
    return payload.data;
  }
  const publish = useAdminPublish(root, t, api, () => load());
  const sync = useAdminSync(
    root,
    t,
    api,
    () => (resource === "sync-jobs" ? load() : Promise.resolve()),
    publish.setSyncBusy,
  );
  /**
   * Vytvoří akční tlačítko tabulky, které samo hlídá svůj stav během běhu.
   * @param text Text tlačítka.
   * @param run Akce spuštěná po kliknutí; chyby se zobrazí ve stavovém textu.
   * @returns Element tlačítka (bez vložení do DOM).
   */
  function button(text: string, run: () => void | Promise<void>) {
    const b = element("button", text, "btn btn-sm btn-outline");
    b.type = "button";
    b.addEventListener("click", async () => {
      b.disabled = true;
      try {
        await run();
      } catch (error) {
        status.textContent = errorText(error);
      } finally {
        b.disabled = false;
      }
    });
    return b;
  }
  /**
   * Otevře a naplní panel důkazních podkladů (importy, externí záznamy, běhy).
   * @param path Cesta podakce k jednomu záznamu.
   * @param reset `true` při prvním otevření (resetuje stránkování a otevře dialog).
   * @returns `void`; načtená data se vypíší jako formátovaný JSON.
   */
  async function showEvidence(path: string, reset = true) {
    if (reset) {
      evidencePath = path;
      evidencePage = 1;
      evidence.showModal();
    }
    const output = select<HTMLElement>("[data-evidence-content]");
    output.textContent = t.admin.loading;
    try {
      const data = await api(`${evidencePath}/?page=${evidencePage}`);
      output.textContent = JSON.stringify(data, null, 2);
      select<HTMLButtonElement>("[data-evidence-next]").disabled =
        !Array.isArray(data) ||
        data.length < 20 ||
        !evidencePath.endsWith("/runs");
    } catch (error) {
      output.textContent = errorText(error);
    }
    select<HTMLButtonElement>("[data-evidence-prev]").disabled =
      evidencePage <= 1;
    select<HTMLElement>("[data-evidence-page]").textContent =
      `${t.page} ${evidencePage}`;
  }
  /**
   * Načte aktuální stránku záznamů a překreslí tabulku.
   * @param message Volitelný stavový text (např. „uloženo“); prázdný znamená výchozí hlášku.
   * @returns `void`; starší otevřené požadavky se zahodí, chyby se vypíší do stavu.
   */
  async function load(message = "") {
    const revision = ++requestId;
    rows.replaceChildren();
    status.textContent = t.admin.loading;
    root.setAttribute("aria-busy", "true");
    const selectedResource = resource;
    try {
      const data = (await api(
        `${resource}/?${new URLSearchParams({ page: String(page), q: query })}`,
      )) as AdminRecord[];
      if (revision !== requestId) return;
      rows.replaceChildren();
      for (const record of data) {
        const row = element("tr");
        row.append(
          element("td", String(record.id)),
          element(
            "td",
            String(
              record.name ??
                record.title ??
                record.variant ??
                `${record.entry_id ?? record.name_id ?? ""} → ${record.source_id ?? record.name_id ?? record.calendar_id ?? ""}`,
            ),
          ),
          element(
            "td",
            selectedResource === "sync-jobs"
              ? [
                  Number(record.enabled) ? "" : t.admin.syncDisabled,
                  (t.admin.jobStates as Record<string, string>)[
                    String(record.last_status ?? "pending")
                  ] ?? String(record.last_status),
                  record.last_error === "upstream_rate_limited"
                    ? t.admin.syncRateLimited
                    : String(record.last_error ?? ""),
                ]
                  .filter(Boolean)
                  .join(" · ")
              : Object.hasOwn(record, "published")
                ? Number(record.published)
                  ? t.admin.published
                  : t.admin.draft
                : Object.hasOwn(record, "reviewed")
                  ? `${label("reviewed")}: ${record.reviewed}`
                  : "—",
          ),
        );
        const actions = element("td", "", "row-actions");
        actions.append(button(t.admin.edit, () => edit(record.id)));
        actions.append(
          button(t.admin.delete, async () => {
            if (!confirm(`${t.admin.confirm} (#${record.id})`)) return;
            await api(`${selectedResource}/${record.id}/`, "DELETE");
            await load(t.admin.deleted);
          }),
        );
        const routes: Record<string, string[]> = {
          names: ["imports", "external-records"],
          entries: ["imports"],
          occurrences: ["imports"],
          "calendar-days": ["imports"],
          "sync-jobs": ["runs"],
        };
        for (const action of routes[selectedResource] ?? [])
          actions.append(
            button(
              action === "runs"
                ? t.admin.runs
                : `${t.admin.provenance}${action === "external-records" ? " II" : ""}`,
              () => showEvidence(`${selectedResource}/${record.id}/${action}`),
            ),
          );
        if (isAdmin && selectedResource === "sync-jobs")
          actions.append(
            button(t.admin.reset, async () => {
              if (!confirm(t.admin.resetConfirm)) return;
              await api(`${selectedResource}/${record.id}/reset/`, "POST", {});
              await load(t.admin.saved);
            }),
          );
        if (isAdmin)
          actions.append(
            button(t.admin.purge, async () => {
              if (!confirm(`${t.admin.purgeConfirm} (#${record.id})`)) return;
              await api(
                `${selectedResource}/${record.id}/?force=true`,
                "DELETE",
              );
              await load(t.admin.deleted);
            }),
          );
        row.append(actions);
        rows.append(row);
      }
      status.textContent = message || (data.length ? "" : t.admin.empty);
      select<HTMLElement>("[data-admin-page]").textContent =
        `${t.page} ${page}`;
      select<HTMLButtonElement>("[data-prev]").disabled = page <= 1;
      select<HTMLButtonElement>("[data-next]").disabled = data.length < 20;
    } catch (error) {
      if (revision === requestId) {
        rows.replaceChildren();
        status.textContent = errorText(error);
      }
    } finally {
      if (revision === requestId) root.removeAttribute("aria-busy");
    }
  }
  /**
   * Otevře dialog editoru a sestaví formulář podle definice zdroje.
   * @param id ID upravovaného záznamu; bez hodnoty se vytváří nový záznam.
   * @returns `void`; systémová pole se pouze zobrazí, nelze je měnit.
   */
  async function edit(id?: number) {
    const currentResource = resource;
    const definition = resourceDefinition(currentResource)!;
    const record = id
      ? ((await api(`${currentResource}/${id}/`)) as AdminRecord)
      : ({} as AdminRecord);
    if (resource !== currentResource) return;
    editId = id;
    fields.replaceChildren();
    editorStatus.textContent = "";
    select<HTMLElement>("#editor-title").textContent =
      `${id ? `${t.admin.edit} #${id}` : t.admin.new} · ${(t.resources as Record<string, string>)[resource]}`;
    for (const [key, [type, defaultValue]] of Object.entries(
      definition.fields,
    )) {
      const required = definition.required.includes(key),
        value = Object.hasOwn(record, key) ? record[key] : defaultValue;
      const wrap = element("div", "", "editor-field");
      const caption = element("label", `${label(key)}${required ? " *" : ""}`);
      caption.htmlFor = `edit-${key}`;
      let control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      const options = type.startsWith("enum:")
        ? type.slice(5).split(",")
        : type === "language"
          ? ["cs", "sk", "pl", "uk", "de", "en", "fr"]
          : null;
      if (options) {
        const s = element("select");
        if (defaultValue === null) s.append(new Option(t.admin.optional, ""));
        for (const option of options)
          s.append(
            new Option(
              (t.types as Record<string, string>)[option] ??
                (t.certainty as Record<string, string>)[option] ??
                (t.values as Record<string, string>)[option] ??
                (option === "given"
                  ? t.given
                  : option === "surname"
                    ? t.surname
                    : option),
              option,
            ),
          );
        s.value = String(value ?? "");
        control = s;
      } else if (type.startsWith("text:") && Number(type.slice(5)) > 1000) {
        const area = element("textarea");
        area.rows = key === "body" || key === "quotation" ? 9 : 4;
        area.maxLength = Number(type.slice(5));
        area.value = String(value ?? "");
        control = area;
        wrap.classList.add("wide");
      } else {
        const input = element("input");
        input.type =
          type === "bool"
            ? "checkbox"
            : type === "date"
              ? "date"
              : type === "url"
                ? "url"
                : [
                      "id",
                      "year",
                      "count",
                      "month",
                      "day",
                      "batch",
                      "interval",
                    ].includes(type)
                  ? "number"
                  : "text";
        if (type === "bool") input.checked = !!Number(value);
        else input.value = String(value ?? "");
        if (type.startsWith("text:")) input.maxLength = Number(type.slice(5));
        if (type === "country") input.maxLength = 2;
        if (input.type === "number") {
          input.step = "1";
          if (type !== "year") input.min = type === "count" ? "0" : "1";
          if (type === "month") input.max = "12";
          if (type === "day") input.max = "31";
        }
        control = input;
      }
      control.id = `edit-${key}`;
      control.name = key;
      if (type !== "bool") control.required = required;
      wrap.append(caption, control);
      const target = definition.references?.[key];
      if (target) {
        const hint = element(
          "small",
          `${t.admin.reference}: ${(t.resources as Record<string, string>)[target]}`,
        );
        wrap.append(hint);
      }
      fields.append(wrap);
    }
    select<HTMLElement>("[data-system-values]").textContent = JSON.stringify(
      Object.fromEntries(
        Object.entries(record).filter(
          ([key]) => !Object.hasOwn(definition.fields, key),
        ),
      ),
      null,
      2,
    );
    select<HTMLElement>("[data-system]").hidden = !id;
    dialog.showModal();
  }
  /**
   * Uloží formulář editoru (`POST` pro nový záznam, `PATCH` pro existující).
   *
   * @returns `void`; během ukládání se formulář zamkne proti opakovanému odeslání.
   */
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (saving) return;
    saving = true;
    const definition = resources[resource],
      body: Record<string, unknown> = {};
    const values = new FormData(form);
    for (const [key, [type, defaultValue]] of Object.entries(
      definition.fields,
    )) {
      const value = String(values.get(key) ?? "");
      body[key] =
        type === "bool"
          ? values.has(key)
            ? 1
            : 0
          : value === "" && defaultValue === null
            ? null
            : [
                  "id",
                  "year",
                  "count",
                  "month",
                  "day",
                  "batch",
                  "interval",
                ].includes(type)
              ? Number(value)
              : value;
    }
    const submit = form.querySelector<HTMLButtonElement>('[type="submit"]')!;
    submit.disabled = true;
    editorStatus.textContent = t.admin.loading;
    try {
      await api(
        `${resource}${editId ? `/${editId}` : ""}/`,
        editId ? "PATCH" : "POST",
        body,
      );
      dialog.close();
      await load(t.admin.saved);
    } catch (error) {
      editorStatus.textContent = errorText(error);
    } finally {
      submit.disabled = false;
      saving = false;
    }
  });
  // Přepnutí zdroje resetuje stránku, filtr i vybranou podakci a načte nová data.
  root.querySelectorAll<HTMLButtonElement>("[data-resource]").forEach((b) =>
    b.addEventListener("click", () => {
      resource = b.dataset.resource!;
      sync.select(resource);
      publish.select(resource);
      page = 1;
      query = "";
      select<HTMLInputElement>("#admin-filter").value = "";
      select<HTMLElement>("[data-resource-title]").textContent = (
        t.resources as Record<string, string>
      )[resource];
      root
        .querySelectorAll("[data-resource]")
        .forEach((item) =>
          item.setAttribute("aria-current", String(item === b)),
        );
      void load();
    }),
  );
  select<HTMLButtonElement>('[data-resource="names"]').setAttribute(
    "aria-current",
    "true",
  );
  select("[data-create]").addEventListener("click", () => {
    void edit().catch((error) => (status.textContent = errorText(error)));
  });
  root
    .querySelectorAll("[data-close]")
    .forEach((b) => b.addEventListener("click", () => dialog.close()));
  select("[data-refresh]").addEventListener("click", () => void load());
  select<HTMLFormElement>("[data-filter]").addEventListener(
    "submit",
    (event) => {
      event.preventDefault();
      page = 1;
      query = select<HTMLInputElement>("#admin-filter").value.trim();
      void load();
    },
  );
  select("[data-prev]").addEventListener("click", () => {
    if (page > 1) {
      page--;
      void load();
    }
  });
  select("[data-next]").addEventListener("click", () => {
    page++;
    void load();
  });
  select("[data-evidence-close]").addEventListener("click", () =>
    evidence.close(),
  );
  select("[data-evidence-prev]").addEventListener("click", () => {
    if (evidencePage > 1) {
      evidencePage--;
      void showEvidence(evidencePath, false);
    }
  });
  select("[data-evidence-next]").addEventListener("click", () => {
    evidencePage++;
    void showEvidence(evidencePath, false);
  });
  void load();
}
