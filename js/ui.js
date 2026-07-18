import { $, esc } from "./utils.js";
import { S, CUR, DEF, save, flushSave } from "./state.js";
import { UNITS, SECTIONS, STORIES, BADGES, LEVELS, RIVALS, totalCrowns } from "./data.js";
import { updateSoundBtn } from "./tts.js";

export function updateTop() { $("#st-streak").textContent = S.streak; $("#st-gems").textContent = S.gems; $("#st-hearts").textContent = S.hearts; updateSoundBtn(); }
export function xpFloat(t) { const d = document.createElement("div"); d.className = "xp-float"; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 1100); }
export function comboFloat(t) { const d = document.createElement("div"); d.className = "combo-badge"; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 950); }
export function celebrateConfetti() {
  const colors = ["#58cc02", "#1cb0f6", "#ffc800", "#ce82ff", "#ff4b4b", "#ff9600"];
  const wrap = document.createElement("div");
  wrap.className = "confetti-wrap";
  for (let i = 0; i < 46; i++) {
    const p = document.createElement("div");
    p.className = "confetti-piece";
    p.style.left = Math.random() * 100 + "%";
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = (Math.random() * 0.4) + "s";
    p.style.animationDuration = (1.8 + Math.random() * 1.2) + "s";
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    wrap.appendChild(p);
  }
  document.body.appendChild(wrap);
  setTimeout(() => wrap.remove(), 3200);
}
export function modal(html, btns) { $("#modal-box").innerHTML = html + (btns || ""); $("#modal").classList.add("show"); }
export function closeModal() { $("#modal").classList.remove("show"); }

/* ════════ TABS ════════ */
export function showTab(t) {
  ["home", "words", "league", "profile"].forEach((x) => {
    $("#scr-" + x).classList.toggle("active", x === t);
    $("#tab-" + x).classList.toggle("on", x === t);
  });
  $("#scr-lesson").classList.remove("active"); $("#scr-result").classList.remove("active"); $("#scr-story").classList.remove("active"); $("#scr-vocab").classList.remove("active"); $("#scr-visual").classList.remove("active");
  $("#topbar").style.display = "flex"; $("#tabbar").style.display = "flex";
  if (t === "home") renderPath(); if (t === "words") renderWords();
  if (t === "league") renderLeague(); if (t === "profile") renderProfile();
}

