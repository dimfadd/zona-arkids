/* Gambarku Hidup - core geometry & image helpers (browser + Node). */
(function (root) {
  "use strict";

  // ---------------------------------------------------------- linear algebra
  function solve(A, b) {               // Gaussian elimination, partial pivot
    const n = b.length, M = A.map((r, i) => r.concat([b[i]]));
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

  function mul3(A, B) {
    const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
      for (let k = 0; k < 3; k++) C[i][j] += A[i][k] * B[k][j];
    return C;
  }
  function inv3(m) {
    const [a, b, c] = m[0], [d, e, f] = m[1], [g, h, i] = m[2];
    const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
    const det = a * A + b * B + c * C;
    return [[A / det, -(b * i - c * h) / det, (b * f - c * e) / det],
            [B / det, (a * i - c * g) / det, -(a * f - c * d) / det],
            [C / det, -(a * h - b * g) / det, (a * e - b * d) / det]];
  }
  function apply(H, x, y) {
    const w = H[2][0] * x + H[2][1] * y + H[2][2];
    return [(H[0][0] * x + H[0][1] * y + H[0][2]) / w, (H[1][0] * x + H[1][1] * y + H[1][2]) / w];
  }

  function normT(pts) {                 // Hartley normalisation
    let mx = 0, my = 0;
    pts.forEach(p => { mx += p[0]; my += p[1]; });
    mx /= pts.length; my /= pts.length;
    let d = 0;
    pts.forEach(p => { d += Math.hypot(p[0] - mx, p[1] - my); });
    const s = Math.SQRT2 / (d / pts.length || 1);
    return [[s, 0, -s * mx], [0, s, -s * my], [0, 0, 1]];
  }

  /** Least-squares homography mapping src (page mm) -> dst (image px). */
  function homography(src, dst) {
    if (src.length < 4) return null;
    const Ts = normT(src), Td = normT(dst);
    const s = src.map(p => apply(Ts, p[0], p[1])), d = dst.map(p => apply(Td, p[0], p[1]));
    const AtA = Array.from({ length: 8 }, () => new Array(8).fill(0)), Atb = new Array(8).fill(0);
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
    return H.map(r => r.map(v => v / k));
  }

  /** Reprojection error (px, RMS). */
  function reprojError(H, src, dst) {
    let e = 0;
    src.forEach((p, i) => { const q = apply(H, p[0], p[1]); e += (q[0] - dst[i][0]) ** 2 + (q[1] - dst[i][1]) ** 2; });
    return Math.sqrt(e / src.length);
  }

  /** Estimate focal length (px) from homography, principal point at image centre. */
  function estimateFocal(H, W, Hh) {
    const cx = W / 2, cy = Hh / 2;
    const T = [[1, 0, -cx], [0, 1, -cy], [0, 0, 1]];
    const M = mul3(T, H);
    const a1 = M[0][0], b1 = M[1][0], c1 = M[2][0], a2 = M[0][1], b2 = M[1][1], c2 = M[2][1];
    const est = [];
    const d1 = c1 * c2;
    if (Math.abs(d1) > 1e-12) { const f2 = -(a1 * a2 + b1 * b2) / d1; if (f2 > 0) est.push({ f: Math.sqrt(f2), w: Math.abs(d1) }); }
    const d2 = c1 * c1 - c2 * c2;
    if (Math.abs(d2) > 1e-12) { const f2 = (a2 * a2 + b2 * b2 - a1 * a1 - b1 * b1) / d2; if (f2 > 0) est.push({ f: Math.sqrt(f2), w: Math.abs(d2) }); }
    const L = Math.max(W, Hh), lo = 0.5 * L, hi = 1.6 * L;
    const ok = est.filter(e => e.f > lo && e.f < hi);
    if (!ok.length) return { f: 0.78 * L, estimated: false };
    let sw = 0, sf = 0; ok.forEach(e => { sw += e.w; sf += e.w * e.f; });
    return { f: sf / sw, estimated: true };
  }

  /** Pose from homography. Returns {R (3x3, columns = page x,y,z axes), t} in OpenCV camera coords (mm). */
  function pose(H, f, W, Hh) {
    const Kinv = [[1 / f, 0, -W / 2 / f], [0, 1 / f, -Hh / 2 / f], [0, 0, 1]];
    const M = mul3(Kinv, H);
    const c = j => [M[0][j], M[1][j], M[2][j]];
    let h1 = c(0), h2 = c(1), h3 = c(2);
    const n = v => Math.hypot(v[0], v[1], v[2]);
    let lam = 2 / (n(h1) + n(h2));
    if (h3[2] * lam < 0) lam = -lam;
    const r1 = h1.map(v => v * lam), r2 = h2.map(v => v * lam), t = h3.map(v => v * lam);
    const nr = v => { const l = n(v); return v.map(x => x / l); };
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    // symmetric orthonormalisation of r1, r2
    const a = nr(r1), b = nr(r2);
    const bis = nr([a[0] + b[0], a[1] + b[1], a[2] + b[2]]);
    const z = nr(cross(a, b));
    const perp = nr(cross(z, bis));
    const s = Math.SQRT1_2;
    const x = nr([s * (bis[0] - perp[0]), s * (bis[1] - perp[1]), s * (bis[2] - perp[2])]);
    const y = nr([s * (bis[0] + perp[0]), s * (bis[1] + perp[1]), s * (bis[2] + perp[2])]);
    return { R: [x, y, cross(x, y)], t };   // R[k] = axis k as column vector
  }

  // ---------------------------------------------------------- markers
  /** Collect page<->image correspondences from js-aruco markers. scale maps detector px -> image px. */
  function correspondences(markers, sheets, scale) {
    // pick sheet with most matching ids
    let best = null;
    for (const [key, sh] of Object.entries(sheets)) {
      const hits = markers.filter(m => sh.markers[m.id]);
      if (!best || hits.length > best.hits.length) best = { key, hits };
    }
    if (!best || !best.hits.length) return null;
    const src = [], dst = [], seen = new Set();
    for (const m of best.hits) {
      if (seen.has(m.id)) continue;
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
  function sampleBilinear(d, w, h, x, y, out, o) {
    if (x < 0 || y < 0 || x > w - 1.001 || y > h - 1.001) { out[o] = out[o + 1] = out[o + 2] = 255; return; }
    const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0;
    const i00 = (y0 * w + x0) * 4, i10 = i00 + 4, i01 = i00 + w * 4, i11 = i01 + 4;
    for (let c = 0; c < 3; c++) {
      const top = d[i00 + c] * (1 - fx) + d[i10 + c] * fx;
      const bot = d[i01 + c] * (1 - fx) + d[i11 + c] * fx;
      out[o + c] = top * (1 - fy) + bot * fy;
    }
  }

  /** Rectify a page-mm box out of the source image. Returns {data, width, height} RGBA (Uint8ClampedArray). */
  function rectify(src, H, box, pxPerMm, aa) {
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
  function paperWhite(img) {
    const d = img.data, hist = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
    let n = 0;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if (mx > 60 && (mx - mn) < 0.25 * mx) { hist[0][r]++; hist[1][g]++; hist[2][b]++; n++; }
    }
    if (n < 50) return [255, 255, 255];
    return hist.map(hc => { let acc = 0; for (let v = 255; v >= 0; v--) { acc += hc[v]; if (acc >= n * 0.08) return Math.max(v, 40); } return 255; });
  }

  /** White-balance + gentle contrast so paper reads as clean white and crayon pops. */
  function enhance(img, white, opts) {
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

  const api = { solve, mul3, inv3, apply, homography, reprojError, estimateFocal, pose, correspondences, rectify, paperWhite, enhance };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GHCore = api;
})(typeof window !== "undefined" ? window : globalThis);
