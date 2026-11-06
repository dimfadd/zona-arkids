// Node test: detect markers in simulated photos, rectify pieces, write PNGs.
const fs = require("fs"), vm = require("vm"), path = require("path");
const { PNG } = require("pngjs");
const core = require("../src/core.js");

const ctx = { console, Math, Array, Object };
ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ["vendor/aruco-bundle.js"]) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", f), "utf8"), ctx);
}
const AR = vm.runInContext("AR", ctx);
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, "../build/config.json")));

function load(p) { const png = PNG.sync.read(fs.readFileSync(p)); return { data: png.data, width: png.width, height: png.height }; }
function save(img, p) { const png = new PNG({ width: img.width, height: img.height }); png.data = Buffer.from(img.data); fs.writeFileSync(p, PNG.sync.write(png)); }
function downscale(img, maxW) {
  const s = Math.max(1, img.width / maxW), W = Math.round(img.width / s), H = Math.round(img.height / s);
  const out = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const sx = Math.min(img.width - 1, Math.round(x * s)), sy = Math.min(img.height - 1, Math.round(y * s));
    const i = (sy * img.width + sx) * 4, o = (y * W + x) * 4;
    out[o] = img.data[i]; out[o + 1] = img.data[i + 1]; out[o + 2] = img.data[i + 2]; out[o + 3] = 255;
  }
  return { data: out, width: W, height: H, scale: s };
}

const outDir = path.join(__dirname, "../build/test");
fs.mkdirSync(outDir, { recursive: true });
for (const name of ["photo-warna", "photo-warna-tilt", "photo-tebal", "photo-tebal-rot"]) {
  const img = load(path.join(__dirname, "../build", name + ".png"));
  const small = downscale(img, 800);
  const det = new AR.Detector();
  const t0 = Date.now();
  const markers = det.detect(small);
  const dt = Date.now() - t0;
  const corr = core.correspondences(markers, cfg.sheets, small.scale);
  if (!corr) { console.log(name, "NO MARKERS", markers.map(m => m.id)); continue; }
  const H = core.homography(corr.src, corr.dst);
  const err = core.reprojError(H, corr.src, corr.dst);
  const foc = core.estimateFocal(H, img.width, img.height);
  const P = core.pose(H, foc.f, img.width, img.height);
  console.log(name, "sheet", corr.key, "ids", markers.map(m => m.id).join(","), `detect ${dt}ms`,
    "err", err.toFixed(2), "f", foc.f.toFixed(0), foc.estimated, "t", P.t.map(v => v.toFixed(0)).join(","),
    "corner0", JSON.stringify(markers.map(m => [m.id, Math.round(m.corners[0].x * small.scale), Math.round(m.corners[0].y * small.scale)])));
  const sheet = cfg.sheets[corr.key];
  for (const pc of sheet.pieces) {
    const r = core.rectify(img, H, pc.box, 4, 2);
    const wb = core.paperWhite(r);
    core.enhance(r, wb);
    save(r, path.join(outDir, `${name}-${pc.id}.png`));
  }
}
