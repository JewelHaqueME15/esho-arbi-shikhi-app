/* ════════ বইয়ে খোঁজো ════════
   OCR করা বইয়ের ভেতরে অনুসন্ধান — কোন পৃষ্ঠায় কী আছে দ্রুত বের করার জন্য।

   চালাও:
     node scripts/search-book.mjs "ইদাফা"
     node scripts/search-book.mjs "الشمس" --top 5
     node scripts/search-book.mjs "সূর্য হরফ" --part "১ম খণ্ড"                */
import fs from "node:fs";

const q = process.argv[2];
if (!q) { console.error('ব্যবহার: node scripts/search-book.mjs "যা খুঁজছ" [--top 8] [--part "২য় খণ্ড"]'); process.exit(1); }
const argOf = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const TOP = Number(argOf("--top", 8));
const PART = argOf("--part", null);

const corpus = fs.readFileSync("book-text/corpus.jsonl", "utf8").trim().split("\n").map((l) => JSON.parse(l));
const V = JSON.parse(fs.readFileSync("book-text/vectors.json", "utf8"));
const vIndex = new Map(V.vocab.map((t, i) => [t, i]));

const tokenize = (s) => String(s || "").replace(/[ً-ْٰ]/g, "").split(/[^ঀ-৿؀-ۿa-zA-Z0-9]+/)
  .filter((w) => w.length >= 2 && /[ঀ-৿؀-ۿ]/.test(w));

/* বাংলা রূপভেদে বদলায় (হরফ → হরফের/হরফগুলো), তাই হুবহু না মিললে
   উপসর্গ-মিল দেখা হয় — যাতে "হরফ" লিখলেও "হরফের" খুঁজে পাওয়া যায় */
const expand = (t) => {
  if (vIndex.has(t)) return [t];
  const hits = V.vocab.filter((v) => v.startsWith(t) || (t.length >= 4 && v.includes(t)));
  return hits.slice(0, 12);
};

/* প্রশ্নটিকেও একই নিয়মে ভেক্টরে বদলাও, তারপর cosine similarity */
const qtf = new Map();
const usedTerms = [];
tokenize(q).forEach((t) => {
  const forms = expand(t);
  if (forms.length) usedTerms.push(...forms);
  forms.forEach((f) => { const i = vIndex.get(f); if (i !== undefined) qtf.set(i, (qtf.get(i) || 0) + 1); });
});
/* ভেক্টরে না মিললেও হাল ছেড়ো না — সরাসরি লেখার ভেতর খুঁজে দেখো
   (OCR-এ ভাঙা বানান বা খুব বিরল শব্দের জন্য নিরাপত্তা-জাল) */
if (!qtf.size) {
  const needle = q.replace(/[ً-ْٰ]/g, "").trim();
  const lit = corpus.filter((c) => (c.text + "\n" + c.arabic).replace(/[ً-ْٰ]/g, "").includes(needle))
    .filter((c) => !PART || c.part === PART).slice(0, TOP);
  if (!lit.length) { console.log("কিছু পাওয়া যায়নি — অন্য শব্দে চেষ্টা করো।"); process.exit(0); }
  console.log(`"${q}" — হুবহু লেখা মিলেছে ${lit.length}টি পৃষ্ঠায়:\n`);
  for (const c of lit) {
    const line = (c.text + "\n" + c.arabic).split("\n").find((l) => l.replace(/[ً-ْٰ]/g, "").includes(needle)) || "";
    console.log(`  ${c.part} · বইয়ের পৃষ্ঠা ${c.bookPage} (PDF ${c.pdfPage})`);
    console.log(`    ${line.trim().slice(0, 110)}\n`);
  }
  process.exit(0);
}
if (usedTerms.length > tokenize(q).length) console.log(`(মিল পাওয়া রূপ: ${[...new Set(usedTerms)].slice(0, 8).join(", ")})`);
let qn = 0; const qv = new Map();
for (const [i, n] of qtf) { const w = (1 + Math.log(n)) * V.idf[i]; qv.set(i, w); qn += w * w; }
qn = Math.sqrt(qn) || 1;

const scored = corpus.map((c, i) => {
  let dot = 0;
  for (const [j, w] of V.vectors[i]) { const qw = qv.get(j); if (qw) dot += w * (qw / qn); }
  return { c, score: dot };
}).filter((x) => x.score > 0 && (!PART || x.c.part === PART))
  .sort((a, b) => b.score - a.score).slice(0, TOP);

if (!scored.length) { console.log("কিছু পাওয়া যায়নি।"); process.exit(0); }
console.log(`"${q}" — সবচেয়ে মিল ${scored.length}টি পৃষ্ঠা:\n`);
for (const { c, score } of scored) {
  const hay = (c.text + "\n" + c.arabic).split("\n");
  const terms = [...new Set([...tokenize(q), ...usedTerms])];
  const hit = hay.find((l) => terms.some((t) => l.replace(/[ً-ْٰ]/g, "").includes(t))) || hay[0] || "";
  console.log(`  ${c.part} · বইয়ের পৃষ্ঠা ${c.bookPage} (PDF ${c.pdfPage})  [মিল ${score.toFixed(3)}]`);
  console.log(`    ${hit.slice(0, 110)}\n`);
}
