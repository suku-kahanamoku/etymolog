import type { Dictionary } from "../providers/translations";
import type { SearchResult } from "../types";
import { nameUrl, url, type Locale } from "../../../config/routes";
import { singleResultUrl } from "../providers/searchNavigation";
export function useNameSearch() {
  const form = document.querySelector<HTMLFormElement>("[data-name-search]");
  if (!form) return;
  const t: Dictionary = JSON.parse(form.dataset.text!);
  const locale = form.dataset.locale as Locale;
  const results = document.querySelector<HTMLElement>("[data-results]")!;
  const status = results.querySelector<HTMLElement>("[data-search-status]")!;
  const items = results.querySelector<HTMLElement>("[data-result-items]")!;
  const pagination = results.querySelector<HTMLElement>(
    "[data-result-pagination]",
  )!;
  let active: AbortController | undefined;
  const element = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    text: string,
    className = "",
  ) => {
    const node = document.createElement(tag);
    node.textContent = text;
    node.className = className;
    return node;
  };
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const fields = new FormData(form);
    const q = String(fields.get("q") ?? "").trim();
    active?.abort();
    if (q.length < 2 || q.length > 100) {
      status.textContent = t.invalid;
      return;
    }
    const controller = new AbortController();
    active = controller;
    status.classList.remove("error-text");
    status.textContent = t.loading;
    results.setAttribute("aria-busy", "true");
    const params = new URLSearchParams({ q });
    try {
      const response = await fetch(`/api/etymolog/search/?${params}`, {
        signal: controller.signal,
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error();
      const data = payload.data as SearchResult;
      if (controller.signal.aborted) return;
      const target = singleResultUrl(data, locale);
      if (target) {
        window.location.assign(target);
        return;
      }
      items.replaceChildren();
      pagination.replaceChildren();
      results.querySelector("[data-empty]")?.remove();
      for (const item of data.items) {
        const card = element("a", "", "result-card");
        card.href = nameUrl(locale, item.id);
        const text = element("div", "");
        text.append(
          element(
            "span",
            `${t[item.kind]}${item.country_code ? ` · ${item.country_code}` : ""}`,
            "result-meta",
          ),
          element("h2", item.name),
        );
        if (item.summary)
          text.append(
            element(
              "p",
              item.summary.slice(0, 220) +
                (item.summary.length > 220 ? "…" : ""),
            ),
          );
        card.append(text);
        items.append(card);
      }
      if (!data.items.length) {
        const empty = element("p", t.empty, "notice");
        empty.dataset.empty = "";
        items.append(empty);
      }
      if (data.total > data.limit) {
        pagination.append(element("span", `${t.page} 1`));
        const next = element("a", `${t.next} →`, "text-link");
        params.set("page", "2");
        next.href = `${url(locale)}?${params}#results`;
        pagination.append(next);
        params.delete("page");
      }
      status.textContent = `${t.results}: ${data.total}`;
      history.replaceState(null, "", `${url(locale)}?${params}`);
    } catch {
      if (!controller.signal.aborted) {
        items.replaceChildren();
        pagination.replaceChildren();
        results.querySelector("[data-empty]")?.remove();
        status.classList.add("error-text");
        status.textContent = t.error;
      }
    } finally {
      if (active === controller) results.removeAttribute("aria-busy");
    }
  });
}
