import { getText } from "./extractor.js";
import { attachIcon, setIconLoading, showToast } from "./ui.js";

const skippedInputTypes = new Set([
  "hidden",
  "button",
  "submit",
  "reset",
  "image",
  "file",
  "checkbox",
  "radio",
  "range",
  "color",
]);

function resolveFieldHost(el: Element | null): Element | null {
  if (!el || !(el instanceof Element)) return null;

  if (el instanceof HTMLTextAreaElement) return el;

  if (el instanceof HTMLInputElement) {
    const t = (el.type || "text").toLowerCase();
    if (skippedInputTypes.has(t)) return null;
    return el;
  }

  const ce = el.closest<HTMLElement>("[contenteditable=\"true\"]");
  return ce ?? null;
}

type SaveNoteResult = { url?: string; error?: string };

function sendSaveNote(text: string): Promise<SaveNoteResult> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: "SAVE_NOTE", payload: { text } },
      (response: SaveNoteResult | undefined) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(response ?? {});
      },
    );
  });
}

document.addEventListener(
  "focusin",
  (event) => {
    const host = resolveFieldHost(event.target as Element | null);
    if (!host) return;

    attachIcon(host, async () => {
      const text = getText(host).trim();
      if (!text) return;

      setIconLoading(true);
      try {
        let url: string;
        try {
          const res = await sendSaveNote(text);
          if (res.error) {
            showToast(res.error);
            return;
          }
          if (!res.url) {
            showToast("Could not save — no link returned.");
            return;
          }
          url = res.url;
        } catch {
          showToast("Could not save — try again.");
          return;
        }

        try {
          await navigator.clipboard.writeText(url);
        } catch {
          showToast("Saved, but clipboard copy failed.");
          return;
        }

        showToast("Saved to OneNote + link copied");
      } finally {
        setIconLoading(false);
      }
    });
  },
  true,
);
