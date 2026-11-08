/**
 * Colouring board: the child paints with a finger under the cow's ink lines (lines always stay on top,
 * so colouring outside the lines still looks tidy). Afterwards we read, for each region of the drawing,
 * the crayon colour used most inside it. Those colours dress the 3D cow.
 */
import { CRAYONS, EYES, MOUTH, NOSTRILS, REGIONS, SHAPES, VIEW, type RegionKey } from "./cow-art";

const SCALE = 6;                         // canvas pixels per drawing unit
export const BOARD_W = VIEW.w * SCALE;   // 1032
export const BOARD_H = VIEW.h * SCALE;   // 936
const INK = "#26231f";
const MIN_COVER = 0.12;                  // a region counts as coloured from 12% coverage

export type Tool = "kuas" | "hapus";
/**
 * How the child colours:
 * - "jari": a finger on glass is fat and hides what it paints, so a virtual crayon is drawn with its tip
 *   a little above the finger, and each stroke stays inside one part (no spilling over). Which part is
 *   decided by where the crayon actually colours, not where it first lands: a stroke that crosses an
 *   outer part on its way to an inner one belongs to the inner part once it has coloured more there,
 *   and the streak left on the outer part is taken back. After AIM_LOCK of colouring in one part the
 *   choice is fixed, so scribbling over the edge later does not switch parts.
 * - "pen": a stylus (or a mouse) paints right where it touches, free, like real colouring.
 */
export type InputMode = "jari" | "pen";
const TIP_OFFSET = { x: -10, y: -64 }; // CSS px from the finger to the crayon tip
const AIM_LOCK = 110 * SCALE;          // canvas px of colouring in one part that fixes the stroke to it

export class ColoringBoard {
  readonly el: HTMLDivElement;
  private paint: HTMLCanvasElement;
  private lines: HTMLCanvasElement;
  private px: CanvasRenderingContext2D;
  private regionIds: Uint8ClampedArray | null = null;
  private undoStack: ImageData[] = [];
  private patterns = new Map<string, CanvasPattern>();
  private last: { x: number; y: number } | null = null;
  private activePointer: number | null = null;
  color = CRAYONS[0].hex;
  size: "besar" | "kecil" = "besar";
  tool: Tool = "kuas";
  inputMode: InputMode = "jari";
  onChange: () => void = () => {};
  /** Called once when a stylus is first used, so the UI can switch to pen mode. */
  onPenDetected: () => void = () => {};
  private crayonEl: HTMLDivElement;
  private scratch: HTMLCanvasElement;
  private masks = new Map<number, HTMLCanvasElement>();
  /** Finger stroke: kept inside one region (strokeRegion, 1-based; 0 = none yet, paints nothing). */
  private clipped = false;
  private strokeRegion = 0;
  /** While aiming: the whole stroke unclipped, the page before it, and how far it ran in each region. */
  private pending: HTMLCanvasElement | null = null;
  private before: ImageData | null = null;
  private runIn = new Map<number, number>();
  private locked = false;

  constructor() {
    this.el = document.createElement("div");
    this.el.className = "papan";
    this.paint = this.makeCanvas("papan-warna");
    this.lines = this.makeCanvas("papan-garis");
    this.lines.setAttribute("aria-hidden", "true");
    this.paint.setAttribute("role", "img");
    this.paint.setAttribute("aria-label", "Gambar sapi untuk diwarnai. Geser jari untuk mewarnai.");
    this.crayonEl = document.createElement("div");
    this.crayonEl.className = "krayon-virtual"; this.crayonEl.hidden = true;
    this.crayonEl.setAttribute("aria-hidden", "true");
    // a crayon pointing down-left: its tip is the element's bottom-left corner
    this.crayonEl.innerHTML = `<svg viewBox="0 0 40 120" width="22" height="66"><path d="M8 34 h24 v80 a4 4 0 0 1 -4 4 h-16 a4 4 0 0 1 -4 -4z" fill="var(--k)" stroke="#26231f" stroke-width="3"/><path d="M8 34 L20 4 L32 34z" fill="var(--k)" stroke="#26231f" stroke-width="3" stroke-linejoin="round"/><rect x="8" y="56" width="24" height="26" fill="#fff" opacity=".55"/></svg>`;
    this.scratch = this.makeCanvas("papan-scratch");
    this.el.append(this.paint, this.lines, this.crayonEl);
    this.px = this.paint.getContext("2d", { willReadFrequently: true })!;
    this.drawLines();
    this.bindPointer();
  }

  private makeCanvas(cls: string) {
    const c = document.createElement("canvas");
    c.width = BOARD_W; c.height = BOARD_H; c.className = cls;
    return c;
  }

  /** Map drawing units to canvas pixels. */
  private toCanvas(ctx: CanvasRenderingContext2D) {
    ctx.setTransform(SCALE, 0, 0, SCALE, -VIEW.x * SCALE, -VIEW.y * SCALE);
  }

