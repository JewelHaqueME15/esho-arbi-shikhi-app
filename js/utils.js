export const $ = (s) => document.querySelector(s);
export function esc(t) { return t.replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
export function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function pick(arr, n, not) {
  const p = shuffle(arr.filter((x) => x !== not));
  return p.slice(0, n);
}
// Extra decoy tiles for word-bank sentence-building exercises — words drawn
// from `pool` that aren't already part of the correct answer.
export function pickExtra(pool, excludeArr, n) {
  const exclude = new Set(excludeArr);
  const candidates = shuffle(pool.filter((w) => !exclude.has(w)));
  return candidates.slice(0, n);
}

/* ════════ তাশকীল (হারাকাত) ধীরে ধীরে কমানো ════════
   কিতাবটিও ঠিক এভাবেই এগোয় — শুরুতে পূর্ণ যের-যবর-পেশ, মাঝে শেষ হরফের ই'রাব
   তুলে দেওয়া, আর শেষ খণ্ডে প্রায় খালি লেখা। এখানে কেবল *দেখানোর* সময় কমানো হয়;
   মূল লেখা অক্ষত থাকে — তাই উত্তর মেলানো ও উচ্চারণ (TTS) আগের মতোই নির্ভুল।
   তাশদীদ (ّ) কখনো তোলা হয় না — ওটা না থাকলে পড়াই বদলে যায়। */
/* ইংরেজি সংখ্যা → বাংলা সংখ্যা (১, ২, ৩ …) */
export function bn(n) { return String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]); }
export function tashkeelLevel(ui) { return ui >= 33 ? 2 : ui >= 19 ? 1 : 0; }
export function tk(text, level) {
  if (!text || !level) return text;
  const s = String(text);
  // স্তর ১: শুধু শব্দের শেষের ই'রাব/তানভীন ওঠে, ভেতরের হারাকাত থাকে
  if (level === 1) return s.replace(/[ً-ِْ]+(?=[\s،؟.,!?]|$)/g, "");
  // স্তর ২: খঞ্জর-আলিফসহ সব হারাকাত ওঠে (তাশদীদ ছাড়া)
  return s.replace(/[ً-ِْٰ]/g, "");
}
