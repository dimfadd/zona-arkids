/**
 * Letters for tracing (TULIS-TEBAL) and the judge for one stroke. No DOM here, so it can be unit tested.
 *
 * Letters live in a box 100 units tall (y = 0 top line, y = 100 base line). Each letter is a list of
 * strokes in writing order; each stroke is a polyline in the direction it is written.
 * Stroke order follows common Indonesian kindergarten practice and still needs a TK teacher's sign-off.
 */
export interface Pt { x: number; y: number }

type Seg = ["L", number, number] | ["C", number, number, number, number, number, number];

/** A stroke from a start point and segments: L = line to, C = cubic curve to (two control points, end). */
function path(x: number, y: number, ...segs: Seg[]): Pt[] {
  const out: Pt[] = [{ x, y }];
  let cx = x, cy = y;
  for (const s of segs) {
    if (s[0] === "L") {
      const [, ex, ey] = s, n = Math.max(2, Math.ceil(Math.hypot(ex - cx, ey - cy) / 2));
      for (let i = 1; i <= n; i++) out.push({ x: cx + (ex - cx) * i / n, y: cy + (ey - cy) * i / n });
      cx = ex; cy = ey;
    } else {
      const [, x1, y1, x2, y2, ex, ey] = s;
      for (let i = 1; i <= 32; i++) {
        const t = i / 32, u = 1 - t;
        out.push({
          x: u * u * u * cx + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * ex,
          y: u * u * u * cy + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * ey,
        });
      }
      cx = ex; cy = ey;
    }
  }
  return out;
}
/** Oval written from the top, going left first (anticlockwise on screen). */
function oval(cx: number, cy: number, rx: number, ry: number): Pt[] {
  return Array.from({ length: 65 }, (_, i) => { const t = (i / 64) * Math.PI * 2; return { x: cx - rx * Math.sin(t), y: cy - ry * Math.cos(t) }; });
}

export const LETTERS = {
  S: [path(72, 20, ["C", 64, 2, 30, 2, 28, 24], ["C", 26, 44, 74, 44, 74, 70], ["C", 74, 96, 34, 100, 24, 80])],
  A: [path(50, 0, ["L", 14, 100]), path(50, 0, ["L", 86, 100]), path(28, 62, ["L", 72, 62])],
  I: [path(50, 0, ["L", 50, 100])],
  T: [path(50, 0, ["L", 50, 100]), path(12, 0, ["L", 88, 0])],
  O: [oval(50, 50, 40, 50)],
  L: [path(22, 0, ["L", 22, 100], ["L", 80, 100])],
  U: [path(18, 0, ["L", 18, 62], ["C", 18, 104, 82, 104, 82, 62], ["L", 82, 0])],
  K: [path(22, 0, ["L", 22, 100]), path(80, 0, ["L", 24, 56], ["L", 82, 100])],
  E: [path(22, 0, ["L", 22, 100]), path(22, 0, ["L", 78, 0]), path(22, 50, ["L", 70, 50]), path(22, 100, ["L", 78, 100])],
  R: [path(22, 0, ["L", 22, 100]), path(22, 0, ["L", 52, 0], ["C", 84, 0, 84, 52, 52, 52], ["L", 22, 52], ["L", 80, 100])],
  P: [path(22, 0, ["L", 22, 100]), path(22, 0, ["L", 52, 0], ["C", 84, 0, 84, 54, 52, 54], ["L", 22, 54])],
  M: [path(12, 0, ["L", 12, 100]), path(12, 0, ["L", 50, 62], ["L", 88, 0], ["L", 88, 100])],
  D: [path(22, 0, ["L", 22, 100]), path(22, 0, ["L", 44, 0], ["C", 96, 0, 96, 100, 44, 100], ["L", 22, 100])],
  B: [path(22, 0, ["L", 22, 100]), path(22, 0, ["L", 50, 0], ["C", 78, 0, 78, 48, 50, 48], ["L", 22, 48]),
    path(22, 48, ["L", 54, 48], ["C", 88, 48, 88, 100, 54, 100], ["L", 22, 100])],
  J: [path(70, 0, ["L", 70, 68], ["C", 70, 104, 20, 104, 18, 72])],
} satisfies Record<string, Pt[][]>;
export type LetterKey = keyof typeof LETTERS;

/** Allowed distance from the guide: 12% of the letter's height. */
export const TOLERANCE = 12;

export type Miss = "mulai" | "arah" | "keluar" | "ujung";
export interface Verdict { ok: boolean; miss?: Miss; maxDev: number }

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
export function lengthOf(p: Pt[]) { let s = 0; for (let i = 1; i < p.length; i++) s += dist(p[i - 1], p[i]); return s; }
function distToSegment(p: Pt, a: Pt, b: Pt) {
  const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
function distToPath(p: Pt, g: Pt[]) { let m = Infinity; for (let i = 1; i < g.length; i++) m = Math.min(m, distToSegment(p, g[i - 1], g[i])); return m; }
/** Points every `step` units along a polyline, ends included. */
export function resample(g: Pt[], step: number): Pt[] {
  const out = [g[0]]; let carry = 0;
  for (let i = 1; i < g.length; i++) {
    const a = g[i - 1], b = g[i], d = dist(a, b);
    let t = step - carry;
    while (t <= d) { out.push({ x: a.x + (b.x - a.x) * t / d, y: a.y + (b.y - a.y) * t / d }); t += step; }
    carry = d - (t - step);
  }
  const last = g[g.length - 1];
  if (dist(out[out.length - 1], last) > 1e-6) out.push(last);
  return out;
}

/**
 * Judge one traced stroke against its guide (both in letter units).
 * Right when it starts at the start dot, stays near the guide, passes every checkpoint in order and
 * ends at the end. A stroke written backwards fails on its start, or for closed shapes on the order.
 */
export function judgeStroke(user: Pt[], guide: Pt[], tol = TOLERANCE): Verdict {
  const devs = user.map((p) => distToPath(p, guide));
  const maxDev = devs.length ? Math.max(...devs) : 0;
  const start = guide[0], end = guide[guide.length - 1];
  if (!user.length) return { ok: false, miss: "mulai", maxDev };
  if (dist(user[0], start) > tol) {
    return { ok: false, miss: dist(user[0], end) <= tol ? "arah" : "mulai", maxDev };
  }
  // a few jittery points are forgiven; a real detour is not
  const off = devs.filter((d) => d > tol).length;
  if (off > Math.max(1, user.length * 0.04)) return { ok: false, miss: "keluar", maxDev };
  const cps = resample(guide, tol * 0.8);
  let k = 0;
  for (const p of user) while (k < cps.length && dist(p, cps[k]) <= tol) k++;
  if (k < cps.length) return { ok: false, miss: k >= cps.length * 0.5 ? "ujung" : "arah", maxDev };
  if (dist(user[user.length - 1], end) > tol) return { ok: false, miss: "ujung", maxDev };
  return { ok: true, maxDev };
}

/** Bounding box of a letter, for fitting it on screen. */
export function boxOf(strokes: Pt[][]) {
  let x0 = Infinity, x1 = -Infinity;
  for (const s of strokes) for (const p of s) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); }
  return { x0, x1, w: x1 - x0 };
}
