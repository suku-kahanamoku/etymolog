type SpeechState = "idle" | "loading" | "playing" | "paused";

const wordsToParts = (text: string): string[] => {
  const parts: string[] = [];
  for (const sentence of text
    .replace(/\s+/gu, " ")
    .trim()
    .split(/(?<=[.!?])\s+/u)) {
    let chunk = "";
    for (const word of sentence.split(/\s+/u)) {
      if (!word) continue;
      if (chunk && chunk.length + word.length + 1 > 240) {
        parts.push(chunk);
        chunk = "";
      }
      chunk = chunk ? `${chunk} ${word}` : word;
    }
    if (chunk) parts.push(chunk);
  }
  return parts;
};

/** Čte pouze viditelné nadpisy a výklady z jedné sekce detailu českým hlasem. */
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
  let voice: SpeechSynthesisVoice | null = null;
  let parts: string[] = [];
  let partIndex = 0;
  let run = 0;

  const findCzechVoice = () => {
    const voices = synthesis.getVoices();
    return (
      voices.find(
        (candidate) =>
          candidate.lang.toLowerCase().replace("_", "-") === "cs-cz",
      ) ??
      voices.find((candidate) => /^cs(?:[-_]|$)/i.test(candidate.lang)) ??
      null
    );
  };

  const waitForCzechVoice = (): Promise<SpeechSynthesisVoice | null> => {
    const ready = findCzechVoice();
    if (ready) return Promise.resolve(ready);
    return new Promise((resolve) => {
      const finish = (available: SpeechSynthesisVoice | null) => {
        window.clearTimeout(timeout);
        synthesis.removeEventListener("voiceschanged", onVoicesChanged);
        resolve(available);
      };
      const onVoicesChanged = () => {
        const available = findCzechVoice();
        if (available) finish(available);
      };
      const timeout = window.setTimeout(() => finish(findCzechVoice()), 2000);
      synthesis.addEventListener("voiceschanged", onVoicesChanged);
      onVoicesChanged();
    });
  };

  const setState = (button: HTMLButtonElement, state: SpeechState) => {
    button.dataset.speechState = state;
    const label =
      state === "loading"
        ? button.dataset.speechLoading
        : state === "playing"
          ? button.dataset.speechPause
          : state === "paused"
            ? button.dataset.speechResume
            : button.dataset.speechPlay;
    button.setAttribute("aria-label", label ?? "");
    button.title = label ?? "";
    button.setAttribute("aria-busy", String(state === "loading"));
  };

  const stop = () => {
    run++;
    synthesis.cancel();
    if (active) setState(active, "idle");
    active = null;
    voice = null;
    parts = [];
    partIndex = 0;
  };

  const showError = (button: HTMLButtonElement, message: string) => {
    stop();
    const feedback = button
      .closest("[data-speech-section]")
      ?.querySelector<HTMLElement>("[data-speech-feedback]");
    if (feedback) {
      feedback.textContent = message;
      feedback.hidden = false;
    }
  };

  const speakNext = (currentRun: number) => {
    if (currentRun !== run || !active || !voice) return;
    const part = parts[partIndex];
    if (!part) {
      stop();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(part);
    utterance.lang = "cs-CZ";
    utterance.voice = voice;
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
      showError(active!, active!.dataset.speechError ?? "");
    };
    try {
      synthesis.speak(utterance);
    } catch {
      showError(active, active.dataset.speechError ?? "");
    }
  };

  for (const button of buttons) {
    button.hidden = false;
    setState(button, "idle");
    button.addEventListener("click", async () => {
      if (active === button) {
        if (button.dataset.speechState === "loading") return;
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
      parts = wordsToParts(sectionLabel?.textContent ?? "");
      const summary = section.querySelector<HTMLElement>(
        ".dossier-heading .editorial-lead",
      );
      if (summary?.textContent)
        parts.push(...wordsToParts(summary.textContent));
      for (const entry of section.querySelectorAll<HTMLElement>(".entry")) {
        const title = entry.querySelector<HTMLElement>("h3");
        const body = entry.querySelector<HTMLElement>(".entry-body");
        if (title?.textContent) parts.push(...wordsToParts(title.textContent));
        if (body?.textContent) parts.push(...wordsToParts(body.textContent));
      }
      if (!parts.length) return;

      active = button;
      partIndex = 0;
      setState(button, "loading");
      const currentRun = run;
      const czechVoice = await waitForCzechVoice();
      if (currentRun !== run || active !== button) return;
      if (!czechVoice) {
        showError(button, button.dataset.speechNoCzechVoice ?? "");
        return;
      }
      voice = czechVoice;
      setState(button, "playing");
      speakNext(currentRun);
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
