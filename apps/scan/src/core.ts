/**
 * Gambarku Hidup - core geometry & image helpers.
 * Typed port of prototype/src/core.js. The math is unchanged on purpose:
 * it is covered by test/core.test.ts against the simulated phone photos.
 */

export type Mat3 = number[][];
export type Pt = [number, number];
export type Box = [number, number, number, number]; // x, y, w, h in page mm

export interface RGBAImage {
  data: Uint8ClampedArray | Uint8Array;
  width: number;
  height: number;
}

export interface Marker {
  id: number;
  corners: { x: number; y: number }[];
}

export interface SheetLike {
  markers: Record<string, Pt[]>;
}

export interface Correspondences {
  key: string;
  count: number;
  src: Pt[];
  dst: Pt[];
}

// ---------------------------------------------------------- linear algebra
/** Gaussian elimination with partial pivoting. */
export function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((r, i) => r.concat([b[i]]));
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((r, i) => r[n] / r[i]);
}

export function mul3(A: Mat3, B: Mat3): Mat3 {
  const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
    for (let k = 0; k < 3; k++) C[i][j] += A[i][k] * B[k][j];
  return C;
}

export function inv3(m: Mat3): Mat3 {
  const [a, b, c] = m[0], [d, e, f] = m[1], [g, h, i] = m[2];
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [[A / det, -(b * i - c * h) / det, (b * f - c * e) / det],
          [B / det, (a * i - c * g) / det, -(a * f - c * d) / det],
          [C / det, -(a * h - b * g) / det, (a * e - b * d) / det]];
}

export function apply(H: Mat3, x: number, y: number): Pt {
  const w = H[2][0] * x + H[2][1] * y + H[2][2];
  return [(H[0][0] * x + H[0][1] * y + H[0][2]) / w, (H[1][0] * x + H[1][1] * y + H[1][2]) / w];
}

/** Hartley normalisation. */
function normT(pts: Pt[]): Mat3 {
  let mx = 0, my = 0;
  pts.forEach((p) => { mx += p[0]; my += p[1]; });
  mx /= pts.length; my /= pts.length;
  let d = 0;
  pts.forEach((p) => { d += Math.hypot(p[0] - mx, p[1] - my); });
  const s = Math.SQRT2 / (d / pts.length || 1);
  return [[s, 0, -s * mx], [0, s, -s * my], [0, 0, 1]];
}

/** Least-squares homography mapping src (page mm) -> dst (image px). */
export function homography(src: Pt[], dst: Pt[]): Mat3 | null {
  if (src.length < 4) return null;
  const Ts = normT(src), Td = normT(dst);
  const s = src.map((p) => apply(Ts, p[0], p[1])), d = dst.map((p) => apply(Td, p[0], p[1]));
  const AtA = Array.from({ length: 8 }, () => new Array<number>(8).fill(0)), Atb = new Array<number>(8).fill(0);
  for (let i = 0; i < s.length; i++) {
    const [X, Y] = s[i], [u, v] = d[i];
    const rows = [[X, Y, 1, 0, 0, 0, -u * X, -u * Y, u], [0, 0, 0, X, Y, 1, -v * X, -v * Y, v]];
    for (const r of rows) for (let a = 0; a < 8; a++) {
      Atb[a] += r[a] * r[8];
      for (let b = 0; b < 8; b++) AtA[a][b] += r[a] * r[b];
    }
  }
  const h = solve(AtA, Atb);
  if (!h) return null;
  const Hn = [[h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], 1]];
  const H = mul3(inv3(Td), mul3(Hn, Ts));
  const k = H[2][2];
  return H.map((r) => r.map((v) => v / k));
}

/** Reprojection error (px, RMS). */
export function reprojError(H: Mat3, src: Pt[], dst: Pt[]): number {
  let e = 0;
  src.forEach((p, i) => { const q = apply(H, p[0], p[1]); e += (q[0] - dst[i][0]) ** 2 + (q[1] - dst[i][1]) ** 2; });
  return Math.sqrt(e / src.length);
}

