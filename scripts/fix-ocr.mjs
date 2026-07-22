/* ════════ OCR ত্রুটি সংশোধন ════════
   কাঁচা OCR-এ তিন ধরনের সমস্যা আছে; তিনভাবেই ধরা হয়:

   ১) অদৃশ্য দিক-চিহ্ন (RLM/LRM) ও ল্যাটিন আবর্জনা — সরাসরি মুছে ফেলা হয়।

   ২) নুক্তার ভুল — OCR অক্ষরের *আকৃতি* প্রায় ঠিক পড়ে, কিন্তু নুক্তা (বিন্দু)
      ভুল করে: ق↔ف, ت↔ب↔ن↔ث↔ي, ر↔ز, د↔ذ ইত্যাদি। তাই প্রতিটি শব্দের
      "কঙ্কাল" (rasm — হারাকাত ও নুক্তা ছাড়া) বের করে মিলিয়ে দেখা হয়।

   ৩) কোনটি সঠিক তা ঠিক করতে দুটি কর্তৃপক্ষ:
      • content/ — মানুষের যাচাই করা ৫৭০+ শব্দ (সর্বোচ্চ নির্ভরযোগ্য)
      • বইয়ের নিজের পরিসংখ্যান — একই কঙ্কালের কোনো রূপ বহু পৃষ্ঠায় থাকলে
        সেটিই সঠিক, আর ১-২ বার আসা রূপটি সম্ভবত OCR-এর ভুল

   ⚠️ কাঁচা OCR কখনো মুছে ফেলা হয় না — সংশোধিত রূপ আলাদা ফিল্ডে রাখা হয়,
      যাতে যেকোনো সময় মিলিয়ে দেখা যায়।

   চালাও:  npm run fix:ocr                                                  */
import fs from "node:fs";
import path from "node:path";

const PAGES = "book-text/pages";

