import {doc, getDocFromServer, setDoc, serverTimestamp} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import {db} from "./crowd-firebase.js";
import {watchAdmin} from "./admin-access.js";

const status = document.getElementById("status");
const editor = document.getElementById("editor");
const form = document.getElementById("announcementForm");
const message = document.getElementById("message");
const save = document.getElementById("save");
const announcement = doc(db, "siteContent", "announcement");
let loaded = false;
let loading = false;

function showStatus(text, error = false) {
  status.textContent = text;
  status.classList.toggle("error", error);
}

watchAdmin({
  checking: text => { editor.hidden = true; showStatus(text || "管理者権限を確認しています…"); },
  authorized: async () => {
    if (loaded) { editor.hidden = false; return; }
    if (loading) return;
    loading = true;
    try {
      const snapshot = await getDocFromServer(announcement);
      message.value = snapshot.exists() ? snapshot.data().message || "" : "";
      loaded = true;
      editor.hidden = false;
      showStatus("現在のお知らせを読み込みました。");
    } catch {
      showStatus("お知らせを読み込めません。通信とFirestoreのルールを確認してください。", true);
    } finally { loading = false; }
  },
  unauthorized: () => location.replace("admin.html?next=announcement-admin.html"),
  signedOut: () => location.replace("admin.html?next=announcement-admin.html"),
  failed: () => { editor.hidden = true; showStatus("管理者権限を確認できません。通信を確認して再読み込みしてください。", true); },
});

form.addEventListener("submit", async event => {
  event.preventDefault();
  const value = message.value.trim();
  if (!navigator.onLine) { showStatus("通信が切れています。接続が戻ってから保存してください。", true); return; }
  save.disabled = true;
  showStatus("保存しています…");
  try {
    await setDoc(announcement, {message: value, updatedAt: serverTimestamp()});
    message.value = value;
    showStatus(value ? "保存しました。来場者向けページに反映されます。" : "保存しました。お知らせは非表示になります。");
  } catch (error) {
    showStatus(error.code === "permission-denied" ? "保存権限がありません。管理者権限とFirestoreのルールを確認してください。" : "保存できませんでした。通信を確認して再試行してください。", true);
  } finally { save.disabled = false; }
});
