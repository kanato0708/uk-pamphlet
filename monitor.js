import {crowdState, flattenEvents} from "./crowd-model.js";

const groups = document.getElementById("groups");
const connection = document.getElementById("connection");
const fullscreen = document.getElementById("fullscreen");
const zoneOrder = ["3f", "2f", "1f", "gymA", "gymB", "admin", "courtyard"];
let events = [];
let records = new Map();
let serverFresh = false;
let failed = false;
function zoneName(zone) { return {"3f":"校舎 3階", "2f":"校舎 2階", "1f":"校舎 1階", gymA:"第1体育館", gymB:"第2体育館", admin:"管理棟", courtyard:"中庭"}[zone] || zone; }
function mapStatus(record, connected) {
  if (!connected) return "通信不可";
  return {quiet:"空き", moderate:"やや混雑", busy:"混雑", closed:"終了"}[record?.status] || "要確認";
}
function render() {
  const connected = serverFresh && navigator.onLine && !failed;
  connection.textContent = connected ? "係が更新した混雑状況を表示しています。" : "混雑状況の最新情報を取得できません。会場でご確認ください。";
  groups.replaceChildren();
  for (const zone of zoneOrder) {
    const items = events.filter(event => event.zone === zone);
    if (!items.length) continue;
    const section = document.createElement("section"); section.className = "zone"; section.dataset.zone = zone;
    const heading = document.createElement("h2"); heading.textContent = zoneName(zone);
    const tiles = document.createElement("div"); tiles.className = "tiles";
    for (const event of items) {
      const tile = document.createElement("article"); tile.className = "tile";
      const room = document.createElement("div"); room.className = "tile-room"; room.textContent = ["3f", "2f", "1f"].includes(zone) ? (event.room || "").replace(/教室$/, "") : (event.room || event.zoneLabel);
      const name = document.createElement("div"); name.className = "tile-name"; name.textContent = event.name;
      const badge = document.createElement("span"); badge.className = "crowd-badge";
      const record = records.get(event.id); const state = crowdState(record, connected); const shortStatus = mapStatus(record, connected); const tone = connected && ["quiet", "moderate", "busy", "closed"].includes(record?.status) ? record.status : state.tone; tile.dataset.tone = tone; badge.dataset.tone = tone; badge.textContent = shortStatus; tile.title = `${event.room || event.name}：${shortStatus}`; tile.setAttribute("aria-label", `${event.room || event.name} ${event.name}：${shortStatus}`);
      tile.append(room, name, badge); tiles.append(tile);
    }
    section.append(heading, tiles); groups.append(section);
  }
}
async function loadEvents() {
  const response = await fetch(`events.json?updated=${Date.now()}`, {cache:"no-store"});
  if (!response.ok) throw new Error("催事データを読み込めません。");
  events = flattenEvents(await response.json()); render();
}
async function toggleFullscreen() { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch {} }
fullscreen.addEventListener("click", toggleFullscreen);
document.addEventListener("fullscreenchange", () => { fullscreen.textContent = document.fullscreenElement ? "全画面を終了" : "全画面表示"; });
document.addEventListener("keydown", event => { if (event.key.toLowerCase() === "f" && !event.metaKey && !event.ctrlKey && !event.altKey) toggleFullscreen(); });
window.addEventListener("offline", render);
window.addEventListener("online", () => {serverFresh = false; render();});
setInterval(render, 30000);
try {
  await loadEvents();
  const {watchCrowd} = await import("./crowd-firebase.js");
  watchCrowd((next, fresh) => {records = next; serverFresh = fresh; failed = false; render();}, () => {failed = true; serverFresh = false; render();});
} catch { failed = true; connection.textContent = "表示を準備できません。通信とファイルの配置を確認してください。"; }
