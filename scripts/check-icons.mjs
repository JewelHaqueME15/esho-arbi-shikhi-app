/* Guard against ambiguous picture questions.
 *
 * A picture question must never show the same icon twice — if it did, two
 * options would look equally correct and the question would be unanswerable.
 * This is easy to reintroduce, because different words legitimately share an
 * icon (a pen / the pen / pens are all 🖊️), and because adding an icon to a
 * pronoun or possessive silently creates a duplicate.
 *
 * This mirrors the picture-option logic in js/lesson.js. Run: npm test
 */
import { UNITS } from "../js/data.js";

const shuffle = (a) => a.slice(); // deterministic: we assert over every candidate
function pickDistinctIcons(pool) {
  const seen = new Set(), out = [];
  for (const v of shuffle(pool)) {
    if (seen.has(v.img)) continue;
    seen.add(v.img); out.push(v);
  }
  return out;
}
function picDistractors(pool, answer, n) {
  return pickDistinctIcons(pool.filter((v) => v.img !== answer.img)).slice(0, n);
}

const problems = [];

UNITS.forEach((u, ui) => {
  // 1. No two words *within* a unit may share an icon (breaks pic_match).
  const iconOwners = new Map();
  u.vocab.filter((v) => v.img).forEach((v) => {
    if (!iconOwners.has(v.img)) iconOwners.set(v.img, []);
    iconOwners.get(v.img).push(v.b);
  });
  for (const [img, words] of iconOwners) {
    if (new Set(words).size > 1) problems.push(`unit ${ui}: ${img} shared by ${words.join(" + ")}`);
  }

  // 2. No generated picture question may contain a duplicate icon.
  const allVimg = UNITS.slice(0, ui + 1).flatMap((x) => x.vocab).filter((v) => v.img);
  const picVocab = pickDistinctIcons(u.vocab.filter((v) => v.img));
  const check = (label, icons) => {
    if (new Set(icons).size !== icons.length) problems.push(`unit ${ui} ${label}: ${icons.join(" ")}`);
  };
  picVocab.slice(0, 2).forEach((w) => check("pic_mc", [w.img, ...picDistractors(allVimg, w, 3).map((v) => v.img)]));
  picVocab.slice(2, 4).forEach((w) => check("pic_ba", [w, ...picDistractors(allVimg, w, 3)].map((v) => v.img)));
  picVocab.slice(4, 6).forEach((w) => check("listen_pic", [w, ...picDistractors(allVimg, w, 3)].map((v) => v.img)));
  if (picVocab.length >= 4) check("pic_match", picVocab.slice(0, 4).map((v) => v.img));
});

if (problems.length) {
  console.error("Ambiguous icons found:\n" + problems.map((p) => "  - " + p).join("\n"));
  process.exit(1);
}
console.log("OK - no unit reuses an icon, and no picture question shows a duplicate icon");