  private drawLines() {
    const x = this.lines.getContext("2d")!;
    this.toCanvas(x);
    x.lineJoin = "round"; x.lineCap = "round"; x.strokeStyle = INK;
    for (const s of SHAPES) { x.lineWidth = s.region === "corak" ? 1.3 : 1.6; x.stroke(new Path2D(s.d)); }
    x.fillStyle = INK;
    for (const [ex, ey] of EYES) { x.beginPath(); x.ellipse(ex, ey, 2.4, 3, 0, 0, Math.PI * 2); x.fill(); }
    x.fillStyle = "#fff";
    for (const [ex, ey] of EYES) { x.beginPath(); x.arc(ex + 0.8, ey - 1.1, 0.8, 0, Math.PI * 2); x.fill(); }
    x.fillStyle = INK;
    for (const [nx, ny] of NOSTRILS) { x.beginPath(); x.ellipse(nx, ny, 2.2, 1.6, 0, 0, Math.PI * 2); x.fill(); }
    x.lineWidth = 1.3; x.stroke(new Path2D(MOUTH));
  }

  /** Crayon grain: the same colour with uneven opacity, so strokes look waxy but keep their hue. */
  private crayon(hex: string) {
    let p = this.patterns.get(hex);
    if (p) return p;
    const c = document.createElement("canvas"); c.width = c.height = 48;
    const x = c.getContext("2d")!;
    x.fillStyle = hex;
    for (let i = 0; i < 48; i += 2) for (let j = 0; j < 48; j += 2) {
      x.globalAlpha = 0.72 + Math.random() * 0.28; x.fillRect(i, j, 2, 2);
    }
    p = this.px.createPattern(c, "repeat")!;
    this.patterns.set(hex, p);
    return p;
  }

  /** Canvas point of a pointer; with the virtual crayon, the crayon's tip rather than the finger. */
  private point(e: PointerEvent, crayonTip: boolean) {
    const r = this.paint.getBoundingClientRect();
    const cx = e.clientX + (crayonTip ? TIP_OFFSET.x : 0), cy = e.clientY + (crayonTip ? TIP_OFFSET.y : 0);
    if (crayonTip) this.moveCrayon(cx - r.left, cy - r.top);
    return { x: (cx - r.left) / r.width * BOARD_W, y: (cy - r.top) / r.height * BOARD_H };
  }

  private moveCrayon(x: number, y: number) {
    this.crayonEl.style.setProperty("--k", this.tool === "hapus" ? "#ffffff" : this.color);
    // tip of the drawing at (11, 2); turned so the crayon leans over the page with its tip down
    this.crayonEl.style.transform = `translate(${x - 11}px, ${y - 2}px) rotate(160deg)`;
  }

  /** Region number (1-based, 0 = outside the cow) under a canvas point. */
  private regionAt(p: { x: number; y: number }) {
    const x = Math.round(p.x), y = Math.round(p.y);
    if (x < 0 || y < 0 || x >= BOARD_W || y >= BOARD_H) return 0;
    const id = this.ids(), i = (y * BOARD_W + x) * 4;
    return id[i + 1] === 0 ? Math.round(id[i] / 20) : 0;
  }

  /** White where a region is visible (later shapes cover earlier ones), transparent elsewhere. */
  private mask(region: number) {
    let m = this.masks.get(region);
    if (m) return m;
    m = document.createElement("canvas"); m.width = BOARD_W; m.height = BOARD_H;
    const x = m.getContext("2d")!, img = x.createImageData(BOARD_W, BOARD_H), id = this.ids();
    for (let i = 0; i < id.length; i += 4) {
      if (id[i] > 0 && id[i + 1] === 0 && Math.round(id[i] / 20) === region) { img.data[i] = img.data[i + 1] = img.data[i + 2] = img.data[i + 3] = 255; }
    }
    x.putImageData(img, 0, 0);
    this.masks.set(region, m);
    return m;
  }

  private styleStroke(x: CanvasRenderingContext2D) {
    x.strokeStyle = this.tool === "hapus" ? "#000" : this.crayon(this.color);
    x.lineWidth = (this.size === "besar" ? 9 : 4) * SCALE;
    x.lineCap = "round"; x.lineJoin = "round";
  }

