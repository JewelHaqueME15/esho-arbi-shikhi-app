/* শব্দের ছবি/আইকন।
   আইকনের তালিকা এখন content/icons.json-এ — সেখানে এডিট করে
   `npm run build:content` চালালেই এখানে চলে আসে।

   মনে রাখা জরুরি: data.js-এর `img` ফিল্ড ছবি-অনুশীলন (pic_mc/pic_ba/…) চালায়,
   তাই সেখানে শুধু মূর্ত বস্তু থাকে। এই ICONS তালিকা কেবল শব্দ-তালিকার ছবি-কলামে
   দেখানোর জন্য — ছবি-অনুশীলনে কখনো ব্যবহৃত হয় না, ফলে পুরনো "একই আইকন দুইবার"
   সমস্যা ফিরে আসে না। ক্রিয়াপদে ইচ্ছাকৃতভাবে কোনো আইকন নেই। */
import { UNITS } from "./data.js";
import { ICONS } from "./content.generated.js";

export { ICONS };

/* ── শব্দের চেহারা: শব্দভাণ্ডার ও ফ্ল্যাশকার্ড — দুই জায়গাতেই লাগে, তাই এখানে ──
   (ui.js ↔ flash.js পরস্পরকে import করলে চক্র তৈরি হতো, তাই helper দুটি এখানে) */
const IMG_BY_WORD = (() => {
  const m = {};
  for (const u of UNITS) for (const v of u.vocab) if (v.img && !m[v.a]) m[v.a] = v.img;
  return m;
})();
/* ছবি-অনুশীলনের `img` আগে, না থাকলে প্রদর্শন-আইকন (ক্রিয়ায় কিছুই নেই) */
export function wordIcon(a) { return IMG_BY_WORD[a] || ICONS[a] || ""; }
/* ৩টি তারা — কতটা মুখস্থ হয়েছে */
export function starsHTML(n) {
  let h = "";
  for (let i = 0; i < 3; i++) h += `<span class="w-star${i < n ? " on" : ""}">★</span>`;
  return h;
}
