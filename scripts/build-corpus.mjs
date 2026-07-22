/* ════════ OCR পৃষ্ঠা → অনুসন্ধানযোগ্য কর্পাস + ভেক্টর ════════
   book-text/pages/*.json (কাঁচা OCR) থেকে তৈরি করে:

     book-text/corpus.jsonl   — খণ্ড-খণ্ড (chunk) করা লেখা, প্রতিটির সাথে
                                খণ্ড/পৃষ্ঠা/বইয়ের-পৃষ্ঠা তথ্য
     book-text/vectors.json   — প্রতিটি খণ্ডের TF-IDF ভেক্টর + অভিধান
     book-text/index.json     — সারসংক্ষেপ (কোন খণ্ড কোথায়)

   ভেক্টর সম্পর্কে সৎ কথা: এগুলো TF-IDF ভেক্টর — সম্পূর্ণ অফলাইনে, কোনো
   পেইড API ছাড়াই তৈরি। শব্দ-মিলের ভিত্তিতে খোঁজে, অর্থ বোঝে না। পরে
   নিউরাল এমবেডিং যোগ করতে চাইলে corpus.jsonl-ই ইনপুট — কাঠামো বদলাতে হবে না।

   চালাও:  npm run build:corpus                                            */
import fs from "node:fs";
import path from "node:path";

const PAGES = "book-text/pages";
const OUT = "book-text";

/* বইয়ের খণ্ড ও পৃষ্ঠা-অফসেট (book-notes থেকে যাচাই করা) */
const PARTS = [
  { part: "১ম খণ্ড", from: 1,   to: 102, bookPageOffset: +2  },
  { part: "২য় খণ্ড", from: 103, to: 255, bookPageOffset: -102 },
  { part: "৩য় খণ্ড", from: 256, to: 446, bookPageOffset: -255 },
];
const partOf = (p) => PARTS.find((x) => p >= x.from && p <= x.to) || PARTS[PARTS.length - 1];

/* OCR-এর আবর্জনা কমানো: খুব ছোট/অর্থহীন লাইন বাদ */
const cleanLines = (t) => String(t || "").split("\n")
  .map((l) => l.replace(/[ \t]+/g, " ").trim())
  .filter((l) => l.length >= 2)
  .filter((l) => /[ঀ-৿؀-ۿ]/.test(l));   // বাংলা বা আরবি আছে এমন লাইনই রাখো

const files = fs.readdirSync(PAGES).filter((f) => f.endsWith(".json")).sort();
if (!files.length) { console.error("✖ book-text/pages খালি — আগে node scripts/ocr-book.mjs চালাও"); process.exit(1); }

const chunks = [];
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(path.join(PAGES, f), "utf8"));
  const meta = partOf(j.page);
  // সংশোধিত রূপ থাকলে সেটিই ব্যবহার করো (fix-ocr.mjs তৈরি করে), নইলে কাঁচা OCR
  const bn = cleanLines(j.mixedFixed ?? j.mixed);
  const ar = cleanLines(j.arabicFixed ?? j.arabic);
  const text = bn.join("\n");
  if (!text && !ar.length) continue;
  chunks.push({
    id: `p${String(j.page).padStart(3, "0")}`,
    pdfPage: j.page,
    part: meta.part,
    bookPage: j.page + meta.bookPageOffset,   // বইয়ে ছাপা পৃষ্ঠা নম্বর
    text,                                      // বাংলা+আরবি পাঠ (নির্দেশনার জন্য ভালো)
    arabic: ar.join("\n"),                     // শুধু আরবি পাঠ (আরবির জন্য ভালো)
  });
}

/* ── TF-IDF ভেক্টর ── */
/* বাংলা বা আরবি অক্ষর নেই এমন টোকেন বাদ — OCR-এর ল্যাটিন আবর্জনা
   ("Fe", "Fpl", "G25"…) নইলে শব্দভাণ্ডার ভরিয়ে ফেলে */
const tokenize = (s) => String(s || "")
  .replace(/[ً-ْٰ]/g, "")       // হারাকাত সরিয়ে মিল বাড়াও (OCR-এ এগুলো অনির্ভরযোগ্য)
  .split(/[^ঀ-৿؀-ۿa-zA-Z0-9]+/)
  .filter((w) => w.length >= 2 && /[ঀ-৿؀-ۿ]/.test(w));

const docTokens = chunks.map((c) => tokenize(c.text + " " + c.arabic));
const df = new Map();
docTokens.forEach((toks) => new Set(toks).forEach((t) => df.set(t, (df.get(t) || 0) + 1)));
/* একটিমাত্র পৃষ্ঠায় থাকা শব্দও রাখা হয় — কোনো বিষয় ঠিক এক পৃষ্ঠাতেই আলোচিত
   হলে সেই শব্দই সবচেয়ে কাজের অনুসন্ধান-সূত্র। শুধু অতি-সাধারণ শব্দ বাদ। */
const vocab = [...df.entries()]
  .filter(([, n]) => n <= chunks.length * 0.6)
  .map(([t]) => t).sort();
const vIndex = new Map(vocab.map((t, i) => [t, i]));
const N = chunks.length;
const idf = vocab.map((t) => Math.log(1 + N / (1 + df.get(t))));

const vectors = docTokens.map((toks) => {
  const tf = new Map();
  toks.forEach((t) => { const i = vIndex.get(t); if (i !== undefined) tf.set(i, (tf.get(i) || 0) + 1); });
  let norm = 0;
  const sparse = [];
  for (const [i, n] of tf) { const w = (1 + Math.log(n)) * idf[i]; sparse.push([i, w]); norm += w * w; }
  norm = Math.sqrt(norm) || 1;
  return sparse.map(([i, w]) => [i, +(w / norm).toFixed(5)]);   // একক দৈর্ঘ্যে normalize
});

fs.writeFileSync(path.join(OUT, "corpus.jsonl"), chunks.map((c) => JSON.stringify(c)).join("\n") + "\n");
fs.writeFileSync(path.join(OUT, "vectors.json"), JSON.stringify({
  note: "TF-IDF ভেক্টর (অফলাইন, API ছাড়া)। vectors[i] ↔ corpus.jsonl-এর i-তম লাইন। প্রতিটি [শব্দসূচক, ওজন]।",
  dim: vocab.length, count: chunks.length, vocab, idf: idf.map((x) => +x.toFixed(4)), vectors,
}));
fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify({
  note: "কোন পৃষ্ঠা কোন খণ্ডে — দ্রুত দেখার জন্য।",
  pages: chunks.map((c) => ({ id: c.id, pdfPage: c.pdfPage, bookPage: c.bookPage, part: c.part, chars: c.text.length + c.arabic.length })),
}, null, 1));

console.log(`✓ ${chunks.length} পৃষ্ঠা → corpus.jsonl`);
console.log(`✓ ভেক্টর: ${chunks.length} × ${vocab.length} মাত্রা → vectors.json`);
