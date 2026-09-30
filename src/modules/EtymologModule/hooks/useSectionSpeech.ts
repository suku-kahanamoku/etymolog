type SpeechPart = { text: string; lang: string };
type SpeechState = "idle" | "playing" | "paused";

const wordsToParts = (text: string, lang: string): SpeechPart[] => {
  const parts: SpeechPart[] = [];
  for (const sentence of text
    .replace(/\s+/gu, " ")
    .trim()
    .split(/(?<=[.!?])\s+/u)) {
    let chunk = "";
    for (const word of sentence.split(/\s+/u)) {
      if (!word) continue;
      if (chunk && chunk.length + word.length + 1 > 240) {
        parts.push({ text: chunk, lang });
        chunk = "";
      }
      chunk = chunk ? `${chunk} ${word}` : word;
    }
    if (chunk) parts.push({ text: chunk, lang });
  }
  return parts;
};

/** Čte pouze viditelné nadpisy a výklady z jedné sekce detailu. */
export function useSectionSpeech() {
  const buttons = document.querySelectorAll<HTMLButtonElement>(
    "[data-speech-button]",
  );
  if (!buttons.length) return;
  const synthesis = window.speechSynthesis;
  if (
    !synthesis ||
    typeof synthesis.speak !== "function" ||
    typeof window.SpeechSynthesisUtterance !== "function"
  )
    return;
  let active: HTMLButtonElement | null = null;
  let parts: SpeechPart[] = [];
  let partIndex = 0;
  let run = 0;

  const setState = (button: HTMLButtonElement, state: SpeechState) => {
    button.dataset.speechState = state;
    const label =
      state === "playing"
        ? button.dataset.speechPause
        : state === "paused"
          ? button.dataset.speechResume
          : button.dataset.speechPlay;
    button.setAttribute("aria-label", label ?? "");
    button.title = label ?? "";
  };

  const stop = () => {
    run++;
    synthesis.cancel();
    if (active) setState(active, "idle");
    active = null;
    parts = [];
    partIndex = 0;
  };

  const speakNext = (currentRun: number) => {
    if (currentRun !== run || !active) return;
    const part = parts[partIndex];
    if (!part) {
      stop();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(part.text);
    utterance.lang = part.lang === "cs" ? "cs-CZ" : part.lang;
    const language = utterance.lang.toLowerCase();
    const voices = synthesis.getVoices();
    const voice =
      voices.find((candidate) => candidate.lang.toLowerCase() === language) ??
      voices.find(
        (candidate) =>
          candidate.lang.toLowerCase().split("-")[0] === language.split("-")[0],
      );
    if (voice) utterance.voice = voice;
    utterance.onend = () => {
      if (currentRun !== run) return;
      partIndex++;
      speakNext(currentRun);
    };
    utterance.onerror = (event) => {
      if (currentRun !== run) return;
      if (event.error === "canceled" || event.error === "interrupted") {
        stop();
        return;
      }
      const button = active;
      stop();
      const feedback = button
        ?.closest("[data-speech-section]")
        ?.querySelector<HTMLElement>("[data-speech-feedback]");
      if (feedback) {
        feedback.textContent = button?.dataset.speechError ?? "";
        feedback.hidden = false;
      }
    };
    try {
      synthesis.speak(utterance);
    } catch {
      const button = active;
      stop();
      const feedback = button
        ?.closest("[data-speech-section]")
        ?.querySelector<HTMLElement>("[data-speech-feedback]");
      if (feedback) {
        feedback.textContent = button?.dataset.speechError ?? "";
        feedback.hidden = false;
      }
    }
  };

  for (const button of buttons) {
    button.hidden = false;
    setState(button, "idle");
    button.addEventListener("click", () => {
      if (active === button) {
        if (button.dataset.speechState === "playing") {
          synthesis.pause();
          setState(button, "paused");
        } else {
          synthesis.resume();
          setState(button, "playing");
        }
        return;
      }

      stop();
      const section = button.closest<HTMLElement>("[data-speech-section]");
      if (!section) return;
      const feedback = section.querySelector<HTMLElement>(
        "[data-speech-feedback]",
      );
      if (feedback) {
        feedback.hidden = true;
        feedback.textContent = "";
      }
      const sectionLabel = section.querySelector<HTMLElement>(".rule-title");
      const lang = document.documentElement.lang || "cs";
      parts = wordsToParts(sectionLabel?.textContent ?? "", lang);
      const summary = section.querySelector<HTMLElement>(
        ".dossier-heading .editorial-lead",
      );
      if (summary?.textContent)
        parts.push(...wordsToParts(summary.textContent, lang));
      for (const entry of section.querySelectorAll<HTMLElement>(".entry")) {
        const title = entry.querySelector<HTMLElement>("h3");
        const body = entry.querySelector<HTMLElement>(".entry-body");
        const entryLang = body?.lang || lang;
        if (title?.textContent)
          parts.push(...wordsToParts(title.textContent, entryLang));
        if (body?.textContent)
          parts.push(...wordsToParts(body.textContent, entryLang));
      }
      if (!parts.length) return;
      active = button;
      partIndex = 0;
      setState(button, "playing");
      speakNext(run);
    });
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && active?.dataset.speechState === "playing") {
      synthesis.pause();
      setState(active, "paused");
    }
  });
  window.addEventListener("pagehide", stop);
}
