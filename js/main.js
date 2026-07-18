import { $ } from "./utils.js";
import { S, DEF, setSession, dailyRefresh, save } from "./state.js";
import * as api from "./api.js";
import { showTab, tapUnit, buyHearts, storyLockedMsg, resetAll, modal, closeModal, updateTop } from "./ui.js";
import { startLesson, startReview, openVocabIntro, selOpt, tapMatch, tapTile, quitLesson, afterResult, showRule } from "./lesson.js";
import { openStory, finishStory } from "./stories.js";
import { vcTapTile } from "./visual.js";
import { speak, toggleSound } from "./tts.js";

/* ════════ পুরনো (localStorage) প্রোফাইল থেকে নতুন অ্যাকাউন্টে একবার প্রগ্রেস আনার ব্রিজ ════════ */
const LEGACY_USERS_KEY = "eas_users";
function readLegacyState(name) {
  try {
    const users = JSON.parse(localStorage.getItem(LEGACY_USERS_KEY)) || {};
    return users[name]?.state || null;
  } catch { return null; }
}
function forgetLegacyUser(name) {
  try {
    const users = JSON.parse(localStorage.getItem(LEGACY_USERS_KEY)) || {};
    delete users[name];
    if (Object.keys(users).length) localStorage.setItem(LEGACY_USERS_KEY, JSON.stringify(users));
    else localStorage.removeItem(LEGACY_USERS_KEY);
  } catch { /* ignore */ }
}

/* ════════ লগইন / প্রোফাইল ════════ */
async function afterAuth({ username, isAdmin, state }) {
  setSession(Object.assign({}, DEF, state || {}), username);
  S.isAdmin = !!isAdmin;
  enterApp();
}
async function doLogin() {
  const name = $("#li-name").value.trim();
  const pass = $("#li-pass").value;
  const wantAdmin = $("#li-admin-chk").checked;
  const code = $("#li-admin-code").value.trim();
  const err = $("#li-err"); err.style.display = "none";
  if (!name) { err.textContent = "নাম লেখো"; err.style.display = "block"; return; }

  try {
    const res = await api.login({ username: name, password: pass });
    await afterAuth(res);
    return;
  } catch { /* no such account yet, or wrong password — try to create/claim it below */ }

  try {
    const legacyState = readLegacyState(name);
    const res = legacyState
      ? await api.migrate({ username: name, password: pass, wantsAdmin: wantAdmin, adminCode: code, localState: legacyState })
      : await api.signup({ username: name, password: pass, wantsAdmin: wantAdmin, adminCode: code });
    if (legacyState) forgetLegacyUser(name);
    await afterAuth(res);
  } catch (e) {
    err.textContent = e.message || "লগইন ব্যর্থ হয়েছে";
    err.style.display = "block";
  }
}
async function doLogout() {
  try { await api.logout(); } catch { /* clear client state regardless */ }
  location.reload();
}
function enterApp() {
  $("#scr-login").classList.remove("active");
  $("#topbar").style.display = "flex"; $("#tabbar").style.display = "flex";
  dailyRefresh(); updateTop(); showTab("home");
  if (!S.briefShown) {
    S.briefShown = true; S.introShown = true; save();
    modal(`<div class="emo">📖</div><h2>এসো আরবি শিখি!</h2>
    <p>মাওলানা আবু তাহের মিসবাহ হুজুরের জনপ্রিয় কিতাবটি এবার খেলার ছলে! ধাপে ধাপে শব্দ ও নিয়ম শিখে তুমি ইনশাআল্লাহ কুরআন-হাদীসের সহজ আরবি বুঝতে শিখবে।</p>
    <div class="brief-box">
      <p class="bh">📋 শুরুর আগে যা জানা থাকা চাই</p>
      <ul>
        <li>আরবি <b>হরফ</b> চিনতে ও পড়তে পারা</li>
        <li><b>যের-যবর-পেশ</b> (হারাকাত) দেখে সঠিক উচ্চারণ করতে পারা</li>
        <li>হরফ জোড়া লাগিয়ে ছোট শব্দ পড়তে পারা</li>
      </ul>
      <p class="note">এগুলো এখনও ভালো না পারলে আগে <b>কায়দা / নূরানী</b> শেষ করে নাও — তাহলে এই অ্যাপ অনেক সহজ লাগবে। ইনশাআল্লাহ!</p>
    </div>
    <div class="brief-box">
      <p class="bh">🎮 অ্যাপটি যেভাবে চলে</p>
      <ul>
        <li>প্রতি পাঠের শুরুতে <b>নিয়ম ও নতুন শব্দ</b> বুঝে নাও, তারপর অনুশীলন</li>
        <li>অনুশীলন <b>সহজ থেকে কঠিন</b> — শুরুতে ছবি দেখে সহজ প্রশ্ন</li>
        <li>প্রতিদিন খেলে <b>🔥 ধারা</b>, সঠিক উত্তরে <b>⚡XP</b> ও <b>💎 রত্ন</b></li>
        <li>ভুল হলে <b>❤️ হৃদয়</b> কমবে; <b>👑 মুকুট</b> জিতে পরের পাঠ খোলে</li>
        <li>অধ্যায় শেষে <b>📜 গল্প</b> পড়ে মজায় মজায় অনুশীলন</li>
      </ul>
    </div>`,
    `<button class="btn" onclick="closeModal()">বিসমিল্লাহ — শুরু করি!</button>`);
  } else if (!S.migNoticeShown) {
    S.migNoticeShown = true; save();
    modal(`<div class="emo">🎊</div><h2>স্বাগতম ফিরে!</h2><p>তোমার আগের সব অগ্রগতি অক্ষত আছে, এখন নিরাপদে সার্ভারে সংরক্ষিত হচ্ছে।</p>`, `<button class="btn" onclick="closeModal()">আলহামদুলিল্লাহ — চালিয়ে যাই!</button>`);
  }
}

/* ════════ ইনিশিয়াল বুট ════════ */
(async function boot() {
  try {
    const res = await api.me();
    await afterAuth(res);
    return;
  } catch { /* not signed in yet */ }
  $("#scr-login").classList.add("active");
})();

/* ════════ ইনলাইন onclick="..." HTML অ্যাট্রিবিউট থেকে ডাকা ফাংশনগুলো window-এ এক্সপোজ করা ════════ */
Object.assign(window, {
  doLogin, doLogout, toggleSound, quitLesson, showTab, finishStory, resetAll,
  closeModal, tapUnit, storyLockedMsg, openVocabIntro, buyHearts, speak,
  vcTapTile, selOpt, tapMatch, tapTile, afterResult, startReview, startLesson, openStory, showRule,
});
