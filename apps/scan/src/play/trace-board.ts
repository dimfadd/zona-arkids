/**
 * TULIS-TEBAL: the child traces a letter stroke by stroke on exercise-book lines.
 * Level 1 guidance: dashed skeleton, green start dot with the stroke number, an arrow, and a short
 * animation of the stroke before the child's first try. Two misses on a stroke: the stroke is shown
 * again, its track grows bolder and the tolerance doubles, so the child always finishes.
 */
import { LETTERS, TOLERANCE, boxOf, judgeStroke, lengthOf, resample, type LetterKey, type Miss, type Pt } from "./tracing-data";
import { say } from "./speech";

const NS = "http://www.w3.org/2000/svg";
const reduceMotion = typeof window !== "undefined" && (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const d = (p: Pt[]) => p.map((q, i) => `${i ? "L" : "M"}${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join("");

export interface TraceResult { letter: LetterKey; tries: number; helped: boolean; maxDev: number }

const HINT: Record<Miss, string> = {
  mulai: "Coba mulai dari titik hijau.",
  arah: "Ikuti panahnya, ya.",
  keluar: "Pelan-pelan, ikuti garisnya.",
  ujung: "Terus sampai ujung, ya.",
};

export class TraceBoard {
  readonly el: HTMLDivElement;
  private svg: SVGSVGElement;
  private layers: Record<"track" | "done" | "now" | "ink" | "demo", SVGGElement>;
  private strokes: Pt[][] = [];
  private si = 0;
  private misses = 0;
  private totalTries = 0;
  private helped = false;
  private worst = 0;
  private busy = false;
  private finish: ((r: TraceResult) => void) | null = null;
  private letter: LetterKey = "S";
  color = "#e0392b";

  constructor() {
    this.el = document.createElement("div");
    this.el.className = "tulis-papan";
    this.svg = document.createElementNS(NS, "svg");
    this.svg.setAttribute("role", "img");
    this.el.append(this.svg);
    const g = (cls: string) => { const e = document.createElementNS(NS, "g"); e.setAttribute("class", cls); this.svg.append(e); return e; };
    this.layers = { track: g("t-track"), done: g("t-done"), now: g("t-now"), ink: g("t-ink"), demo: g("t-demo") };
    this.bindPointer();
  }

  /** Trace one letter; resolves when every stroke is done. */
  run(letter: LetterKey): Promise<TraceResult> {
    this.letter = letter; this.strokes = LETTERS[letter]; this.si = 0; this.misses = 0; this.totalTries = 0;
    this.helped = false; this.worst = 0;
    const box = boxOf(this.strokes), pad = 22;
    this.svg.setAttribute("viewBox", `${box.x0 - pad} -24 ${box.w + pad * 2} 148`);
    this.svg.setAttribute("aria-label", `Tebalkan huruf ${letter}`);
    // exercise-book lines: top, dashed middle, base
    const x0 = box.x0 - pad - 200, x1 = box.x1 + pad + 200;
    this.layers.track.innerHTML =
      `<path class="t-garis" d="M${x0} 0H${x1}M${x0} 100H${x1}"/><path class="t-garis tengah" d="M${x0} 50H${x1}"/>`
      + this.strokes.map((s) => `<path class="t-jalur" d="${d(s)}"/><path class="t-putus" d="${d(s)}"/>`).join("");
    this.layers.done.innerHTML = ""; this.layers.ink.innerHTML = "";
    return new Promise((res) => { this.finish = res; this.showStroke(true); });
  }

  /** Client coordinates of the current stroke's guide (used by automated tests to trace it). */
  guideOnScreen(): { x: number; y: number }[] {
    const m = this.svg.getScreenCTM(); if (!m || !this.strokes[this.si]) return [];
    return resample(this.strokes[this.si], 2).map((p) => { const q = new DOMPoint(p.x, p.y).matrixTransform(m); return { x: q.x, y: q.y }; });
  }
  get strokeIndex() { return this.si; }

  private async showStroke(first: boolean) {
    const s = this.strokes[this.si], help = this.misses >= 2;
    const a = s[0];
    // arrow a little way along the stroke, pointing the way to go
    const along = resample(s, 2), at = along[Math.min(along.length - 1, 11)], next = along[Math.min(along.length - 1, 13)];
    const arAng = Math.atan2(next.y - at.y, next.x - at.x) * 180 / Math.PI;
    this.layers.now.innerHTML = `
      <path class="t-jalur sekarang ${help ? "bantu" : ""}" d="${d(s)}"/>
      <path class="t-putus sekarang" d="${d(s)}"/>
      <path class="t-panah" d="M-6 -6 L4 0 L-6 6" transform="translate(${at.x} ${at.y}) rotate(${arAng})"/>
      <g class="t-mulai" transform="translate(${a.x} ${a.y})"><circle r="9"/><text y="4">${this.si + 1}</text></g>`;
    if (first || help) await this.demo(s);
  }

  /** A red fingertip draws the stroke once, so the child sees where to start and which way to go. */
  private async demo(s: Pt[]) {
    this.busy = true;
    const dot = document.createElementNS(NS, "circle"); dot.setAttribute("r", "7"); dot.setAttribute("class", "t-jari");
    const trail = document.createElementNS(NS, "path"); trail.setAttribute("class", "t-jejak");
    this.layers.demo.append(trail, dot);
    const pts = resample(s, 2), dur = reduceMotion ? 0 : Math.min(1800, 500 + lengthOf(s) * 6);
    if (dur) {
      const t0 = performance.now();
      await new Promise<void>((done) => {
        const tick = (now: number) => {
          const k = Math.min(1, (now - t0) / dur), n = Math.max(1, Math.round(k * (pts.length - 1)));
          dot.setAttribute("cx", String(pts[n].x)); dot.setAttribute("cy", String(pts[n].y));
          trail.setAttribute("d", d(pts.slice(0, n + 1)));
          if (k < 1) requestAnimationFrame(tick); else done();
        };
        requestAnimationFrame(tick);
      });
      await wait(250);
    }
    this.layers.demo.innerHTML = "";
    this.busy = false;
  }

  private toLetter(e: PointerEvent): Pt {
    const m = this.svg.getScreenCTM()!.inverse(), q = new DOMPoint(e.clientX, e.clientY).matrixTransform(m);
    return { x: q.x, y: q.y };
  }

  private bindPointer() {
    let pts: Pt[] = [], id: number | null = null, ink: SVGPathElement | null = null;
    this.svg.addEventListener("pointerdown", (e) => {
      if (id !== null || this.busy || !this.finish) return;
      id = e.pointerId; try { this.svg.setPointerCapture(e.pointerId); } catch { /* synthetic event */ }
      pts = [this.toLetter(e)];
      this.layers.ink.innerHTML = "";
      ink = document.createElementNS(NS, "path"); ink.setAttribute("class", "t-tinta"); ink.style.stroke = this.color;
      this.layers.ink.append(ink); ink.setAttribute("d", d(pts));
    });
    this.svg.addEventListener("pointermove", (e) => {
      if (e.pointerId !== id || !ink) return;
      pts.push(this.toLetter(e)); ink.setAttribute("d", d(pts));
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = null;
      const stroke = pts; pts = [];
      void this.judge(stroke);
    };
    this.svg.addEventListener("pointerup", end);
    this.svg.addEventListener("pointercancel", end);
  }

  private async judge(user: Pt[]) {
    const guide = this.strokes[this.si];
    // a tap is not a try: tell the child how to write instead
    if (lengthOf(user) < 8) { this.layers.ink.innerHTML = ""; say("Tekan titik hijau, lalu geser mengikuti garis."); return; }
    const tol = this.misses >= 2 ? TOLERANCE * 2 : TOLERANCE;
    const v = judgeStroke(user, guide, tol);
    this.totalTries++; this.worst = Math.max(this.worst, v.maxDev);
    if (!v.ok) {
      this.misses++;
      this.layers.ink.querySelector("path")?.classList.add("pudar");
      this.layers.now.querySelector(".t-mulai")?.classList.add("denyut");
      setTimeout(() => { this.layers.ink.innerHTML = ""; }, 450);
      if (this.misses === 2) { this.helped = true; await say("Lihat dulu, ya. Lalu ikuti."); this.showStroke(false); }
      else say(HINT[v.miss!]);
      return;
    }
    // right: the stroke becomes a solid crayon line and the next one appears
    this.layers.ink.innerHTML = "";
    const done = document.createElementNS(NS, "path"); done.setAttribute("class", "t-tebal"); done.style.stroke = this.color;
    done.setAttribute("d", d(guide)); this.layers.done.append(done);
    this.si++; this.misses = 0;
    if (this.si < this.strokes.length) { say("Bagus!"); this.showStroke(false); return; }
    this.layers.now.innerHTML = "";
    const r = { letter: this.letter, tries: this.totalTries - this.strokes.length + 1, helped: this.helped, maxDev: this.worst };
    const f = this.finish; this.finish = null; f?.(r);
  }
}
