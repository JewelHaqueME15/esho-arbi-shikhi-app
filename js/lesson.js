import { $, esc, shuffle, pick, pickExtra } from "./utils.js";
import { S, save, bumpStreak } from "./state.js";
import { UNITS, BADGES, LEVELS } from "./data.js";
import { modal, closeModal, showTab, updateTop, xpFloat, comboFloat, celebrateConfetti } from "./ui.js";
import { speak, sndOk, sndBad, sndPair } from "./tts.js";
import { maybeVisualChallenge } from "./visual.js";

export let L = null; // চলমান পাঠ
export function genExercises(ui) {
  const u = UNITS[ui], ex = [];
  const vocab = shuffle(u.vocab).slice(0, 8);
  const allV = UNITS.slice(0, ui + 1).flatMap((x) => x.vocab);
  vocab.slice(0, 3).forEach((w) => ex.push({ t: "mc_ab", w, opts: shuffle([w.b, ...pick(allV.map((v) => v.b), 3, w.b)]) }));
  vocab.slice(3, 5).forEach((w) => ex.push({ t: "mc_ba", w, opts: shuffle([w.a, ...pick(allV.map((v) => v.a), 3, w.a)]) }));
  vocab.slice(5, 7).forEach((w) => ex.push({ t: "listen", w, opts: shuffle([w.a, ...pick(allV.map((v) => v.a), 3, w.a)]) }));
  ex.push({ t: "match", pairs: shuffle(u.vocab).slice(0, 4) });
  const bnPool = [...new Set([...u.vocab.flatMap((v) => v.b.split(" ")), ...u.sents.flatMap((x) => x.b.split(" "))])];
  shuffle(u.sents).slice(0, 2).forEach((s) => {
    const words = s.a.split(" ");
    const distractors = pickExtra(u.vocab.map((v) => v.a), words, 1 + Math.floor(Math.random() * 2));
    ex.push({ t: "build", s, distractors });
  });
  shuffle(u.sents).slice(0, 2).forEach((s) => ex.push({ t: "tr", s, opts: shuffle([s.b, ...pick(u.sents.map((x) => x.b), 3, s.b)]) }));
  // অনুবাদ থেকে আরবি বাক্য সাজানোর বিপরীত: আরবি বাক্য দেখে অনুবাদ সাজাও
  shuffle(u.sents).slice(0, 2).forEach((s) => {
    const words = s.b.split(" ");
    const distractors = pickExtra(bnPool, words, 1 + Math.floor(Math.random() * 2));
    ex.push({ t: "build_ba", s, distractors });
  });
  if (u.qa) shuffle(u.qa).slice(0, 2).forEach((item) => ex.push({ t: "qa", q: item.q, opts: shuffle(item.o.slice()), ans: item.o[item.c] }));
  if (u.fill) shuffle(u.fill).slice(0, 2).forEach((item) => ex.push({ t: "fill", q: item.q, opts: shuffle(item.o.slice()), ans: item.o[item.c] }));
  const picVocab = shuffle(u.vocab.filter((v) => v.img));
  const allVimg = allV.filter((v) => v.img);
  picVocab.slice(0, 2).forEach((w) => ex.push({ t: "pic_mc", w, opts: shuffle([w.a, ...pick(allVimg.map((v) => v.a), 3, w.a)]) }));
  picVocab.slice(2, 4).forEach((w) => {
    const distractors = shuffle(allVimg.filter((v) => v.a !== w.a)).slice(0, 3);
    ex.push({ t: "pic_ba", w, opts: shuffle([w, ...distractors]) });
  });
  picVocab.slice(4, 6).forEach((w) => {
    const distractors = shuffle(allVimg.filter((v) => v.a !== w.a)).slice(0, 3);
    ex.push({ t: "listen_pic", w, opts: shuffle([w, ...distractors]) });
  });
  if (picVocab.length >= 4) ex.push({ t: "pic_match", pairs: shuffle(picVocab).slice(0, 4) });
  return shuffle(ex);
}
/* রিভিউ: শেখা শব্দ থেকে মিশ্র অনুশীলন */
export function genReviewExercises(ws) {
  const ex = [], pool = shuffle(ws);
  const take = Math.min(10, pool.length);
  for (let i = 0; i < take; i++) {
    const w = pool[i], r = i % 3;
    if (r === 0) ex.push({ t: "mc_ab", w, opts: shuffle([w.b, ...pick(ws.map((v) => v.b), 3, w.b)]) });
    else if (r === 1) ex.push({ t: "mc_ba", w, opts: shuffle([w.a, ...pick(ws.map((v) => v.a), 3, w.a)]) });
    else ex.push({ t: "listen", w, opts: shuffle([w.a, ...pick(ws.map((v) => v.a), 3, w.a)]) });
  }
  if (ws.length >= 4) ex.push({ t: "match", pairs: shuffle(ws).slice(0, 4) });
  return shuffle(ex);
}
export function startReview() {
  const ws = Object.entries(S.words).map(([a, b]) => ({ a, b }));
  if (ws.length < 4) { modal(`<div class="emo">🌱</div><h2>আরেকটু শেখো!</h2><p>অন্তত ৪টি শব্দ শিখলে অনুশীলন খুলবে। আগে কয়েকটি পাঠ শেষ করো।</p>`, `<button class="btn blue" onclick="closeModal()">ঠিক আছে</button>`); return; }
  if (S.hearts <= 0) { modal(`<div class="emo">💔</div><h2>হৃদয় শেষ!</h2><p>আগামীকাল হৃদয়গুলো আবার ভরে যাবে।</p>`, `<button class="btn ghost" onclick="closeModal()">পরে</button>`); return; }
  L = { ui: -1, review: true, ex: genReviewExercises(ws), i: 0, wrong: 0, correctWords: new Set(), combo: 0, maxCombo: 0 };
  ["home", "words", "league", "profile"].forEach((x) => $("#scr-" + x).classList.remove("active"));
  $("#scr-result").classList.remove("active"); $("#scr-story").classList.remove("active"); $("#scr-vocab").classList.remove("active"); $("#scr-visual").classList.remove("active");
  $("#topbar").style.display = "none"; $("#tabbar").style.display = "none";
  $("#scr-lesson").classList.add("active");
  renderEx();
}
export function startLesson(ui) {
  L = { ui, ex: genExercises(ui), i: 0, wrong: 0, correctWords: new Set(), combo: 0, maxCombo: 0 };
  $("#scr-home").classList.remove("active"); $("#scr-result").classList.remove("active"); $("#scr-story").classList.remove("active"); $("#scr-vocab").classList.remove("active"); $("#scr-visual").classList.remove("active");
  $("#topbar").style.display = "none"; $("#tabbar").style.display = "none";
  $("#scr-lesson").classList.add("active");
  renderEx();
}
/* ════════ শব্দ-পরিচিতি স্ক্রীন (বইয়ের মতো) ════════ */
export function openVocabIntro(ui) {
  const u = UNITS[ui];
  ["home", "words", "league", "profile"].forEach((x) => $("#scr-" + x).classList.remove("active"));
  $("#scr-lesson").classList.remove("active"); $("#scr-result").classList.remove("active"); $("#scr-story").classList.remove("active"); $("#scr-visual").classList.remove("active");
  $("#topbar").style.display = "none"; $("#tabbar").style.display = "none";
  $("#vocab-top .ttl").textContent = u.icon + " " + u.title;
  $("#vocab-body").innerHTML = `<div class="vocab-head"><div class="emo">${u.icon}</div><h1>নতুন শব্দগুলো শিখে নাও</h1>
    <p style="color:var(--gray);font-weight:600;font-size:13px;margin-top:4px">🔊 চাপলে উচ্চারণ শুনবে</p></div>
    <div class="vocab-table">${u.vocab.map((v) => `<div class="vocab-row">
      <div class="vocab-bn">${v.b}</div>
      <div class="vocab-ar"><button class="vocab-sp" onclick="speak('${v.a.replace(/'/g, "\\'")}')">🔊</button>${v.img ? `<span class="vocab-icon">${v.img}</span>` : ""}<span>${v.a}</span></div>
    </div>`).join("")}</div>
    <div class="tipbox" style="margin:16px">${u.tip}</div>`;
  $("#vocab-start-btn").onclick = () => startLesson(ui);
  $("#scr-vocab").classList.add("active");
  window.scrollTo(0, 0);
}

