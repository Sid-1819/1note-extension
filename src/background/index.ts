import { readResolvedNoteCreationParams } from "../defaults.js";

type SaveNoteMessage = {
  type: "SAVE_NOTE";
  payload: { text: string; password?: string };
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

chrome.runtime.onMessage.addListener(
  (message: unknown, _sender, sendResponse): boolean => {
    if (
      !message ||
      typeof message !== "object" ||
      (message as SaveNoteMessage).type !== "SAVE_NOTE"
    ) {
      return false;
    }

    const { text, password } = (message as SaveNoteMessage).payload;
    if (typeof text !== "string") {
      sendResponse({ error: "Invalid payload." } satisfies SaveNoteResponse);
      return false;
    }

    void (async () => {
      const base = apiBase();
      try {
        const { expiresAfterMinutes, maxViews } =
          await readResolvedNoteCreationParams();
        const expiresAt = new Date(
          Date.now() + expiresAfterMinutes * 60_000,
        ).toISOString();

        const trimmedPassword =
          typeof password === "string" ? password.trim() : "";

        const body: Record<string, unknown> = {
          content: text,
          maxViews,
          expiresAt,
        };
        if (trimmedPassword !== "") {
          body.password = trimmedPassword;
        }

        const res = await fetch(`${base}/s`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const resBody: unknown = await res.json().catch(() => ({}));

        if (!res.ok) {
          let err =
            messageFromBody(resBody) ??
            (res.status === 429
              ? "Too many saves. Try again later."
              : "Could not save.");
          sendResponse({ error: err } satisfies SaveNoteResponse);
          return;
        }

        const url = (resBody as { url?: unknown }).url;
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
