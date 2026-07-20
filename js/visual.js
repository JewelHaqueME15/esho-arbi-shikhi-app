import { $, esc, shuffle, pickExtra } from "./utils.js";
import { S, save } from "./state.js";
import { UNITS, NEW_OF_OLD } from "./data.js";
import { showTab, updateTop } from "./ui.js";
import { speak, sndOk, sndBad } from "./tts.js";

/* মাইলফলক পাঠ (পুরনো আইডিতে লেখা) — বইয়ের নতুন ক্রমে বসিয়ে নেওয়া হয় */
const VISUAL_CHALLENGE_UNITS = [2, 6, 12, 16, 19, 27, 30, 32].map((oldId) => NEW_OF_OLD[oldId]);
export let VC = null;
export function maybeVisualChallenge(ui) {
  if (!VISUAL_CHALLENGE_UNITS.includes(ui)) return false;
  const u = UNITS[ui];
  const candidates = (u.sents || []).filter((s) => s.img);
  if (!candidates.length) return false;
  const s = shuffle(candidates)[0];
  VC = { ui, sent: s, built: [] };
  const correctWords = s.a.split(" ");
  const distractors = pickExtra(u.vocab.map((v) => v.a), correctWords, 1 + Math.floor(Math.random() * 2));
  const words = shuffle([...correctWords, ...distractors]);
  ["home", "words", "league", "profile"].forEach((x) => $("#scr-" + x).classList.remove("active"));
  $("#scr-lesson").classList.remove("active"); $("#scr-result").classList.remove("active"); $("#scr-story").classList.remove("active"); $("#scr-vocab").classList.remove("active");
  $("#topbar").style.display = "none"; $("#tabbar").style.display = "none";
  $("#visual-body").innerHTML = `<div class="visual-head"><div class="emo">${s.img}</div><h1>ছবিটি দেখে আরবি বাক্যটি বানাও</h1>
    <p class="hint">ইঙ্গিত: ${s.b}</p></div>
    <div id="vc-answer"></div>
    <div id="vc-bank">${words.map((w, i) => `<button class="tile" data-i="${i}" data-w="${esc(w)}" onclick="vcTapTile(this)"><span class="ar">${w}</span></button>`).join("")}</div>`;
  $("#visual-check-bar").className = ""; $("#vc-fb").textContent = "";
  const cb = $("#vc-check-btn"); cb.disabled = true; cb.textContent = "যাচাই করো"; cb.onclick = vcCheck;
  $("#scr-visual").classList.add("active");
  window.scrollTo(0, 0);
  return true;
}
export function vcTapTile(el) {
  if (el.classList.contains("used")) return;
  el.classList.add("used"); VC.built.push(el.dataset.w);
  const chip = document.createElement("button"); chip.className = "tile"; chip.innerHTML = `<span class="ar">${el.dataset.w}</span>`;
  chip.onclick = () => { VC.built.splice(VC.built.indexOf(el.dataset.w), 1); chip.remove(); el.classList.remove("used"); $("#vc-check-btn").disabled = VC.built.length === 0; };
  $("#vc-answer").appendChild(chip);
  $("#vc-check-btn").disabled = false;
}
export function vcCheck() {
  const good = VC.built.join(" ") === VC.sent.a;
  const cb = $("#vc-check-btn");
  if (good) {
    sndOk(); $("#visual-check-bar").className = "ok"; $("#vc-fb").textContent = "✅ চমৎকার! সঠিক বাক্য বানিয়েছ";
    speak(VC.sent.a);
    S.xp += 20; S.gems += 6; S.dayXP += 20; save(); updateTop();
    cb.textContent = "চালিয়ে যাও";
  } else {
    sndBad(); $("#visual-check-bar").className = "bad"; $("#vc-fb").textContent = "❌ সঠিক বাক্য: " + VC.sent.a;
    cb.textContent = "বুঝেছি";
  }
  cb.onclick = finishVisualChallenge;
}
export function finishVisualChallenge() {
  if (!S.visualDone) S.visualDone = {};
  S.visualDone[VC.ui] = true; save();
  showTab("home");
}