/** Estimate focal length (px) from homography, principal point at image centre. */
export function estimateFocal(H: Mat3, W: number, Hh: number): { f: number; estimated: boolean } {
  const cx = W / 2, cy = Hh / 2;
  const T = [[1, 0, -cx], [0, 1, -cy], [0, 0, 1]];
  const M = mul3(T, H);
  const a1 = M[0][0], b1 = M[1][0], c1 = M[2][0], a2 = M[0][1], b2 = M[1][1], c2 = M[2][1];
  const est: { f: number; w: number }[] = [];
  const d1 = c1 * c2;
  if (Math.abs(d1) > 1e-12) { const f2 = -(a1 * a2 + b1 * b2) / d1; if (f2 > 0) est.push({ f: Math.sqrt(f2), w: Math.abs(d1) }); }
  const d2 = c1 * c1 - c2 * c2;
  if (Math.abs(d2) > 1e-12) { const f2 = (a2 * a2 + b2 * b2 - a1 * a1 - b1 * b1) / d2; if (f2 > 0) est.push({ f: Math.sqrt(f2), w: Math.abs(d2) }); }
  const L = Math.max(W, Hh), lo = 0.5 * L, hi = 1.6 * L;
  const ok = est.filter((e) => e.f > lo && e.f < hi);
  if (!ok.length) return { f: 0.78 * L, estimated: false };
  let sw = 0, sf = 0; ok.forEach((e) => { sw += e.w; sf += e.w * e.f; });
  return { f: sf / sw, estimated: true };
}

export type Vec3 = [number, number, number];

/** Pose from homography. R[k] = page axis k as a vector, t in OpenCV camera coords (mm). */
export function pose(H: Mat3, f: number, W: number, Hh: number): { R: Vec3[]; t: Vec3 } {
  const Kinv = [[1 / f, 0, -W / 2 / f], [0, 1 / f, -Hh / 2 / f], [0, 0, 1]];
  const M = mul3(Kinv, H);
  const c = (j: number): Vec3 => [M[0][j], M[1][j], M[2][j]];
  const h1 = c(0), h2 = c(1), h3 = c(2);
  const n = (v: Vec3) => Math.hypot(v[0], v[1], v[2]);
  let lam = 2 / (n(h1) + n(h2));
  if (h3[2] * lam < 0) lam = -lam;
  const r1 = h1.map((v) => v * lam) as Vec3, r2 = h2.map((v) => v * lam) as Vec3, t = h3.map((v) => v * lam) as Vec3;
  const nr = (v: Vec3): Vec3 => { const l = n(v); return v.map((x) => x / l) as Vec3; };
  const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  // symmetric orthonormalisation of r1, r2
  const a = nr(r1), b = nr(r2);
  const bis = nr([a[0] + b[0], a[1] + b[1], a[2] + b[2]]);
  const z = nr(cross(a, b));
  const perp = nr(cross(z, bis));
  const s = Math.SQRT1_2;
  const x = nr([s * (bis[0] - perp[0]), s * (bis[1] - perp[1]), s * (bis[2] - perp[2])]);
  const y = nr([s * (bis[0] + perp[0]), s * (bis[1] + perp[1]), s * (bis[2] + perp[2])]);
  return { R: [x, y, cross(x, y)], t };
}

// ---------------------------------------------------------- markers
/** Collect page<->image correspondences from js-aruco markers. scale maps detector px -> image px. */
export function correspondences(markers: Marker[], sheets: Record<string, SheetLike>, scale: number): Correspondences | null {
  // pick the sheet with the most matching ids
  let best: { key: string; hits: Marker[] } | null = null;
  for (const [key, sh] of Object.entries(sheets)) {
    const hits = markers.filter((m) => sh.markers[m.id]);
    if (!best || hits.length > best.hits.length) best = { key, hits };
  }
  if (!best || !best.hits.length) return null;
  const src: Pt[] = [], dst: Pt[] = [], seen = new Set<number>();
  for (const m of best.hits) {
    if (seen.has(m.id)) continue; // the detector sometimes returns the same marker twice
    seen.add(m.id);
    const pc = sheets[best.key].markers[m.id];
    for (let i = 0; i < 4; i++) {
      src.push(pc[i]);
      dst.push([m.corners[i].x * scale, m.corners[i].y * scale]);
    }
  }
  return { key: best.key, count: seen.size, src, dst };
}

