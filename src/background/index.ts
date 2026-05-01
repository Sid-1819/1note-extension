import {
  DEFAULT_NOTE_EXPIRES_AFTER_MINUTES,
  DEFAULT_NOTE_MAX_VIEWS,
  NOTE_EXPIRES_AFTER_MINUTES_KEY,
  NOTE_MAX_VIEWS_KEY,
} from "../defaults.js";

type SaveNoteMessage = {
  type: "SAVE_NOTE";
  payload: { text: string };
};

type SaveNoteResponse = { url: string } | { error: string };

function apiBase(): string {
  const raw = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

function messageFromBody(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const m = (body as { message?: unknown }).message;
  if (typeof m === "string" && m.trim()) return m;
  if (Array.isArray(m) && m.every((x) => typeof x === "string")) {
    return m.join(", ");
  }
  return undefined;
}

async function readNoteDefaults(): Promise<{
  expiresAfterMinutes: number;
  maxViews: number;
}> {
  const data = await chrome.storage.local.get([
    NOTE_EXPIRES_AFTER_MINUTES_KEY,
    NOTE_MAX_VIEWS_KEY,
  ]);
  let minutes = Number(data[NOTE_EXPIRES_AFTER_MINUTES_KEY]);
  if (!Number.isFinite(minutes)) minutes = DEFAULT_NOTE_EXPIRES_AFTER_MINUTES;
  minutes = Math.max(1, Math.floor(minutes));
  let maxViews = Number(data[NOTE_MAX_VIEWS_KEY]);
  if (!Number.isFinite(maxViews)) maxViews = DEFAULT_NOTE_MAX_VIEWS;
  maxViews = Math.min(1000, Math.max(1, Math.floor(maxViews)));
  return { expiresAfterMinutes: minutes, maxViews };
}

chrome.runtime.onMessage.addListener(
  (message: unknown, _sender, sendResponse): boolean => {
    if (
      !message ||
      typeof message !== "object" ||
      (message as SaveNoteMessage).type !== "SAVE_NOTE"
    ) {
      return false;
    }

    const { text } = (message as SaveNoteMessage).payload;
    if (typeof text !== "string") {
      sendResponse({ error: "Invalid payload." } satisfies SaveNoteResponse);
      return false;
    }

    void (async () => {
      const base = apiBase();
      try {
        const { expiresAfterMinutes, maxViews } = await readNoteDefaults();
        const expiresAt = new Date(
          Date.now() + expiresAfterMinutes * 60_000,
        ).toISOString();

        const res = await fetch(`${base}/s`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: text,
            maxViews,
            expiresAt,
          }),
        });

        const body: unknown = await res.json().catch(() => ({}));

        if (!res.ok) {
          let err =
            messageFromBody(body) ??
            (res.status === 429
              ? "Too many saves. Try again later."
              : "Could not save.");
          sendResponse({ error: err } satisfies SaveNoteResponse);
          return;
        }

        const url = (body as { url?: unknown }).url;
        if (typeof url !== "string" || !url) {
          sendResponse({
            error: "No link returned from server.",
          } satisfies SaveNoteResponse);
          return;
        }

        sendResponse({ url } satisfies SaveNoteResponse);
      } catch {
        sendResponse({
          error: "Network error — is the API running?",
        } satisfies SaveNoteResponse);
      }
    })();

    return true;
  },
);
