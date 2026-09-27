import {getAuth, onAuthStateChanged} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {app, db, doc, onSnapshot} from "./crowd-firebase.js";

export const auth = getAuth(app);

// 同じFirebaseアカウントとFirestoreの管理者権限を確認する。
export function watchAdmin({checking, authorized, unauthorized, signedOut, failed}) {
  let stopProfile = null;
  let generation = 0;
  const stopAuth = onAuthStateChanged(auth, user => {
    const current = ++generation;
    stopProfile?.();
    stopProfile = null;
    checking();
    if (!user) { signedOut(); return; }
    stopProfile = onSnapshot(doc(db, "users", user.uid), {includeMetadataChanges: true}, snapshot => {
      if (generation !== current) return;
      if (snapshot.metadata.fromCache) { checking("管理者権限を確認しています。通信を確認してください。"); return; }
      const profile = snapshot.exists() ? snapshot.data() : null;
      if (profile?.active === true && profile.role === "admin") authorized(user, profile);
      else unauthorized(user);
    }, error => { if (generation === current) failed(error); });
  }, failed);
  return () => { generation++; stopAuth(); stopProfile?.(); };
}
