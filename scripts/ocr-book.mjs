/* ════════ বইয়ের OCR পাইপলাইন ════════
   স্ক্যান করা PDF (কোনো টেক্সট লেয়ার নেই) → পৃষ্ঠাভিত্তিক টেক্সট।

   প্রতিটি পৃষ্ঠায় দুইবার OCR চালানো হয়:
     • ben+ara — বাংলা নির্দেশনা ভালো আসে
     • ara     — আরবি অংশ তুলনামূলক ভালো আসে (হারাকাতসহ লেখায় এটিই কম ভুল করে)
   দুটোই সংরক্ষণ করা হয়, কারণ কোনটি বেশি নির্ভরযোগ্য তা পৃষ্ঠাভেদে বদলায়।

   কাজটি থামলে আবার চালালে যেখান থেকে থেমেছিল সেখান থেকেই শুরু হয় (resumable)।

   চালাও:  node scripts/ocr-book.mjs [--from N] [--to N] [--dpi 300]         */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const POPPLER = "C:/Users/hp/AppData/Local/Microsoft/WinGet/Packages/oschwartz10612.Poppler_Microsoft.Winget.Source_8wekyb3d8bbwe/poppler-25.07.0/Library/bin";
const TESS = "C:/Program Files/Tesseract-OCR/tesseract.exe";
const PDF = "Esho-Arbi-Shikhi.pdf";
const IMG_DIR = "book-scan/pages";      // ছবি — গিটে যায় না (বড়)
const OUT_DIR = "book-text/pages";      // টেক্সট — গিটে যায়
const env = { ...process.env, TESSDATA_PREFIX: path.join(process.env.HOME || process.env.USERPROFILE, "tessdata") };

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? Number(process.argv[i + 1]) : d; };
const DPI = arg("--dpi", 300);

fs.mkdirSync(IMG_DIR, { recursive: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const total = (() => {
  const out = execFileSync(path.join(POPPLER, "pdfinfo.exe"), [PDF], { encoding: "utf8" });
  return Number(/Pages:\s+(\d+)/.exec(out)[1]);
})();
const FROM = arg("--from", 1), TO = arg("--to", total);
console.log(`মোট পৃষ্ঠা: ${total} | এই দফায়: ${FROM}–${TO} | DPI ${DPI}`);

const pad = (n) => String(n).padStart(3, "0");
let done = 0, skipped = 0;

for (let p = FROM; p <= TO; p++) {
  const outFile = path.join(OUT_DIR, `p-${pad(p)}.json`);
  if (fs.existsSync(outFile)) { skipped++; continue; }

  const stem = path.join(IMG_DIR, `p-${pad(p)}`);
  const png = `${stem}-${pad(p)}.png`;
  if (!fs.existsSync(png)) {
    execFileSync(path.join(POPPLER, "pdftoppm.exe"),
      ["-f", String(p), "-l", String(p), "-r", String(DPI), "-gray", "-png", PDF, stem], { stdio: "ignore" });
  }
  const actual = fs.existsSync(png) ? png
    : fs.readdirSync(IMG_DIR).filter((f) => f.startsWith(`p-${pad(p)}-`)).map((f) => path.join(IMG_DIR, f))[0];
  if (!actual) { console.error(`  ✖ পৃষ্ঠা ${p}: ছবি তৈরি হয়নি`); continue; }

  const ocr = (langs) => {
    try {
      return execFileSync(TESS, [actual, "stdout", "-l", langs, "--psm", "6"],
        { encoding: "utf8", env, stdio: ["ignore", "pipe", "ignore"], maxBuffer: 1 << 24 }).replace(/\r\n/g, "\n").trim();
    } catch { return ""; }
  };

  const mixed = ocr("ben+ara");
  const arabic = ocr("ara");
  fs.writeFileSync(outFile, JSON.stringify({
    page: p,
    dpi: DPI,
    mixed,          // বাংলা+আরবি — বাংলা নির্দেশনার জন্য
    arabic,         // শুধু আরবি — আরবি লেখার জন্য
  }, null, 1) + "\n");

  fs.unlinkSync(actual);   // ছবিটি আর দরকার নেই (ডিস্ক বাঁচাতে)
  done++;
  if (done % 10 === 0) console.log(`  … ${p}/${TO} (${done} নতুন)`);
}
console.log(`✓ শেষ — ${done}টি নতুন পৃষ্ঠা, ${skipped}টি আগেই ছিল`);