/* ── ১. পরিচ্ছন্ন করা ── */
const DIR_MARKS = /[‎‏‪-‮⁦-⁩﻿]/g;
export function clean(t) {
  return String(t || "")
    .replace(DIR_MARKS, "")
    .split("\n")
    .map((line) => {
      // আরবি/বাংলা আছে এমন লাইনে ঢুকে পড়া বিচ্ছিন্ন ল্যাটিন/সংখ্যার টুকরো ফেলে দাও
      if (/[ঀ-৿؀-ۿ]/.test(line)) line = line.replace(/(^|\s)[A-Za-z0-9@#$%^&*_=+~`|\\/<>[\]{}]{1,4}(?=\s|$)/g, " ");
      return line.replace(/[ \t]+/g, " ").trim();
    })
    .filter((l) => l.length >= 2 && /[ঀ-৿؀-ۿ]/.test(l))
    .join("\n");
}

/* ── ২. আরবি স্বাভাবিকীকরণ ও কঙ্কাল ── */
const HARAKAT = /[ً-ْٰـ]/g;      // হারাকাত + খঞ্জর আলিফ + তাতভীল
export const stripHarakat = (w) => w.replace(HARAKAT, "");
/* একই আকৃতির অক্ষরগুলোকে এক প্রতিনিধিতে নামাও — নুক্তার ভুল উপেক্ষা করতে */
const SKELETON = [
  [/[بتثنيىئ]/g, "ب"], [/[جحخ]/g, "ج"], [/[دذ]/g, "د"], [/[رز]/g, "ر"],
  [/[سش]/g, "س"], [/[صض]/g, "ص"], [/[طظ]/g, "ط"], [/[عغ]/g, "ع"],
  [/[فق]/g, "ف"], [/[هة]/g, "ه"], [/[اأإآٱ]/g, "ا"], [/[وؤ]/g, "و"], [/[ءئ]/g, "ء"],
];
export function rasm(word) {
  let w = stripHarakat(word);
  for (const [re, to] of SKELETON) w = w.replace(re, to);
  return w;
}

/* ── ৩. যাচাই করা অভিধান (content/) ── */
function verifiedWords() {
  const words = new Map();   // harakat-স্ট্রিপড রূপ → পূর্ণ হারাকাতযুক্ত রূপ
  const add = (a) => {
    for (const w of String(a || "").split(/\s+/)) {
      const bare = stripHarakat(w).replace(/[^؀-ۿ]/g, "");
      if (bare.length >= 2) words.set(bare, w.replace(/[^؀-ۿً-ْٰ]/g, ""));
    }
  };
  const dir = "content/lessons";
  for (const f of fs.readdirSync(dir)) {
    const L = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    L.vocab.forEach((v) => add(v.a));
    L.sents.forEach((s) => add(s.a));
    (L.qa || []).forEach((q) => { add(q.q); q.o.forEach(add); });
    (L.fill || []).forEach((q) => { add(q.q); q.o.forEach(add); });
  }
  for (const f of fs.readdirSync("content/stories")) {
    JSON.parse(fs.readFileSync(path.join("content/stories", f), "utf8")).lines.forEach((l) => add(l.a));
  }
  return words;
}

/* ── চালানো ── */
const files = fs.readdirSync(PAGES).filter((f) => f.endsWith(".json")).sort();
const raw = files.map((f) => ({ f, j: JSON.parse(fs.readFileSync(path.join(PAGES, f), "utf8")) }));

const verified = verifiedWords();
/* কঙ্কাল → যাচাই করা রূপ */
const verifiedByRasm = new Map();
for (const [bare, full] of verified) {
  const k = rasm(bare);
  if (!verifiedByRasm.has(k)) verifiedByRasm.set(k, new Set());
  verifiedByRasm.get(k).add(full);
}

/* বইয়ের নিজের শব্দ-পরিসংখ্যান (কোন রূপ কতবার এসেছে) */
const freq = new Map();
for (const { j } of raw) {
  for (const w of (clean(j.arabic) + "\n" + clean(j.mixed)).match(/[؀-ۿً-ْ]+/g) || []) {
    const bare = stripHarakat(w);
    if (bare.length >= 2) freq.set(bare, (freq.get(bare) || 0) + 1);
  }
}
/* কঙ্কাল → সবচেয়ে বেশিবার আসা রূপ */
const topByRasm = new Map();
for (const [w, n] of freq) {
  const k = rasm(w);
  const cur = topByRasm.get(k);
  if (!cur || n > cur.n) topByRasm.set(k, { w, n });
}

const stats = { tokens: 0, byDict: 0, byFreq: 0, unchanged: 0 };
const examples = [];
const allEdits = [];

/* কতটা কঠোর — এই সীমাগুলোই ভুল সংশোধন ঠেকায়।
   ছোট শব্দে কঙ্কাল প্রায় অর্থহীন: أنه আর آية দুটোরই কঙ্কাল "اٮه", অথচ শব্দ দুটো
   সম্পূর্ণ আলাদা। তাই ছোট শব্দে হাত দেওয়া হয় না — নইলে ঠিক লেখাই নষ্ট হয়।

   পরিমাপ করে দেখা গেছে: ৫ অক্ষরের শব্দে ভুল সংশোধনের হার ~১৫-২০%, কিন্তু
   ৬+ অক্ষরে তা ~২%-এ নেমে আসে — লম্বা কঙ্কালে দুটি ভিন্ন শব্দ মিলে যাওয়ার
   সম্ভাবনা অনেক কম। তাই সীমা ৬। */
const MIN_LEN = 6;        // এর চেয়ে ছোট শব্দ ছোঁয়া হয় না (মেপে ঠিক করা)
const MAX_SRC_FREQ = 2;   // বইয়ে ২ বারের বেশি এলে ধরে নাও এটি আসল শব্দ, OCR ভুল নয়
const MIN_TGT_FREQ = 8;   // বদলি রূপটি অন্তত এতবার থাকতে হবে
const RATIO = 6;          // বদলি রূপ উৎসের চেয়ে অন্তত এতগুণ বেশি হতে হবে

/* সুরক্ষিত শব্দ — এগুলো আসল আরবি শব্দ, বইয়ে বিরল হলেও OCR-এর ভুল নয়।
   যাচাই করতে গিয়ে দেখা গেছে কঙ্কাল-মিলে এগুলো ভুলভাবে বদলে যাচ্ছিল
   (যেমন لِلنَّبِيِّ "নবীর জন্য" → لِلْبِنْتِ "মেয়ের জন্য" — অর্থই পাল্টে যেত)। */
const PROTECTED = new Set([
  "للنبي", "البيان", "الغيب", "تعبده", "ابنها", "القتل", "السخي", "نجينا",
  "الصيف", "ليتني", "احببت", "أحببت", "تحبين", "تجبين", "يزكوا", "الغنى",
  "بأيها", "بايها", "علبنا", "اللبل", "الامر", "الجثة", "الجّئة",
  // দ্বিতীয় দফা যাচাইয়ে ধরা পড়া আসল শব্দ
  "الشباب", "نستطيع", "التائب", "الآنية", "تعيدون", "المؤدن", "الفراح",
]);

function fixWord(token) {
  const bare = stripHarakat(token);
  stats.tokens++;
  if (verified.has(bare)) { stats.unchanged++; return token; }   // ইতিমধ্যেই সঠিক

  if (PROTECTED.has(bare)) { stats.unchanged++; return token; }

  const srcFreq = freq.get(bare) || 0;
  // যথেষ্ট লম্বা, এবং বইয়ে বিরল — অর্থাৎ সম্ভবত OCR-এর ভুল, আসল শব্দ নয়
  if (bare.length < MIN_LEN || srcFreq > MAX_SRC_FREQ) { stats.unchanged++; return token; }

  const k = rasm(bare);
  if (k.length < MIN_LEN) { stats.unchanged++; return token; }

  // (ক) যাচাই করা অভিধানে একটিমাত্র মিল — সর্বোচ্চ কর্তৃপক্ষ
  const v = verifiedByRasm.get(k);
  if (v && v.size === 1) {
    const fix = [...v][0];
    if (stripHarakat(fix) !== bare) {
      stats.byDict++;
      allEdits.push({ from: token, to: fix, by: "অভিধান" });
      if (examples.length < 60) examples.push({ from: token, to: fix, by: "অভিধান" });
      return fix;
    }
  }
  // (খ) বইয়ের ভেতরের সাক্ষ্য — একই কঙ্কালের রূপটি বহুবার এলে সেটিই সঠিক
  const t = topByRasm.get(k);
  if (t && t.w !== bare && t.n >= MIN_TGT_FREQ && t.n >= srcFreq * RATIO) {
    stats.byFreq++;
    allEdits.push({ from: token, to: t.w, by: "পুনরাবৃত্তি" });
    if (examples.length < 60) examples.push({ from: token, to: t.w, by: "পুনরাবৃত্তি" });
    return t.w;
  }
  stats.unchanged++;
  return token;
}

const fixText = (t) => t.replace(/[؀-ۿً-ْ]+/g, (m) => fixWord(m));

let written = 0;
for (const { f, j } of raw) {
  const cleanMixed = clean(j.mixed);
  const cleanArabic = clean(j.arabic);
  j.mixedFixed = fixText(cleanMixed);
  j.arabicFixed = fixText(cleanArabic);
  fs.writeFileSync(path.join(PAGES, f), JSON.stringify(j, null, 1) + "\n");
  written++;
}

/* প্রতিটি সংশোধন আলাদা ফাইলে — যেন সব কটি চোখে দেখে যাচাই করা যায় */
const tally = new Map();
for (const e of allEdits) {
  const key = `${e.from}\t${e.to}\t${e.by}`;
  tally.set(key, (tally.get(key) || 0) + 1);
}
const report = [...tally.entries()].sort((a, b) => b[1] - a[1])
  .map(([k, n]) => { const [from, to, by] = k.split("\t"); return { from, to, by, times: n }; });
fs.writeFileSync("book-text/ocr-corrections.json", JSON.stringify({
  note: "OCR-এ যেসব শব্দ সংশোধন করা হয়েছে তার পূর্ণ তালিকা — যাচাই করার জন্য।",
  total: allEdits.length, distinct: report.length, corrections: report,
}, null, 1) + "\n");

console.log(`✓ ${written} পৃষ্ঠা সংশোধিত (কাঁচা OCR অক্ষত আছে)`);
console.log(`  আরবি শব্দ পরীক্ষা: ${stats.tokens.toLocaleString()}`);
console.log(`  অভিধান থেকে ঠিক করা: ${stats.byDict.toLocaleString()}`);
console.log(`  পুনরাবৃত্তি দেখে ঠিক করা: ${stats.byFreq.toLocaleString()}`);
console.log(`\nউদাহরণ:`);
examples.slice(0, 18).forEach((e) => console.log(`  ${e.from}  →  ${e.to}   (${e.by})`));