// ---------------------------------------------------------- image ops
function sampleBilinear(d: ArrayLike<number>, w: number, h: number, x: number, y: number, out: number[], o: number) {
  if (x < 0 || y < 0 || x > w - 1.001 || y > h - 1.001) { out[o] = out[o + 1] = out[o + 2] = 255; return; }
  const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0;
  const i00 = (y0 * w + x0) * 4, i10 = i00 + 4, i01 = i00 + w * 4, i11 = i01 + 4;
  for (let c = 0; c < 3; c++) {
    const top = d[i00 + c] * (1 - fx) + d[i10 + c] * fx;
    const bot = d[i01 + c] * (1 - fx) + d[i11 + c] * fx;
    out[o + c] = top * (1 - fy) + bot * fy;
  }
}

/** Rectify a page-mm box out of the source image. Returns RGBA. */
export function rectify(src: RGBAImage, H: Mat3, box: Box | number[], pxPerMm: number, aa?: number): { data: Uint8ClampedArray<ArrayBuffer>; width: number; height: number } {
  const [bx, by, bw, bh] = box;
  const W = Math.round(bw * pxPerMm), Hh = Math.round(bh * pxPerMm);
  const out = new Uint8ClampedArray(W * Hh * 4);
  const tmp = [0, 0, 0];
  const ss = aa || 1;
  for (let j = 0; j < Hh; j++) {
    for (let i = 0; i < W; i++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++) {
        const X = bx + (i + (sx + 0.5) / ss) / pxPerMm, Y = by + (j + (sy + 0.5) / ss) / pxPerMm;
        const q = apply(H, X, Y);
        sampleBilinear(src.data, src.width, src.height, q[0], q[1], tmp, 0);
        r += tmp[0]; g += tmp[1]; b += tmp[2];
      }
      const o = (j * W + i) * 4, n = ss * ss;
      out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = 255;
    }
  }
  return { data: out, width: W, height: Hh };
}

/** Paper-white estimate: per-channel high percentile of bright, low-saturation pixels. */
export function paperWhite(img: RGBAImage): number[] {
  const d = img.data, hist = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
  let n = 0;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx > 60 && (mx - mn) < 0.25 * mx) { hist[0][r]++; hist[1][g]++; hist[2][b]++; n++; }
  }
  if (n < 50) return [255, 255, 255];
  return hist.map((hc) => { let acc = 0; for (let v = 255; v >= 0; v--) { acc += hc[v]; if (acc >= n * 0.08) return Math.max(v, 40); } return 255; });
}

/** White-balance + gentle contrast so paper reads as clean white and crayon pops. */
export function enhance<T extends RGBAImage>(img: T, white: number[], opts?: { sat?: number; ink?: number }): T {
  const d = img.data, k = [255 / white[0], 255 / white[1], 255 / white[2]];
  const sat = (opts && opts.sat) || 1.18, ink = (opts && opts.ink) || 1.0;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] * k[0], g = d[i + 1] * k[1], b = d[i + 2] * k[2];
    // lift near-white to white
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    const lift = l > 225 ? (l - 225) / 30 : 0;
    r += (255 - r) * lift; g += (255 - g) * lift; b += (255 - b) * lift;
    // saturation boost
    const m = (r + g + b) / 3;
    r = m + (r - m) * sat; g = m + (g - m) * sat; b = m + (b - m) * sat;
    if (ink !== 1) { const l2 = (r + g + b) / 3; if (l2 < 170) { const f = Math.pow(l2 / 170, ink); r *= f; g *= f; b *= f; } }
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }
  return img;
}
