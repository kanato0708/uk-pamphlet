import {doc, onSnapshot} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import {db} from "./crowd-firebase.js";

const bar = document.querySelector(".announcement-bar");
if (bar) {
  const text = bar.querySelector(".announcement-text");
  onSnapshot(doc(db, "siteContent", "announcement"), snapshot => {
    const message = snapshot.exists() && typeof snapshot.data().message === "string"
      ? snapshot.data().message.trim() : "";
    text.textContent = message;
    bar.hidden = !message;
    if (message) {
      const width = text.getBoundingClientRect().width;
      text.style.setProperty("--announcement-duration", `${Math.max(12, Math.ceil(width / 65))}s`);
    }
  }, () => { bar.hidden = true; });
}
