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
      // TODO: optional CreateNoteDto fields (expiresAt, maxViews, password) via options UI
      try {
        const res = await fetch(`${base}/s`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text }),
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
