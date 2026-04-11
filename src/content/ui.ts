const Z = 2147483646;
const ICON = "📘";
const ICON_BUSY = "⏳";

let iconButton: HTMLButtonElement | null = null;
let iconTarget: Element | null = null;
let busy = false;
let saveInFlight = false;

let toastEl: HTMLDivElement | null = null;
let toastTimer: ReturnType<typeof setTimeout> | null = null;

function reposition(): void {
  if (!iconButton || !iconTarget) return;
  const rect = iconTarget.getBoundingClientRect();
  const gap = 6;
  const size = 32;
  const rawLeft = rect.right + gap;
  const rawTop = rect.top + (rect.height - size) / 2;
  const left = Math.min(
    Math.max(rawLeft, 8),
    window.innerWidth - size - 8,
  );
  const top = Math.min(
    Math.max(rawTop, 8),
    window.innerHeight - size - 8,
  );
  iconButton.style.left = `${left}px`;
  iconButton.style.top = `${top}px`;
}

function onScrollOrResize(): void {
  reposition();
}

function tearDownListeners(): void {
  window.removeEventListener("scroll", onScrollOrResize, true);
  window.removeEventListener("resize", onScrollOrResize);
}

function removeIcon(): void {
  tearDownListeners();
  iconButton?.remove();
  iconButton = null;
  iconTarget = null;
  busy = false;
  saveInFlight = false;
}

export function setIconLoading(loading: boolean): void {
  if (!iconButton) return;
  busy = loading;
  iconButton.textContent = loading ? ICON_BUSY : ICON;
  iconButton.style.opacity = loading ? "0.85" : "1";
  iconButton.style.pointerEvents = loading ? "none" : "auto";
}

export function attachIcon(target: Element, onClick: () => void | Promise<void>): void {
  removeIcon();

  const button = document.createElement("button");
  button.type = "button";
  button.tabIndex = -1;
  button.textContent = ICON;
  button.setAttribute("aria-label", "Save to OneNote");
  button.style.cssText = [
    "position:fixed",
    "box-sizing:border-box",
    `z-index:${Z}`,
    "width:32px",
    "height:32px",
    "padding:0",
    "margin:0",
    "border:1px solid rgba(0,0,0,0.12)",
    "border-radius:8px",
    "background:#fff",
    "box-shadow:0 2px 8px rgba(0,0,0,0.15)",
    "cursor:pointer",
    "font-size:18px",
    "line-height:1",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "font-family:system-ui,sans-serif",
    "transition:transform 0.12s ease,box-shadow 0.12s ease",
  ].join(";");

  button.addEventListener("mouseenter", () => {
    if (busy) return;
    button.style.transform = "scale(1.06)";
    button.style.boxShadow = "0 3px 10px rgba(0,0,0,0.2)";
  });
  button.addEventListener("mouseleave", () => {
    button.style.transform = "";
    button.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
  });

  button.addEventListener("mousedown", (e) => {
    e.preventDefault();
  });

  button.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy || saveInFlight) return;
    saveInFlight = true;
    try {
      await onClick();
    } finally {
      saveInFlight = false;
    }
  });

  iconButton = button;
  iconTarget = target;
  document.documentElement.appendChild(button);
  reposition();
  window.addEventListener("scroll", onScrollOrResize, true);
  window.addEventListener("resize", onScrollOrResize);
}

export function showToast(message: string): void {
  if (toastEl?.isConnected) {
    toastEl.remove();
  }
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }

  const el = document.createElement("div");
  el.textContent = message;
  el.style.cssText = [
    "position:fixed",
    `z-index:${Z}`,
    "right:16px",
    "bottom:16px",
    "max-width:min(360px,calc(100vw - 32px))",
    "padding:10px 14px",
    "background:rgba(32,32,32,0.92)",
    "color:#fff",
    "font:14px/1.4 system-ui,sans-serif",
    "border-radius:8px",
    "box-shadow:0 4px 16px rgba(0,0,0,0.25)",
    "pointer-events:none",
  ].join(";");

  document.documentElement.appendChild(el);
  toastEl = el;

  toastTimer = setTimeout(() => {
    el.remove();
    if (toastEl === el) toastEl = null;
    toastTimer = null;
  }, 2000);
}