/* ════════ HOME PATH ════════ */
export function unitState(i) {
  const c = S.crowns[i] || 0;
  if (c >= 3) return "done";
  if (i === 0) return "avail";
  return (S.crowns[i - 1] || 0) >= 1 ? "avail" : "locked";
}
const SEC_GRAD = ["linear-gradient(135deg,#58cc02,#3a9c00)", "linear-gradient(135deg,#1cb0f6,#0d84c4)", "linear-gradient(135deg,#ce82ff,#9a3fe0)", "linear-gradient(135deg,#ff9600,#e07200)"];
export function renderPath() {
  const p = $("#path");
  const gPct = Math.min(100, Math.round(S.dayXP / S.goal * 100));
  let h = `<div style="text-align:center;padding:4px 20px 0">
   <div style="font-size:13px;color:var(--gray);font-weight:700">📕 এসো আরবি শিখি · সম্পূর্ণ কিতাব (৩ খণ্ড)</div>
   <div style="font-size:16px;font-weight:800;margin-top:2px">ইলমের সফরে স্বাগতম, ${esc(CUR || "বন্ধু")}! 🌙</div>
   <div style="margin:12px 16px 0;border:2px solid var(--line);border-radius:14px;padding:10px 14px;text-align:right">
     <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:800">
       <span style="color:${gPct >= 100 ? "var(--green-d)" : "var(--gray)"}">${gPct >= 100 ? "🎯 লক্ষ্য অর্জিত! মাশাআল্লাহ" : "🎯 আজকের লক্ষ্য"}</span>
       <span style="color:var(--gray)">⚡${Math.min(S.dayXP, S.goal)}/${S.goal} XP</span>
     </div>
     <div style="height:10px;background:var(--line);border-radius:6px;margin-top:6px;overflow:hidden">
       <div style="height:100%;width:${gPct}%;background:${gPct >= 100 ? "var(--green)" : "var(--gold)"};border-radius:6px;transition:width .4s"></div>
     </div>
   </div></div>`;
  // শেখা শব্দ যথেষ্ট হলে হোম থেকেই দ্রুত অনুশীলন — খুঁজতে হবে না
  const learnedCount = Object.keys(S.words).length;
  if (learnedCount >= 4) h += `<div style="padding:12px 16px 0"><button class="btn blue" onclick="startReview()">🔁 শেখা শব্দ অনুশীলন করো (${learnedCount}টি)</button></div>`;
  SECTIONS.forEach((sec, si) => {
    const done = UNITS.slice(sec.from, sec.to + 1).filter((u) => (S.crowns[u.id] || 0) > 0).length;
    const tot = sec.to - sec.from + 1;
    h += `<div style="margin:24px 16px 4px;background:${SEC_GRAD[si % SEC_GRAD.length]};border-radius:16px;padding:13px 18px;color:#fff;display:flex;justify-content:space-between;align-items:center;box-shadow:0 4px 0 rgba(0,0,0,.15)">
      <div><div style="font-size:16.5px;font-weight:800">${sec.ic} ${sec.t}</div>
      <div style="font-size:12.5px;opacity:.92;margin-top:1px">${sec.s}</div></div>
      <div style="font-size:13px;font-weight:800;background:rgba(255,255,255,.22);border-radius:10px;padding:4px 9px;white-space:nowrap">${done}/${tot}</div>
    </div>`;
    UNITS.slice(sec.from, sec.to + 1).forEach((u) => {
      const i = u.id, st = unitState(i), c = S.crowns[i] || 0;
      const off = i % 4 === 1 ? "offset-l" : i % 4 === 3 ? "offset-r" : "";
      h += `<div class="unit-head"><h2>${u.icon} ${u.title}</h2><p>${u.sub}</p></div>
      <div class="node-row"><div class="node-wrap ${off}">
        <button class="node ${st}" onclick="tapUnit(${i})">${st === "locked" ? "🔒" : st === "done" ? "🏆" : u.icon}
          ${c > 0 ? `<span class="crowns">👑${c}</span>` : ""}
        </button>
        <div class="node-label">${st === "done" ? "সম্পূর্ণ!" : st === "locked" ? "তালাবদ্ধ" : "শুরু করো"}</div>
      </div></div>`;
      const story = STORIES.find((s) => s.afterId === i);
      if (story) {
        const idx = STORIES.indexOf(story);
        const unlocked = S.isAdmin || (S.crowns[story.afterId] || 0) > 0;
        const doneS = S.storiesDone && S.storiesDone[story.id];
        h += `<div class="story-card ${unlocked ? "" : "locked"}" onclick="${unlocked ? `openStory(${idx})` : `storyLockedMsg()`}">
          <div class="emo">${doneS ? "✅" : story.icon}</div>
          <div class="txt"><div class="t">📖 গল্প · ${story.title}</div><div class="s">${unlocked ? story.sub : "আগে উপরের পাঠে ন্যূনতম ১টি মুকুট জেতো"}</div></div>
        </div>`;
      }
    });
  });
  h += `<div style="text-align:center;padding:10px;color:var(--gray);font-weight:700;font-size:13px">১ম খণ্ডের ৩ অধ্যায় + ২য়-৩য় খণ্ডের নির্যাস — সম্পূর্ণ কিতাব, আলহামদুলিল্লাহ 🤲</div>`;
  p.innerHTML = h;
}
export function storyLockedMsg() { modal(`<div class="emo">🔒</div><h2>গল্পটি এখনো তালাবদ্ধ</h2><p>এই গল্পের আগের পাঠে অন্তত ১টি মুকুট (👑) জিতলে গল্পটি খুলবে।</p>`, `<button class="btn blue" onclick="closeModal()">ঠিক আছে</button>`); }
export function tapUnit(i) {
  const st = unitState(i);
  if (st === "locked" && !S.isAdmin) { modal(`<div class="emo">🔒</div><h2>এখনো তালাবদ্ধ</h2><p>আগের পাঠে অন্তত ১টি মুকুট (👑) জিতলে এই পাঠ খুলবে।</p>`, `<button class="btn blue" onclick="closeModal()">ঠিক আছে</button>`); return; }
  if (S.hearts <= 0 && !S.isAdmin) { modal(`<div class="emo">💔</div><h2>হৃদয় শেষ!</h2><p>আগামীকাল হৃদয়গুলো আবার ভরে যাবে। অথবা ৩০ 💎 দিয়ে এখনই ভরে নাও।</p>`,
   `<button class="btn blue" onclick="buyHearts()">💎 ৩০ দিয়ে ভরো</button><div style="height:10px"></div><button class="btn ghost" onclick="closeModal()">পরে</button>`); return; }
  const u = UNITS[i], c = S.crowns[i] || 0;
  const adminNote = (st === "locked" && S.isAdmin) ? `<p style="color:var(--purple);font-weight:800">👑 এডমিন প্রিভিউ — তালাবদ্ধ পাঠ, তবু খোলা যাচ্ছে</p>` : "";
  modal(`<div class="emo">${u.icon}</div><h2>${u.title}</h2><p>${u.sub}<br>মুকুট: ${"👑".repeat(c) || "—"} (${c}/৩)</p>${adminNote}<div class="tipbox">${u.tip}</div>`,
   `<button class="btn" onclick="closeModal();openVocabIntro(${i})">শুরু করো +XP</button><div style="height:10px"></div><button class="btn ghost" onclick="closeModal()">বাতিল</button>`);
}
export function buyHearts() {
  if (S.gems >= 30) { S.gems -= 30; S.hearts = 5; save(); updateTop(); closeModal(); xpFloat("❤️❤️❤️❤️❤️"); }
  else { modal(`<div class="emo">💎</div><h2>যথেষ্ট রত্ন নেই</h2><p>পাঠ শেষ করে রত্ন জেতো!</p>`, `<button class="btn blue" onclick="closeModal()">ঠিক আছে</button>`); }
}

