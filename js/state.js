import { saveState } from "./api.js";

export const DEF={xp:0,gems:0,hearts:5,streak:0,bestStreak:0,lastDay:null,heartDay:null,
 crowns:{},words:{},badges:{},lessonsDone:0,perfect:0,chestCount:0,rivalXP:null,
 dayXP:0,goalDay:null,goal:30,storiesDone:{},introShown:false,briefShown:false,migNoticeShown:true,
 soundOn:true,visualDone:{},gender:null,wordStars:{},flashDone:0};

// Mutable, module-live-bound globals shared across every screen — mirrors
// the original single-file app's top-level `S`/`CUR` variables.
export let S = null;
export let CUR = null;
export function setSession(state, username) { S = state; CUR = username; }

const LOCAL_CACHE_KEY = "eas_state_cache";
let saveTimer = null;

function mirrorToLocalCache() {
  if (!CUR) return;
  try { localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify({ username: CUR, state: S })); } catch { /* ignore quota errors */ }
}

// Optimistic local mirror (instant, synchronous) + debounced network sync so
// rapid-fire save() calls during a lesson collapse into one PUT /api/state.
export function save() {
  if (!CUR) return;
  mirrorToLocalCache();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { saveState(S).catch(() => { /* will retry on next save() */ }); }, 400);
}

export function flushSave() {
  clearTimeout(saveTimer);
  if (!CUR) return;
  saveState(S).catch(() => {});
}

window.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flushSave(); });
window.addEventListener("beforeunload", flushSave);

export function readLocalCache() {
  try { return JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY)); } catch { return null; }
}
export function clearLocalCache() { localStorage.removeItem(LOCAL_CACHE_KEY); }

export function today() { return new Date().toISOString().slice(0, 10); }

export function dailyRefresh() {
  const t = today();
  if (S.heartDay !== t) { S.hearts = 5; S.heartDay = t; }
  if (S.goalDay !== t) { S.dayXP = 0; S.goalDay = t; }
  if (S.lastDay && S.lastDay !== t) {
    const d1 = new Date(S.lastDay), d2 = new Date(t);
    if ((d2 - d1) / 864e5 > 1) { S.streak = 0; } // streak broken
  }
  save();
}

export function bumpStreak() {
  const t = today();
  if (S.lastDay !== t) {
    const prev = S.lastDay; S.lastDay = t;
    if (prev && (new Date(t) - new Date(prev)) / 864e5 === 1) S.streak++; else S.streak = 1;
    if (S.streak > S.bestStreak) S.bestStreak = S.streak;
  }
  save();
}
