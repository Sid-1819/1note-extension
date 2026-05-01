import {
  DEFAULT_NOTE_EXPIRES_AFTER_MINUTES,
  DEFAULT_NOTE_MAX_VIEWS,
  NOTE_EXPIRES_AFTER_MINUTES_KEY,
  NOTE_MAX_VIEWS_KEY,
} from "../defaults.js";

const root = document.getElementById("root");
if (!root) throw new Error("missing #root");

const wrap = document.createElement("div");
wrap.style.cssText =
  "width:260px;padding:12px;box-sizing:border-box;font:13px/1.4 system-ui,sans-serif;color:#111";

const title = document.createElement("div");
title.textContent = "Defaults for new notes";
title.style.cssText = "font-weight:600;margin-bottom:10px";

const minLabel = document.createElement("label");
minLabel.textContent = "Expires after (minutes)";
minLabel.style.cssText = "display:block;margin-bottom:4px";
const minutesInput = document.createElement("input");
minutesInput.type = "number";
minutesInput.min = "1";
minutesInput.step = "1";
minutesInput.style.cssText =
  "width:100%;box-sizing:border-box;margin-bottom:10px;padding:6px 8px;border:1px solid #ccc;border-radius:6px";

const mvLabel = document.createElement("label");
mvLabel.textContent = "Max views";
mvLabel.style.cssText = "display:block;margin-bottom:4px";
const maxViewsInput = document.createElement("input");
maxViewsInput.type = "number";
maxViewsInput.min = "1";
maxViewsInput.max = "1000";
maxViewsInput.step = "1";
maxViewsInput.style.cssText =
  "width:100%;box-sizing:border-box;margin-bottom:10px;padding:6px 8px;border:1px solid #ccc;border-radius:6px";

const hint = document.createElement("div");
hint.textContent = "Default expiry is 1 day (1440 min).";
hint.style.cssText = "font-size:11px;color:#555;margin-bottom:10px";

const saveBtn = document.createElement("button");
saveBtn.type = "button";
saveBtn.textContent = "Save";
saveBtn.style.cssText =
  "width:100%;padding:8px;border:none;border-radius:6px;background:#2563eb;color:#fff;font-weight:600;cursor:pointer";

const status = document.createElement("div");
status.style.cssText = "min-height:18px;margin-top:8px;font-size:12px;color:#16a34a";

wrap.append(
  title,
  minLabel,
  minutesInput,
  mvLabel,
  maxViewsInput,
  hint,
  saveBtn,
  status,
);
root.append(wrap);

async function load(): Promise<void> {
  const data = await chrome.storage.local.get([
    NOTE_EXPIRES_AFTER_MINUTES_KEY,
    NOTE_MAX_VIEWS_KEY,
  ]);
  const m = Number(data[NOTE_EXPIRES_AFTER_MINUTES_KEY]);
  const v = Number(data[NOTE_MAX_VIEWS_KEY]);
  minutesInput.value = String(
    Number.isFinite(m) ? m : DEFAULT_NOTE_EXPIRES_AFTER_MINUTES,
  );
  maxViewsInput.value = String(
    Number.isFinite(v) ? v : DEFAULT_NOTE_MAX_VIEWS,
  );
}

void load();

saveBtn.addEventListener("click", async () => {
  status.textContent = "";
  status.style.color = "#16a34a";
  const minutes = Math.floor(Number(minutesInput.value));
  const maxViews = Math.floor(Number(maxViewsInput.value));
  if (!Number.isFinite(minutes) || minutes < 1) {
    status.style.color = "#b91c1c";
    status.textContent = "Minutes must be an integer ≥ 1.";
    return;
  }
  if (!Number.isFinite(maxViews) || maxViews < 1 || maxViews > 1000) {
    status.style.color = "#b91c1c";
    status.textContent = "Max views must be 1–1000.";
    return;
  }
  await chrome.storage.local.set({
    [NOTE_EXPIRES_AFTER_MINUTES_KEY]: minutes,
    [NOTE_MAX_VIEWS_KEY]: maxViews,
  });
  status.textContent = "Saved.";
});

saveBtn.addEventListener("mouseenter", () => {
  saveBtn.style.background = "#1d4ed8";
});
saveBtn.addEventListener("mouseleave", () => {
  saveBtn.style.background = "#2563eb";
});