/* ════════ WORDS ════════ */
export function renderWords() {
  const list = $("#word-list"), ws = Object.entries(S.words);
  if (!ws.length) { list.innerHTML = `<div style="text-align:center;padding:40px 0;color:var(--gray);font-weight:700"><div style="font-size:52px;margin-bottom:10px">📖</div>এখনো কোনো শব্দ শেখোনি।<br>প্রথম পাঠ শুরু করো! 🌱</div>`; return; }
  list.innerHTML = `<button class="btn blue" style="margin-bottom:14px" onclick="startReview()">🔁 শব্দ অনুশীলন করো (${ws.length}টি শব্দ)</button>`
   + ws.map(([a, b]) => `<div class="word-row"><span class="ar">${a}</span><span class="bn">${b}</span><button onclick="speak('${a}')">🔊</button></div>`).join("");
}
/* ════════ LEADERBOARD ════════ */
export function renderLeague() {
  if (!S.rivalXP) { S.rivalXP = RIVALS.map(() => Math.floor(Math.random() * 400) + 30); save(); }
  const rows = RIVALS.map((n, i) => ({ n, xp: S.rivalXP[i], me: false }));
  rows.push({ n: CUR || "তুমি", xp: S.xp, me: true });
  rows.sort((a, b) => b.xp - a.xp);
  $("#lb-list").innerHTML = rows.map((r, i) => `<div class="lb-row ${r.me ? "me" : ""}">
    <span class="rank">${i + 1}</span><span>${i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "🔹"}</span>
    <span>${esc(r.n)}</span><span class="xps">⚡${r.xp} XP</span></div>`).join("")
    + `<p style="color:var(--gray);font-size:12.5px;font-weight:600;margin-top:12px;text-align:center">প্রতি সপ্তাহে তালিকা নতুন করে শুরু হয় — প্রতিদিন অনুশীলন করে শীর্ষে থাকো!</p>`;
}
/* ════════ PROFILE ════════ */
export function renderProfile() {
  const lvl = Math.min(LEVELS.length - 1, Math.floor(S.xp / 150));
  $("#pf-av").textContent = LEVELS[lvl].e;
  $("#pf-title").innerHTML = `${esc(CUR || "")}${S.isAdmin ? '<span class="admin-tag">👑 এডমিন</span>' : ""}<br><span style="font-size:15px;color:var(--gray)">${LEVELS[lvl].t}</span>`;
  $("#pf-sub").textContent = `লেভেল ${lvl + 1} · পরের লেভেলে ${150 - (S.xp % 150)} XP বাকি`;
  $("#pf-xp").textContent = S.xp; $("#pf-streak").textContent = S.streak + " 🔥";
  $("#pf-crowns").textContent = totalCrowns(S) + "/" + (UNITS.length * 3); $("#pf-words").textContent = Object.keys(S.words).length;
  $("#badge-grid").innerHTML = BADGES.map((b) => `<div class="badge ${S.badges[b.id] ? "" : "off"}"><div class="emo">${b.emo}</div><div class="nm">${b.nm}</div><div style="font-size:10.5px;color:var(--gray);font-weight:600">${b.desc}</div></div>`).join("");
  const wrap = $("#admin-panel-wrap");
  if (S.isAdmin) {
    const unitRows = UNITS.map((u) => `<div class="admin-row"><span class="an">${u.icon} ${u.title}</span><button onclick="startLesson(${u.id})">প্রিভিউ</button></div>`).join("");
    const storyRows = STORIES.map((s, idx) => `<div class="admin-row"><span class="an">📖 ${s.title}</span><button class="gold" onclick="openStory(${idx})">প্রিভিউ</button></div>`).join("");
    wrap.innerHTML = `<details class="admin-acc"><summary>🛠️ এডমিন প্যানেল — সব পাঠ ও গল্প যাচাই করো</summary>
      <p style="color:var(--gray);font-weight:600;font-size:13px;margin:8px 0">তালাবদ্ধ থাকলেও যেকোনো পাঠ/গল্প সরাসরি খুলে মান যাচাই করতে পারবে।</p>
      <div style="margin-top:6px">${unitRows}</div>
      <div style="margin-top:14px;font-weight:800;color:var(--purple)">📖 গল্পসমূহ</div>
      <div>${storyRows}</div>
    </details>`;
  } else { wrap.innerHTML = ""; }
}
export function resetAll() {
  if (confirm("সত্যিই সব প্রগ্রেস মুছে ফেলবে?")) {
    Object.assign(S, DEF, { introShown: true });
    flushSave();
    location.reload();
  }
}