export function quitLesson() {
  if (confirm("পাঠ ছেড়ে দিলে এই অগ্রগতি হারাবে। ছাড়বে?")) { speechSynthesis.cancel(); showTab("home"); }
}
export function setProgress() { $("#pbar>div").style.width = (L.i / L.ex.length * 100) + "%"; $("#lesson-hearts").textContent = "❤️" + S.hearts; }
/* ── রেন্ডার ── */
export function renderEx() {
  const e = L.ex[L.i]; setProgress();
  const A = $("#ex-area");
  A.classList.remove("ex-anim"); void A.offsetWidth; A.classList.add("ex-anim");
  $("#check-bar").className = ""; $("#fb-text").textContent = "";
  const cb = $("#btn-check"); cb.disabled = true; cb.textContent = "যাচাই করো"; cb.onclick = checkAnswer;
  L.sel = null; L.matchDone = 0; L.matchSel = null; L.built = [];
  if (e.t === "mc_ab") {
    A.innerHTML = `<div class="ex-title">এই শব্দের অর্থ কী?</div>
    <div class="speak-row"><button class="speak-btn" onclick="speak('${e.w.a}')">🔊</button><span class="ar" style="font-size:40px">${e.w.a}</span></div>
    <div class="opts">${e.opts.map((o, i) => `<button class="opt" data-i="${i}" onclick="selOpt(this,'${esc(o)}')">${o}</button>`).join("")}</div>`;
    setTimeout(() => speak(e.w.a), 300);
  } else if (e.t === "mc_ba") {
    A.innerHTML = `<div class="ex-title">আরবিতে কোনটি?</div>
    <div class="big-bn">${e.w.b}</div>
    <div class="opts">${e.opts.map((o, i) => `<button class="opt" data-i="${i}" onclick="selOpt(this,'${esc(o)}');speak('${o}')"><span class="ar">${o}</span></button>`).join("")}</div>`;
  } else if (e.t === "listen") {
    A.innerHTML = `<div class="ex-title">যা শুনছ সেটি বাছাই করো</div>
    <div class="speak-row"><button class="speak-btn" style="width:70px;height:70px;font-size:32px" onclick="speak('${e.w.a}')">🔊</button></div>
    <div class="opts grid2">${e.opts.map((o, i) => `<button class="opt" data-i="${i}" onclick="selOpt(this,'${esc(o)}')"><span class="ar">${o}</span></button>`).join("")}</div>
    <p style="text-align:center;color:var(--gray);font-weight:600;font-size:13px;margin-top:14px">শুনতে না পেলে 🔊 বোতামটি আবার চাপো</p>`;
    setTimeout(() => speak(e.w.a), 350);
  } else if (e.t === "tr") {
    A.innerHTML = `<div class="ex-title">বাক্যটির অর্থ কী?</div>
    <div class="speak-row"><button class="speak-btn" onclick="speak('${e.s.a}')">🔊</button></div>
    <div class="big-ar" style="font-size:28px;line-height:2">${e.s.a}</div>
    <div class="opts">${e.opts.map((o, i) => `<button class="opt" style="font-size:16px" data-i="${i}" onclick="selOpt(this,'${esc(o)}')">${o}</button>`).join("")}</div>`;
    setTimeout(() => speak(e.s.a), 300);
  } else if (e.t === "qa") {
    A.innerHTML = `<div class="ex-title">প্রশ্নের সঠিক উত্তরটি বাছাই করো</div>
    <div class="big-ar" style="font-size:26px;line-height:2">${e.q} <button class="speak-btn" style="width:42px;height:42px;font-size:19px;vertical-align:middle" onclick="speak('${e.q.replace(/\(.*?\)/g, "").trim()}')">🔊</button></div>
    <div class="opts">${e.opts.map((o, i) => `<button class="opt" data-i="${i}" onclick="selOpt(this,'${esc(o)}');speak('${o}')"><span class="ar" style="font-size:21px">${o}</span></button>`).join("")}</div>`;
  } else if (e.t === "fill") {
    A.innerHTML = `<div class="ex-title">শূন্যস্থানে সঠিক শব্দটি বসাও</div>
    <div class="big-ar" style="font-size:30px;line-height:2">${e.q}</div>
    <div class="opts grid2">${e.opts.map((o, i) => `<button class="opt" data-i="${i}" onclick="selOpt(this,'${esc(o)}');speak('${o}')"><span class="ar">${o}</span></button>`).join("")}</div>`;
  } else if (e.t === "pic_mc") {
    A.innerHTML = `<div class="ex-title">এটি কী? (ছবি দেখে আরবি শব্দ বাছাই করো)</div>
    <div class="pic-emo">${e.w.img}</div>
    <div class="opts grid2">${e.opts.map((o, i) => `<button class="opt" data-i="${i}" onclick="selOpt(this,'${esc(o)}');speak('${o}')"><span class="ar">${o}</span></button>`).join("")}</div>`;
  } else if (e.t === "pic_ba") {
    A.innerHTML = `<div class="ex-title">কোন ছবিটি এই শব্দের অর্থ?</div>
    <div class="speak-row"><button class="speak-btn" onclick="speak('${e.w.a}')">🔊</button><span class="ar" style="font-size:36px">${e.w.a}</span></div>
    <div class="opts grid2">${e.opts.map((o, i) => `<button class="opt" data-i="${i}" onclick="selOpt(this,'${esc(o.a)}')"><span style="font-size:44px">${o.img}</span></button>`).join("")}</div>`;
    setTimeout(() => speak(e.w.a), 300);
  } else if (e.t === "listen_pic") {
    A.innerHTML = `<div class="ex-title">শব্দটি শুনে সঠিক ছবি বাছাই করো</div>
    <div class="speak-row"><button class="speak-btn" style="width:70px;height:70px;font-size:32px" onclick="speak('${e.w.a}')">🔊</button></div>
    <div class="opts grid2">${e.opts.map((o, i) => `<button class="opt" data-i="${i}" onclick="selOpt(this,'${esc(o.a)}')"><span style="font-size:44px">${o.img}</span></button>`).join("")}</div>
    <p style="text-align:center;color:var(--gray);font-weight:600;font-size:13px;margin-top:14px">শুনতে না পেলে 🔊 বোতামটি আবার চাপো</p>`;
    setTimeout(() => speak(e.w.a), 350);
  } else if (e.t === "pic_match") {
    const ar = shuffle(e.pairs.map((p) => p.a)), ic = shuffle(e.pairs.map((p) => p.img));
    A.innerHTML = `<div class="ex-title">শব্দ ও ছবি মেলাও</div><div class="match-cols">
      <div style="display:flex;flex-direction:column;gap:12px">${ar.map((a) => `<button class="opt" data-side="a" data-v="${esc(a)}" onclick="tapMatch(this)"><span class="ar">${a}</span></button>`).join("")}</div>
      <div style="display:flex;flex-direction:column;gap:12px">${ic.map((im) => `<button class="opt" data-side="b" data-v="${esc(im)}" style="font-size:26px" onclick="tapMatch(this)">${im}</button>`).join("")}</div></div>`;
    cb.textContent = "সব জোড়া মেলাও";
  } else if (e.t === "match") {
    const ar = shuffle(e.pairs.map((p) => p.a)), bn = shuffle(e.pairs.map((p) => p.b));
    A.innerHTML = `<div class="ex-title">জোড়া মেলাও</div><div class="match-cols">
      <div style="display:flex;flex-direction:column;gap:12px">${ar.map((a) => `<button class="opt" data-side="a" data-v="${esc(a)}" onclick="tapMatch(this)"><span class="ar">${a}</span></button>`).join("")}</div>
      <div style="display:flex;flex-direction:column;gap:12px">${bn.map((b) => `<button class="opt" data-side="b" data-v="${esc(b)}" onclick="tapMatch(this)">${b}</button>`).join("")}</div></div>`;
    cb.textContent = "সব জোড়া মেলাও";
  } else if (e.t === "build") {
    const words = shuffle([...e.s.a.split(" "), ...(e.distractors || [])]);
    A.innerHTML = `<div class="ex-title">আরবিতে বাক্যটি সাজাও</div>
    <div class="big-bn" style="font-size:21px">"${e.s.b}"</div>
    <div id="build-answer"></div>
    <div id="build-bank">${words.map((w, i) => `<button class="tile" data-i="${i}" data-w="${esc(w)}" onclick="tapTile(this)"><span class="ar">${w}</span></button>`).join("")}</div>`;
  } else if (e.t === "build_ba") {
    const words = shuffle([...e.s.b.split(" "), ...(e.distractors || [])]);
    A.innerHTML = `<div class="ex-title">অর্থ অনুযায়ী বাক্যটি সাজাও</div>
    <div class="speak-row"><button class="speak-btn" onclick="speak('${e.s.a}')">🔊</button></div>
    <div class="big-ar" style="font-size:26px;line-height:2">${e.s.a}</div>
    <div id="build-answer" style="direction:ltr"></div>
    <div id="build-bank" style="direction:ltr">${words.map((w, i) => `<button class="tile" data-i="${i}" data-w="${esc(w)}" onclick="tapTile(this)">${esc(w)}</button>`).join("")}</div>`;
    setTimeout(() => speak(e.s.a), 300);
  }
}
/* ── কম্বো (টানা সঠিক উত্তর) ── */
function bumpCombo(good) {
  if (good) {
    L.combo = (L.combo || 0) + 1;
    if (L.combo > (L.maxCombo || 0)) L.maxCombo = L.combo;
    if (L.combo === 3 || L.combo === 5 || L.combo === 8) comboFloat("🔥 কম্বো x" + L.combo + "!");
  } else {
    L.combo = 0;
  }
}
/* ── ইন্টার‌্যাকশন ── */
export function selOpt(el, val) {
  document.querySelectorAll(".opt").forEach((o) => o.classList.remove("sel"));
  el.classList.add("sel"); L.sel = val; $("#btn-check").disabled = false;
}
export function tapMatch(el) {
  const e = L.ex[L.i];
  if (el.classList.contains("faded")) return;
  if (L.matchSel && L.matchSel.dataset.side === el.dataset.side) { L.matchSel.classList.remove("sel"); L.matchSel = el; el.classList.add("sel"); return; }
  if (!L.matchSel) { L.matchSel = el; el.classList.add("sel"); if (el.dataset.side === "a") speak(el.dataset.v); return; }
  const a = L.matchSel.dataset.side === "a" ? L.matchSel : el, b = L.matchSel.dataset.side === "a" ? el : L.matchSel;
  const good = e.pairs.some((p) => p.a === a.dataset.v && (p.b === b.dataset.v || p.img === b.dataset.v));
  if (good) {
    bumpCombo(true);
    sndPair(); [a, b].forEach((x) => { x.classList.remove("sel"); x.classList.add("ok"); setTimeout(() => x.classList.add("faded"), 350); });
    L.matchDone++; if (a.dataset.side === "a") speak(a.dataset.v);
    L.correctWords.add(a.dataset.v); if (L.matchDone === e.pairs.length) { $("#btn-check").disabled = false; $("#btn-check").textContent = "চালিয়ে যাও"; feedback(true, "চমৎকার জোড়া!"); L.autoOk = true; }
  } else {
    bumpCombo(false);
    sndBad(); [a, b].forEach((x) => { x.classList.add("bad"); setTimeout(() => x.classList.remove("bad", "sel"), 600); });
    loseHeart(); if (S.hearts <= 0) { outOfHearts(); return; }
  }
  L.matchSel = null;
}
export function tapTile(el) {
  if (el.classList.contains("used")) return;
  el.classList.add("used"); L.built.push(el.dataset.w);
  const isAr = !!el.querySelector(".ar");
  const chip = document.createElement("button"); chip.className = "tile";
  chip.innerHTML = isAr ? `<span class="ar">${el.dataset.w}</span>` : esc(el.dataset.w);
  chip.onclick = () => { L.built.splice(L.built.indexOf(el.dataset.w), 1); chip.remove(); el.classList.remove("used"); $("#btn-check").disabled = L.built.length === 0; };
  $("#build-answer").appendChild(chip);
  $("#btn-check").disabled = false;
}
/* ── যাচাই ── */
export function checkAnswer() {
  const e = L.ex[L.i];
  if (L.autoOk) { L.autoOk = false; next(true); return; }
  let good = false, correctTxt = "";
  if (e.t === "mc_ab") { good = L.sel === e.w.b; correctTxt = e.w.b; }
  else if (e.t === "mc_ba" || e.t === "listen") { good = L.sel === e.w.a; correctTxt = e.w.a; }
  else if (e.t === "build") { good = L.built.join(" ") === e.s.a; correctTxt = e.s.a; }
  else if (e.t === "build_ba") { good = L.built.join(" ") === e.s.b; correctTxt = e.s.b; }
  else if (e.t === "tr") { good = L.sel === e.s.b; correctTxt = e.s.b; }
  else if (e.t === "qa" || e.t === "fill") { good = L.sel === e.ans; correctTxt = e.ans; }
  else if (e.t === "pic_mc" || e.t === "pic_ba" || e.t === "listen_pic") { good = L.sel === e.w.a; correctTxt = e.w.a; }
  document.querySelectorAll(".opt").forEach((o) => {
    const v = o.dataset.v || o.textContent.trim();
    if (o.classList.contains("sel")) o.classList.add(good ? "ok" : "bad");
  });
  if (good) {
    bumpCombo(true);
    if (e.w) L.correctWords.add(e.w.a);
    const sp = e.w ? e.w.a : (e.s ? e.s.a : (e.ans && /[؀-ۿ]/.test(e.ans) ? e.ans : null));
    feedback(true, praise()); if (sp) speak(sp);
    $("#btn-check").textContent = "চালিয়ে যাও"; $("#btn-check").onclick = () => next(true);
  } else {
    bumpCombo(false);
    L.wrong++; loseHeart();
    if (S.hearts <= 0) { outOfHearts(); return; }
    feedback(false, "সঠিক উত্তর: " + correctTxt);
    $("#btn-check").textContent = "বুঝেছি"; $("#btn-check").onclick = () => next(false);
  }
}
export function praise() { return shuffle(["মাশাআল্লাহ! 🎉", "মারহাবা!🎉", "সুবহানাল্লাহ!", "আল্লাহু আকবার!", "চমৎকার!", "দারুণ! ⭐", "একদম ঠিক!", "বাহ্‌!"])[0]; }
export function feedback(ok, txt) {
  if (ok) sndOk(); else sndBad();
  $("#check-bar").className = ok ? "ok" : "bad";
  $("#fb-text").textContent = (ok ? "✅ " : "❌ ") + txt;
  const cb = $("#btn-check"); cb.disabled = false; cb.classList.toggle("red", !ok);
}
export function loseHeart() { S.hearts = Math.max(0, S.hearts - 1); save(); setProgress(); updateTop(); }
export function outOfHearts() {
  modal(`<div class="emo">💔</div><h2>হৃদয় শেষ!</h2><p>ভুল হলে হৃদয় কমে — এটাই খেলার নিয়ম। আগামীকাল আবার ভরে যাবে, অথবা ৩০💎 দিয়ে ভরে নাও।</p>`,
   `<button class="btn blue" onclick="buyHearts();if(S.hearts>0){renderEx()}">💎 ৩০ দিয়ে ভরো</button><div style="height:10px"></div><button class="btn ghost" onclick="closeModal();showTab('home')">বাড়ি ফিরে যাও</button>`);
}
export function next(wasOk) {
  const cb = $("#btn-check"); cb.classList.remove("red");
  L.i++;
  if (L.i >= L.ex.length) finishLesson(); else renderEx();
}
/* ── সমাপ্তি ── */
export function finishLesson() {
  speechSynthesis.cancel();
  const perfect = L.wrong === 0;
  const accuracy = (L.ex.length - L.wrong) / L.ex.length;
  const passedHalf = accuracy >= 0.5;
  const comboBonus = (L.maxCombo || 0) >= 8 ? 20 : (L.maxCombo || 0) >= 5 ? 10 : (L.maxCombo || 0) >= 3 ? 5 : 0;
  let xp = (L.review ? L.ex.length * 5 + (perfect ? 10 : 0) : L.ex.length * 10 + (perfect ? 20 : 0)) + comboBonus;
  let gems = L.review ? 2 + Math.floor(Math.random() * 4) : 5 + Math.floor(Math.random() * 6);
  const hadGoal = S.dayXP >= S.goal;
  const prevLvl = Math.min(LEVELS.length - 1, Math.floor(S.xp / 150));
  S.xp += xp; S.gems += gems; S.dayXP += xp; S.lessonsDone++; if (perfect) S.perfect++;
  const newLvl = Math.min(LEVELS.length - 1, Math.floor(S.xp / 150));
  L.leveledUp = newLvl > prevLvl ? newLvl : null;
  L.wasFirstCompletion = !L.review && (S.crowns[L.ui] || 0) === 0;
  if (!L.review) {
    S.crowns[L.ui] = Math.min(3, (S.crowns[L.ui] || 0) + 1);
    L.correctWords.forEach((w) => { const v = UNITS[L.ui].vocab.find((x) => x.a === w); if (v) S.words[w] = v.b; });
    UNITS[L.ui].vocab.forEach((v) => { if (Math.random() < .4) S.words[v.a] = v.b; });
  }
  if (!hadGoal && S.dayXP >= S.goal) xpFloat("🎯 দৈনিক লক্ষ্য!");
  bumpStreak(); S.chestCount++;
  const newBadges = BADGES.filter((b) => !S.badges[b.id] && b.chk(S));
  newBadges.forEach((b) => S.badges[b.id] = true);
  save(); updateTop();
  $("#scr-lesson").classList.remove("active");
  const R = $("#scr-result"); R.classList.add("active");
  R.innerHTML = `<div class="result-wrap">
    <div class="emo">${perfect ? "🌟" : "🎉"}</div>
    <h1>${perfect ? "নিখুঁত পাঠ! মাশাআল্লাহ!" : "পাঠ সম্পূর্ণ!"}</h1>
    <p style="color:var(--gray);font-weight:600">${L.review ? "🔁 শব্দ অনুশীলন" : UNITS[L.ui].title + " · মুকুট " + S.crowns[L.ui] + "/৩"}</p>
    <div class="result-cards">
      <div class="rcard" style="border-color:var(--gold)"><div class="top" style="background:var(--gold)">মোট XP</div><div class="val" style="color:var(--gold)">⚡${xp}</div></div>
      <div class="rcard" style="border-color:var(--blue)"><div class="top" style="background:var(--blue)">রত্ন</div><div class="val" style="color:var(--blue)">💎${gems}</div></div>
      <div class="rcard" style="border-color:var(--green)"><div class="top" style="background:var(--green)">সঠিকতা</div><div class="val" style="color:var(--green-d)">${Math.round(accuracy * 100)}%</div></div>
    </div>
    <div id="result-extra">${comboBonus ? `<p style="color:var(--orange);font-weight:800;margin-top:10px">🔥 সর্বোচ্চ কম্বো x${L.maxCombo} — বোনাস ⚡${comboBonus} XP!</p>` : ""}
    ${passedHalf ? `<div class="dua-box">
      <p class="t">🤲 জ্ঞান বৃদ্ধির দোয়া</p>
      <p class="ar">رَبِّ زِدْنِي عِلْمًا</p>
      <p class="bn">"হে আমার রব! আমার জ্ঞান বৃদ্ধি করে দিন" — সবার জন্য এই দোয়া (সূরা ত্বহা, ২০:১১৪)</p>
    </div>` : ""}</div>
    <button class="btn" onclick="afterResult()">চালিয়ে যাও</button>
  </div>`;
  L.newBadges = newBadges;
  if (perfect) celebrateConfetti();
  if (passedHalf) setTimeout(() => speak("مَا شَاءَ اللّٰهُ! مَرْحَبًا!"), 500);
  window.scrollTo(0, 0);
}
export function afterResult() {
  if (L.newBadges && L.newBadges.length) {
    const b = L.newBadges.shift();
    modal(`<div class="emo">${b.emo}</div><h2>নতুন অর্জন: ${b.nm}</h2><p>${b.desc}</p>`, `<button class="btn" onclick="closeModal();afterResult()">দারুণ!</button>`);
    return;
  }
  if (L.leveledUp != null) {
    const lvl = L.leveledUp; L.leveledUp = null;
    modal(`<div class="emo">${LEVELS[lvl].e}</div><h2>লেভেল আপ! 🎉</h2><p>তুমি এখন <b>লেভেল ${lvl + 1}</b>: ${LEVELS[lvl].t}!</p>`, `<button class="btn" onclick="closeModal();afterResult()">দারুণ!</button>`);
    return;
  }
  if (S.chestCount % 3 === 0 && S.chestCount > 0) {
    S.chestCount++; // যেন বারবার না আসে
    const r = Math.random(), prize = r < .5 ? { e: "💎", t: "রত্ন", v: 10 + Math.floor(Math.random() * 15) } : r < .8 ? { e: "⚡", t: "বোনাস XP", v: 20 + Math.floor(Math.random() * 30) } : { e: "❤️", t: "হৃদয় রিফিল", v: 0 };
    if (prize.t === "রত্ন") S.gems += prize.v; else if (prize.t === "বোনাস XP") S.xp += prize.v; else S.hearts = 5;
    save(); updateTop();
    modal(`<div class="emo">🎁</div><h2>রহস্য সিন্দুক!</h2><p>তুমি পেলে: ${prize.e} ${prize.v || "সম্পূর্ণ"} ${prize.t}!</p>`, `<button class="btn" onclick="closeModal();afterResult()">আলহামদুলিল্লাহ!</button>`);
    return;
  }
  if (L && L.wasFirstCompletion && !(S.visualDone && S.visualDone[L.ui])) {
    if (maybeVisualChallenge(L.ui)) return;
  }
  showTab("home");
}
