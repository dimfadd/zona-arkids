import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import jpeg from "jpeg-js";
import * as core from "../src/core";
import { AR } from "../src/vendor/aruco.js";
import cfg from "../src/content/config.json";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
// The original prototype implementation, used as the reference for the port.
const proto = require("../../../prototype/src/core.js");

const sheets = cfg.sheets as unknown as Record<string, core.SheetLike & { pieces: { id: string; box: number[] }[] }>;

function load(name: string) {
  const img = jpeg.decode(readFileSync(join(here, "fixtures", name + ".jpg")), { useTArray: true });
  return { data: img.data, width: img.width, height: img.height };
}
function downscale(img: core.RGBAImage, maxW: number) {
  const s = Math.max(1, img.width / maxW), W = Math.round(img.width / s), H = Math.round(img.height / s);
  const out = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const sx = Math.min(img.width - 1, Math.round(x * s)), sy = Math.min(img.height - 1, Math.round(y * s));
    const i = (sy * img.width + sx) * 4, o = (y * W + x) * 4;
    out[o] = img.data[i]; out[o + 1] = img.data[i + 1]; out[o + 2] = img.data[i + 2]; out[o + 3] = 255;
  }
  return { data: out, width: W, height: H, scale: s };
}

const CASES = [
  { name: "photo-warna", sheet: "warna-sapi", ids: [101, 202, 303, 404] },
  { name: "photo-warna-tilt", sheet: "warna-sapi", ids: [101, 202, 303, 404] },
  { name: "photo-tebal", sheet: "tebal-sapi", ids: [515, 626, 737, 848] },
  { name: "photo-tebal-rot", sheet: "tebal-sapi", ids: [515, 626, 737, 848] },
];

describe("marker detection on simulated phone photos", () => {
  for (const c of CASES) {
    it(`${c.name}: 4/4 markers, right sheet, low reprojection error`, () => {
      const img = load(c.name);
      const small = downscale(img, 800);
      const markers = new AR.Detector().detect(small);
      const ids = [...new Set(markers.map((m) => m.id))].sort((a, b) => a - b);
      expect(ids).toEqual(c.ids);

      const corr = core.correspondences(markers, sheets, small.scale)!;
      expect(corr.key).toBe(c.sheet);
      expect(corr.count).toBe(4);

      const H = core.homography(corr.src, corr.dst)!;
      expect(core.reprojError(H, corr.src, corr.dst)).toBeLessThan(2);

      // pose: page in front of the camera, rotation orthonormal
      const foc = core.estimateFocal(H, img.width, img.height);
      const P = core.pose(H, foc.f, img.width, img.height);
      expect(P.t[2]).toBeGreaterThan(0);
      for (const v of P.R) expect(Math.hypot(...v)).toBeCloseTo(1, 6);

      // the port must match the prototype exactly
      const Hp = proto.homography(corr.src, corr.dst);
      H.forEach((r, i) => r.forEach((v, j) => expect(v).toBeCloseTo(Hp[i][j], 9)));
      const Pp = proto.pose(Hp, foc.f, img.width, img.height);
      P.t.forEach((v, i) => expect(v).toBeCloseTo(Pp.t[i], 6));

      // rectified pieces come out with clean white paper after enhancement
      for (const pc of sheets[c.sheet].pieces) {
        const r = core.rectify(img, H, pc.box, 2, 1);
        const white = core.paperWhite(r);
        core.enhance(r, white);
        const ref = proto.rectify(img, Hp, pc.box, 2, 1);
        expect(Buffer.from(r.data.buffer).equals(Buffer.from(proto.enhance(ref, proto.paperWhite(ref)).data.buffer))).toBe(true);
        expect(Math.min(...white)).toBeGreaterThan(150);
      }
    });
  }
});

describe("geometry helpers", () => {
  it("homography recovers a known mapping", () => {
    const H0 = [[1.2, 0.1, 30], [-0.05, 0.9, 12], [0.0004, -0.0002, 1]];
    const src: core.Pt[] = [[0, 0], [210, 0], [210, 297], [0, 297], [105, 150], [40, 220]];
    const dst = src.map((p) => core.apply(H0, p[0], p[1]));
    const H = core.homography(src, dst)!;
    H.forEach((r, i) => r.forEach((v, j) => expect(v).toBeCloseTo(H0[i][j], 6)));
  });
  it("needs at least 4 points", () => {
    expect(core.homography([[0, 0], [1, 0], [1, 1]], [[0, 0], [1, 0], [1, 1]])).toBeNull();
  });
  it("correspondences drops duplicate marker ids", () => {
    const m = { id: 101, corners: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 1, y: 2 }] };
    const corr = core.correspondences([m, m], sheets, 1)!;
    expect(corr.count).toBe(1);
    expect(corr.src.length).toBe(4);
  });
});

describe("content: counting questions", () => {
  // Every tap target must sit on the cut-out piece, or the child can never tap it.
  it("every item lies inside its piece mask", async () => {
    const { PNG } = await import("pngjs");
    for (const [key, sh] of Object.entries(cfg.sheets)) {
      const task = sh.task as { questions?: { id: string; piece: string; items: { x: number; y: number; r: number }[] }[] };
      for (const q of task.questions || []) {
        const pc = sh.pieces.find((p) => p.id === q.piece) as { box: number[]; mask: string };
        const png = PNG.sync.read(Buffer.from(pc.mask.split(",")[1], "base64"));
        const pxPerMm = png.width / pc.box[2];
        expect(q.items.length, `${key}/${q.id} has items`).toBeGreaterThan(0);
        for (const it of q.items) {
          const u = Math.round((it.x - pc.box[0]) * pxPerMm), v = Math.round((it.y - pc.box[1]) * pxPerMm);
          expect(u >= 0 && v >= 0 && u < png.width && v < png.height, `${key}/${q.id} item inside box`).toBe(true);
          expect(png.data[(v * png.width + u) * 4], `${key}/${q.id} item (${it.x},${it.y}) on the cut-out`).toBeGreaterThan(128);
        }
      }
    }
  });
});
