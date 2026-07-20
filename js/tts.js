import { $ } from "./utils.js";
import { S, save } from "./state.js";
import { ttsUrl } from "./api.js";
import { modal, closeModal } from "./ui.js";

/* ════════ SOUND EFFECTS (WebAudio) ════════ */
let AC = null;
function ac() { try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); return AC; } catch (e) { return null; } }
function tone(f, t0, dur, type, vol) { const c = ac(); if (!c) return; const o = c.createOscillator(), g = c.createGain(); o.type = type || "sine"; o.frequency.value = f; o.connect(g); g.connect(c.destination); const t = c.currentTime + t0; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol || .22, t + .02); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.start(t); o.stop(t + dur + .05); }
export function sndOk() { tone(587, 0, .14); tone(784, .11, .16); tone(1047, .22, .24); }
export function sndBad() { tone(233, 0, .22, "sawtooth", .14); tone(175, .16, .32, "sawtooth", .14); }
export function sndPair() { tone(880, 0, .1, "sine", .15); }
document.addEventListener("pointerdown", function once() { ac(); if ("speechSynthesis" in window) { speechSynthesis.resume(); } document.removeEventListener("pointerdown", once); }, { once: true });

/* ════════ TTS ════════ */
/* ডিভাইসে থাকা আরবি ভয়েসগুলো */
function arVoices() {
  if (!("speechSynthesis" in window)) return [];
  const vs = speechSynthesis.getVoices();
  return vs.filter((v) => (v.lang && v.lang.toLowerCase().startsWith("ar")) || /arab/i.test(v.name));
}
/* ভয়েসের নাম দেখে লিঙ্গ অনুমান — উইন্ডোজ/অ্যাপল/অ্যান্ড্রয়েডের প্রচলিত আরবি কণ্ঠগুলো।
   (ব্রাউজার API সরাসরি লিঙ্গ জানায় না, তাই নামই ভরসা।) */
const MALE_VOICE_RE = /naayf|nayf|majed|maged|tarik|tariq|hamed|hamza|mehdi|\bmale\b|-male/i;
const FEMALE_VOICE_RE = /hoda|huda|laila|layla|salma|zahra|amira|sana|fatima|\bfemale\b|-female/i;
export function genderVoice(gender) {
  if (!gender) return null;
  const re = gender === "male" ? MALE_VOICE_RE : FEMALE_VOICE_RE;
  return arVoices().find((v) => re.test(v.name)) || null;
}
export function arVoice() {
  const g = (S && S.gender) ? genderVoice(S.gender) : null;
  if (g) return g;
  return arVoices()[0] || null;
}
if ("speechSynthesis" in window) { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices(); }
let curAudio = null, lastSpeakTxt = null, soundFailCount = 0, soundNoticeShown = false;

export function toggleSound(explicit) {
  S.soundOn = (typeof explicit === "boolean") ? explicit : !S.soundOn;
  save(); updateSoundBtn();
  if (!S.soundOn) {
    if ("speechSynthesis" in window) { try { speechSynthesis.cancel(); } catch (e) {} }
    if (curAudio) { try { curAudio.pause(); } catch (e) {} curAudio = null; }
  }
}
export function updateSoundBtn() { const b = $("#sound-toggle"); if (b) b.textContent = S.soundOn ? "🔊" : "🔇"; }
function noteSoundFailure() {
  soundFailCount++;
  if (soundFailCount >= 2 && !soundNoticeShown) {
    soundNoticeShown = true;
    modal(`<div class="emo">🔇</div><h2>উচ্চারণ শোনা যাচ্ছে না?</h2><p>তোমার ডিভাইসে আরবি উচ্চারণ ঠিকমতো চলছে না মনে হচ্ছে। চিন্তা নেই — উচ্চারণ ছাড়াই পাঠ চালিয়ে যেতে পারবে, এটা কোনো বাধা নয়।<br><br>বারবার চেষ্টা করে সময় নষ্ট এড়াতে উপরের 🔊 বোতাম চেপে শব্দ বন্ধ করে দিতে পারো।<br><br>অফলাইনে শুনতে চাইলে Windows/Android-এ আরবি ভয়েস ইনস্টল করে ব্রাউজার রিস্টার্ট করো।</p>`,
      `<button class="btn blue" onclick="closeModal()">ঠিক আছে, চালিয়ে যাই</button><div style="height:10px"></div><button class="btn ghost" onclick="closeModal();toggleSound(false)">🔇 শব্দ বন্ধ করে দাও</button>`);
  }
}
/* ধাপ ১: সার্ভার-প্রক্সি করা TTS (/api/tts) — আগে সরাসরি Google-এ যেত, এখন নিজের ব্যাকএন্ড দিয়ে, যাতে বারবার একই শব্দ ক্যাশ হয় */
export function speak(txt) {
  lastSpeakTxt = txt;
  if (!S.soundOn) return;
  if (curAudio) { try { curAudio.pause(); } catch (e) {} curAudio = null; }
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  /* Google প্রক্সির (/api/tts) আরবি কণ্ঠ একটাই — সেখানে ছেলে/মেয়ে কণ্ঠ বাছাই করার
     কোনো উপায় নেই। তাই শিক্ষার্থীর লিঙ্গের সাথে মেলে এমন কণ্ঠ ডিভাইসে ইনস্টল থাকলে
     সেটিকেই অগ্রাধিকার দাও; না থাকলে আগের মতো প্রক্সিই চলবে। */
  if (S.gender && genderVoice(S.gender)) { ttsSpeak(txt); return; }
  if (navigator.onLine !== false) {
    const a = new Audio(ttsUrl(txt));
    curAudio = a; a.volume = 1;
    let settled = false;
    const succeed = () => { settled = true; soundFailCount = 0; };
    const fall = () => { if (!settled) { settled = true; curAudio = null; ttsSpeak(txt); } };
    a.addEventListener("playing", succeed, { once: true });
    a.onerror = fall;
    const pr = a.play(); if (pr && pr.catch) pr.catch(fall);
    setTimeout(() => { if (!settled) fall(); }, 2500); // অনেকক্ষণ কিছু না হলে (ঝুলে থাকলে) ফলব্যাকে চলে যাও
  } else { ttsSpeak(txt); }
}
/* ধাপ ২: ডিভাইসের নিজস্ব ভয়েস (ফলব্যাক) */
export function ttsSpeak(txt, tries) {
  if (!S.soundOn) return;
  if (!("speechSynthesis" in window)) { noteSoundFailure(); return; }
  tries = tries || 0;
  const vs = speechSynthesis.getVoices();
  if (!vs.length && tries < 6) { setTimeout(() => ttsSpeak(txt, tries + 1), 250); return; }
  if (!vs.length) { noteSoundFailure(); return; }
  speechSynthesis.cancel();
  /* Chrome বাগ: cancel-এর পরপরই speak দিলে নীরব থাকে — সামান্য বিরতি দরকার */
  setTimeout(() => {
    const u = new SpeechSynthesisUtterance(txt);
    window.__keepUtter = u; /* Chrome GC বাগ: রেফারেন্স না রাখলে মাঝপথে থেমে যায় */
    u.lang = "ar-SA"; u.rate = .8; u.pitch = 1; u.volume = 1;
    const v = arVoice(); if (v) { u.voice = v; soundFailCount = 0; } else { noteSoundFailure(); }
    speechSynthesis.resume();
    speechSynthesis.speak(u);
  }, 100);
}
