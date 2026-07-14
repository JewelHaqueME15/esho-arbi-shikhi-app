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
