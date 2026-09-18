import {initializeApp} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getFirestore, collection, doc, onSnapshot, runTransaction, serverTimestamp,
  setDoc, query, orderBy, limit,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import {firebaseConfig} from "./firebase-config.js";
import {STATUS} from "./crowd-model.js";

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export {collection, doc, onSnapshot, setDoc, query, orderBy, limit, runTransaction};

export function watchCrowd(receive, fail) {
  return onSnapshot(collection(db, "crowd"), {includeMetadataChanges: true}, snapshot => {
    // ローカルの未送信書き込みを「更新成功」として表示しない。
    if (snapshot.metadata.hasPendingWrites) return;
    receive(new Map(snapshot.docs.map(item => [item.id, item.data()])), !snapshot.metadata.fromCache);
  }, fail);
}

export async function updateCrowd(eventId, status, user) {
  if (!navigator.onLine) throw new Error("通信が切れています。接続が戻ってから更新してください。");
  if (!user || !Object.hasOwn(STATUS, status) || status === "unknown") throw new Error("更新内容を確認してください。");
  const target = doc(db, "crowd", eventId);
  const log = doc(collection(db, "crowdHistory"));
  // トランザクションはオフラインで成功扱い・予約送信されない。
  await runTransaction(db, async transaction => {
    const current = await transaction.get(target);
    if (!current.exists()) throw new Error("管理者による催事登録が必要です。");
    transaction.set(target, {status, updatedAt: serverTimestamp(), changeId: log.id});
    transaction.set(log, {eventId, status, actor: user.uid, updatedAt: serverTimestamp()});
  });
}

export async function initializeCrowd(events) {
  if (!navigator.onLine) throw new Error("接続を確認してください。");
  // 既存の混雑情報を上書きせず、未登録の催事だけを追加する。
  for (let start = 0; start < events.length; start += 100) {
    const refs = events.slice(start, start + 100).map(event => doc(db, "crowd", event.id));
    await runTransaction(db, async transaction => {
      const snapshots = await Promise.all(refs.map(ref => transaction.get(ref)));
      snapshots.forEach((snapshot, i) => {
        if (!snapshot.exists()) transaction.set(refs[i], {status: "unknown", updatedAt: serverTimestamp(), changeId: ""});
      });
    });
  }
}
