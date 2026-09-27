import {
  collection, doc, getDocFromServer, getDocsFromServer, onSnapshot, runTransaction,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import {db} from "./crowd-firebase.js";

const manifestRef = doc(db, "siteContent", "events");
const eventCollection = collection(db, "publishedEvents");
const idPattern = /^[A-Za-z0-9_-]{1,100}$/;
const encoder = new TextEncoder();

function validate(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("催事データの形式が正しくありません。");
  const ids = new Set();
  for (const group of Object.values(data)) {
    if (!group || typeof group !== "object" || !Array.isArray(group.items)) throw new Error("催事データの形式が正しくありません。");
    for (const item of group.items) {
      if (!item.name || !idPattern.test(item.id || "") || ids.has(item.id)) throw new Error("催事名または催事IDを確認してください。");
      if (item.image && !/^data:image\/(?:jpeg|png|webp);base64,[a-z\d+/=]+$/i.test(item.image)) throw new Error("写真の形式を確認してください。");
      ids.add(item.id);
    }
  }
  return ids;
}

async function readFallback() {
  const response = await fetch("events.json", {cache: "no-store"});
  if (!response.ok) throw new Error("予備の催事データを読み込めませんでした。");
  const data = await response.json();
  validate(data);
  return {data, revision: null, source: "fallback"};
}

export async function loadEventsData() {
  if (location.protocol === "file:") return readFallback();
  try {
    const manifest = await getDocFromServer(manifestRef);
    if (!manifest.exists()) return readFallback();
    const {groups, revision} = manifest.data();
    if (!groups || typeof groups !== "object" || !revision) throw new Error("公開データの形式が正しくありません。");
    const snapshot = await getDocsFromServer(eventCollection);
    const byId = new Map(snapshot.docs.map(item => [item.id, item.data()]));
    const data = {};
    for (const [zone, group] of Object.entries(groups)) {
      const {itemIds, ...metadata} = group;
      if (!Array.isArray(itemIds)) throw new Error("公開データの形式が正しくありません。");
      data[zone] = {...metadata, items: itemIds.map(id => {
        const item = byId.get(id);
        if (!item) throw new Error("公開データの一部を読み込めませんでした。再読み込みしてください。");
        return item;
      })};
    }
    validate(data);
    return {data, revision, source: "firestore"};
  } catch (error) {
    const fallback = await readFallback();
    return {...fallback, warning: error.message};
  }
}

export async function saveEventsData(data, previous, expectedRevision) {
  if (!navigator.onLine) throw new Error("通信を確認してから更新してください。");
  const ids = validate(data);
  const before = new Map((expectedRevision ? Object.values(previous || {}).flatMap(group => group.items || []) : []).map(item => [item.id, item]));
  const changed = Object.values(data).flatMap(group => group.items).filter(item => JSON.stringify(item) !== JSON.stringify(before.get(item.id)));
  const removed = [...before.keys()].filter(id => !ids.has(id));
  const groups = Object.fromEntries(Object.entries(data).map(([zone, group]) => {
    const {items, ...metadata} = group;
    return [zone, {...metadata, itemIds: items.map(item => item.id)}];
  }));
  const revision = crypto.randomUUID();
  const manifest = {groups, revision, updatedAt: new Date().toISOString()};
  const bytes = encoder.encode(JSON.stringify(manifest)).length + changed.reduce((total, item) => total + encoder.encode(JSON.stringify(item)).length, 0);
  if (changed.some(item => encoder.encode(JSON.stringify(item)).length > 900000)) throw new Error("写真が大きすぎます。小さい写真を選び直してください。");
  if (bytes > 7500000) throw new Error("一度に更新する写真が多すぎます。写真を減らすか、催事を分けて更新してください。");
  await runTransaction(db, async transaction => {
    const current = await transaction.get(manifestRef);
    const currentRevision = current.exists() ? current.data().revision : null;
    if (currentRevision !== expectedRevision) throw new Error("別の担当者が先に更新しました。再読み込みして内容を確認してください。");
    changed.forEach(item => transaction.set(doc(eventCollection, item.id), item));
    removed.forEach(id => transaction.delete(doc(eventCollection, id)));
    transaction.set(manifestRef, manifest);
  });
  return revision;
}

export function watchEventsVersion(onChange, initialRevision = null) {
  let lastRevision = initialRevision;
  return onSnapshot(manifestRef, {includeMetadataChanges: true}, snapshot => {
    if (snapshot.metadata.fromCache) return;
    const revision = snapshot.exists() ? snapshot.data().revision : null;
    if (revision === lastRevision) return;
    lastRevision = revision;
    onChange();
  }, () => {});
}
