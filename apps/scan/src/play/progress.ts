/**
 * Stickers for the child and a skills log for the parent. Stored only on this device
 * (no account, nothing sent anywhere): children's data stays with the family.
 */
export interface Attempt { skill: "hitung" | "baca"; label: string; tries: number; at: number }
export interface Sticker { id: string; png: string; at: number }
interface Store { stickers: Sticker[]; log: Attempt[] }

const KEY = "rk.progress.v1";
let memory: Store = { stickers: [], log: [] }; // used when storage is blocked (private mode)

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const s = JSON.parse(raw) as Store; if (Array.isArray(s.stickers) && Array.isArray(s.log)) return s; }
  } catch { /* storage blocked or corrupt */ }
  return memory;
}
function save(s: Store) {
  memory = s;
  try { localStorage.setItem(KEY, JSON.stringify(s)); }
  catch {
    // storage full: drop the oldest stickers first, then retry once
    s.stickers = s.stickers.slice(-6);
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* keep in memory only */ }
  }
}

export const progress = {
  stickers: () => load().stickers,
  log: () => load().log,
  addSticker(png: string) {
    const s = load(); s.stickers.push({ id: String(Date.now()), png, at: Date.now() }); save(s);
  },
  record(a: Omit<Attempt, "at">) {
    const s = load(); s.log.push({ ...a, at: Date.now() }); s.log = s.log.slice(-60); save(s);
  },
  clear() { save({ stickers: [], log: [] }); },
};