  private stroke(a: { x: number; y: number }, b: { x: number; y: number }) {
    const erase = this.tool === "hapus";
    if (this.clipped && !this.strokeRegion) return;
    if (!this.clipped) {
      const x = this.px;
      x.save(); x.globalCompositeOperation = erase ? "destination-out" : "source-over"; this.styleStroke(x);
      x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x + 0.01, b.y); x.stroke(); x.restore();
      return;
    }
    // kept inside one region: draw on scratch, cut it to the region, then lay it on the page
    const s = this.scratch.getContext("2d")!;
    const pad = (this.size === "besar" ? 9 : 4) * SCALE / 2 + 3;
    const x0 = Math.max(0, Math.floor(Math.min(a.x, b.x) - pad)), y0 = Math.max(0, Math.floor(Math.min(a.y, b.y) - pad));
    const w = Math.min(BOARD_W, Math.ceil(Math.max(a.x, b.x) + pad)) - x0, h = Math.min(BOARD_H, Math.ceil(Math.max(a.y, b.y) + pad)) - y0;
    if (w <= 0 || h <= 0) return;
    s.clearRect(x0, y0, w, h);
    s.save(); this.styleStroke(s); s.beginPath(); s.moveTo(a.x, a.y); s.lineTo(b.x + 0.01, b.y); s.stroke(); s.restore();
    s.save(); s.globalCompositeOperation = "destination-in"; s.drawImage(this.mask(this.strokeRegion), x0, y0, w, h, x0, y0, w, h); s.restore();
    const x = this.px;
    x.save(); x.globalCompositeOperation = erase ? "destination-out" : "source-over"; x.drawImage(this.scratch, x0, y0, w, h, x0, y0, w, h); x.restore();
    s.clearRect(x0, y0, w, h);
  }

  /** Lay the whole pending stroke on the page again, cut to region r (used when the aim changes). */
  private recomposite(r: number) {
    this.px.putImageData(this.before!, 0, 0);
    if (!r) return;
    const s = this.scratch.getContext("2d")!;
    s.clearRect(0, 0, BOARD_W, BOARD_H);
    s.drawImage(this.pending!, 0, 0);
    s.save(); s.globalCompositeOperation = "destination-in"; s.drawImage(this.mask(r), 0, 0); s.restore();
    const x = this.px;
    x.save(); x.globalCompositeOperation = this.tool === "hapus" ? "destination-out" : "source-over"; x.drawImage(this.scratch, 0, 0); x.restore();
    s.clearRect(0, 0, BOARD_W, BOARD_H);
  }

  /** Finger stroke from a to b: note where it ran, and switch parts while still aiming. */
  private fingerStroke(a: { x: number; y: number }, b: { x: number; y: number }) {
    if (this.locked) { this.stroke(a, b); return; }
    const pd = this.pending!.getContext("2d")!;
    pd.save(); this.styleStroke(pd); pd.beginPath(); pd.moveTo(a.x, a.y); pd.lineTo(b.x + 0.01, b.y); pd.stroke(); pd.restore();
    const r = this.regionAt({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    if (r) this.runIn.set(r, (this.runIn.get(r) ?? 0) + Math.hypot(b.x - a.x, b.y - a.y));
    let lead = this.strokeRegion, most = this.runIn.get(lead) ?? 0;
    for (const [k, v] of this.runIn) if (v > most) { lead = k; most = v; }
    if (lead !== this.strokeRegion) { this.strokeRegion = lead; this.recomposite(lead); }
    else this.stroke(a, b);
    if (most >= AIM_LOCK) { this.locked = true; this.pending = null; this.before = null; this.runIn.clear(); }
  }

  private bindPointer() {
    const c = this.paint;
    let crayon = false;
    c.addEventListener("pointerdown", (e) => {
      if (this.activePointer !== null) return; // one finger paints, a second finger is ignored
      if (e.pointerType === "pen" && this.inputMode !== "pen") { this.inputMode = "pen"; this.onPenDetected(); }
      crayon = e.pointerType === "touch" && this.inputMode === "jari";
      this.activePointer = e.pointerId;
      try { c.setPointerCapture(e.pointerId); } catch { /* not an active pointer (old browsers, synthetic events) */ }
      this.pushUndo();
      const p = this.point(e, crayon);
      this.crayonEl.hidden = !crayon;
      this.clipped = crayon;
      this.last = p;
      if (!crayon) { this.strokeRegion = 0; this.stroke(p, p); return; }
      // aiming starts in the part under the tip (none if the tip is off the cow)
      this.strokeRegion = this.regionAt(p); this.locked = false; this.runIn.clear();
      this.before = this.undoStack[this.undoStack.length - 1];
      this.pending ??= document.createElement("canvas");
      this.pending.width = BOARD_W; this.pending.height = BOARD_H; // also clears it
      this.fingerStroke(p, p);
    });
    c.addEventListener("pointermove", (e) => {
      if (e.pointerId !== this.activePointer || !this.last) return;
      const p = this.point(e, crayon);
      if (this.clipped) this.fingerStroke(this.last, p); else this.stroke(this.last, p);
      this.last = p;
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId !== this.activePointer) return;
      this.activePointer = null; this.last = null; this.strokeRegion = 0; this.clipped = false;
      this.locked = false; this.pending = null; this.before = null; this.runIn.clear();
      this.crayonEl.hidden = true; this.onChange();
    };
    c.addEventListener("pointerup", end);
    c.addEventListener("pointercancel", end);
  }

  /** Painted pixels per region (index 0 = outside the cow). For tests. */
  paintedByRegion() {
    const id = this.ids(), p = this.px.getImageData(0, 0, BOARD_W, BOARD_H).data;
    const out = new Array(REGIONS.length + 1).fill(0);
    for (let i = 0; i < id.length; i += 4) if (p[i + 3] > 100) out[id[i + 1] === 0 ? Math.round(id[i] / 20) : 0]++;
    return out;
  }

  private pushUndo() {
    this.undoStack.push(this.px.getImageData(0, 0, BOARD_W, BOARD_H));
    if (this.undoStack.length > 15) this.undoStack.shift();
  }

  canUndo() { return this.undoStack.length > 0; }
  undo() {
    const s = this.undoStack.pop();
    if (s) { this.px.putImageData(s, 0, 0); this.onChange(); }
  }
  clear() {
    this.pushUndo();
    this.px.clearRect(0, 0, BOARD_W, BOARD_H);
    this.onChange();
  }

  /** Paint one region solid (used by automated tests and by the parent's "contoh" button). */
  fillRegion(region: RegionKey, hex: string) {
    const x = this.px;
    x.save(); this.toCanvas(x); x.fillStyle = this.crayon(hex);
    for (const s of SHAPES) if (s.region === region) x.fill(new Path2D(s.d));
    x.restore(); this.onChange();
  }

  /** Region id per pixel, drawn back to front so a spot on the body counts as spot, not body. */
  private ids() {
    if (this.regionIds) return this.regionIds;
    const c = document.createElement("canvas"); c.width = BOARD_W; c.height = BOARD_H;
    const x = c.getContext("2d", { willReadFrequently: true })!;
    this.toCanvas(x);
    for (const s of SHAPES) {
      x.fillStyle = `rgb(${(REGIONS.indexOf(s.region) + 1) * 20},0,0)`;
      x.fill(new Path2D(s.d));
    }
    this.regionIds = x.getImageData(0, 0, BOARD_W, BOARD_H).data;
    return this.regionIds;
  }

  /** Fraction of the cow's area that has colour on it. */
  coverage() {
    const id = this.ids(), p = this.px.getImageData(0, 0, BOARD_W, BOARD_H).data;
    let inside = 0, painted = 0;
    for (let i = 0; i < id.length; i += 4) if (id[i] > 0) { inside++; if (p[i + 3] > 100) painted++; }
    return inside ? painted / inside : 0;
  }

  /** Most used crayon per region, or null where the child left it (almost) blank. */
  regionColors(): Record<RegionKey, string | null> {
    const id = this.ids(), p = this.px.getImageData(0, 0, BOARD_W, BOARD_H).data;
    const rgb = CRAYONS.map((c) => [parseInt(c.hex.slice(1, 3), 16), parseInt(c.hex.slice(3, 5), 16), parseInt(c.hex.slice(5, 7), 16)]);
    const total = new Array(REGIONS.length).fill(0);
    const votes = REGIONS.map(() => new Array(CRAYONS.length).fill(0));
    for (let i = 0; i < id.length; i += 4) {
      const v = id[i];
      if (v === 0 || v % 20 !== 0 || id[i + 1] !== 0) continue; // skip anti-aliased edge pixels
      const r = v / 20 - 1;
      total[r]++;
      if (p[i + 3] <= 100) continue;
      let best = 0, bd = 1e9;
      for (let k = 0; k < rgb.length; k++) {
        const d = (p[i] - rgb[k][0]) ** 2 + (p[i + 1] - rgb[k][1]) ** 2 + (p[i + 2] - rgb[k][2]) ** 2;
        if (d < bd) { bd = d; best = k; }
      }
      votes[r][best]++;
    }
    const out = {} as Record<RegionKey, string | null>;
    REGIONS.forEach((key, r) => {
      const painted = votes[r].reduce((a: number, b: number) => a + b, 0);
      if (!total[r] || painted / total[r] < MIN_COVER) { out[key] = null; return; }
      out[key] = CRAYONS[votes[r].indexOf(Math.max(...votes[r]))].hex;
    });
    return out;
  }

  /** The finished drawing on white, used as the child's sticker. */
  snapshot(width = 320) {
    const h = Math.round(width * BOARD_H / BOARD_W);
    const c = document.createElement("canvas"); c.width = width; c.height = h;
    const x = c.getContext("2d")!;
    x.fillStyle = "#ffffff"; x.fillRect(0, 0, width, h);
    x.drawImage(this.paint, 0, 0, width, h); x.drawImage(this.lines, 0, 0, width, h);
    return c.toDataURL("image/png");
  }
}
