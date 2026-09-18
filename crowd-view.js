import {crowdState} from "./crowd-model.js";

const root = document.getElementById("app");
const note = document.getElementById("crowdConnection");
let records = new Map();
let serverFresh = false;
let failed = false;
let scheduled = false;
const observer = new MutationObserver(() => {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => { scheduled = false; render(); });
});

function render() {
  observer.disconnect();
  const connected = serverFresh && navigator.onLine && !failed;
  note.textContent = connected
    ? "混雑状況は係が更新しています。15分以上更新がない場合は「要確認」と表示します。"
    : "混雑状況の最新情報を取得できません。会場でご確認ください。";
  for (const target of root.querySelectorAll("[data-crowd-id]")) {
    let badge = target.querySelector(":scope > .crowd-badge");
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "crowd-badge";
      target.append(badge);
    }
    const state = crowdState(records.get(target.dataset.crowdId), connected);
    badge.dataset.tone = state.tone;
    badge.textContent = target.closest("button") ? state.compact : state.text;
    badge.title = state.text;
    badge.setAttribute("aria-label", state.text);
  }
  observer.observe(root, {childList: true, subtree: true});
}

render();
window.addEventListener("offline", render);
window.addEventListener("online", () => { serverFresh = false; render(); });
setInterval(render, 30000);
try {
  const {watchCrowd} = await import("./crowd-firebase.js");
  watchCrowd((next, fresh) => {
    records = next;
    serverFresh = fresh;
    failed = false;
    render();
  }, () => { failed = true; serverFresh = false; render(); });
} catch {
  failed = true;
  render();
}
