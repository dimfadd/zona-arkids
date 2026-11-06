// Smoke test of the built PWA in headless Chromium at several screen sizes.
// Usage: npm run build && npm run e2e [-- <screenshot dir>]
import { createRequire } from "node:module";
// Playwright is resolved from the machine (globally installed), not from package.json.
const { chromium } = createRequire(import.meta.url)("playwright");
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";

const OUT = process.argv[2] || "e2e/out";
mkdirSync(OUT, { recursive: true });
const PORT = 4179, URL = `http://localhost:${PORT}/scan.html`;

const VIEWPORTS = [
  { name: "hp-kecil", viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
  { name: "hp-besar", viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
  { name: "hp-landscape", viewport: { width: 915, height: 412 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
  { name: "tablet", viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
  { name: "desktop", viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
];

// Own process group, so the whole preview server tree can be stopped at the end.
const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "pipe", detached: true });
const stopServer = () => { try { process.kill(-server.pid, "SIGTERM"); } catch {} };
process.on("exit", stopServer);
await new Promise((res, rej) => {
  server.stdout.on("data", (d) => { if (String(d).includes(String(PORT))) res(); });
  server.on("exit", () => rej(new Error("preview server exited")));
});

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); console.log(ok ? "  ok  " : "  FAIL", msg); };
// Content limits (art too tight for a fingertip) are reported, not failed: the fix is in the drawing.
const warnings = [];
const warn = (ok, msg) => { if (!ok) warnings.push(msg); console.log(ok ? "  ok  " : "  WARN", msg); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function noHorizontalScroll(page, label) {
  const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  check(sw <= iw, `${label}: tidak ada scroll horizontal (${sw} <= ${iw})`);
}
async function tap(page, x, y, touch) {
  if (touch) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}

for (const vp of VIEWPORTS) {
  console.log(`\n[${vp.name}] ${vp.viewport.width}x${vp.viewport.height}`);
  const ctx = await browser.newContext({ ...vp });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(URL);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${OUT}/${vp.name}-0-intro.png`, fullPage: true });
  await noHorizontalScroll(page, "intro");

  // --- sheet 1: colouring, count the legs
  await page.click("[data-demo=warna]");
  await page.waitForFunction(() => window.__GH?.S.pieces.length > 0, null, { timeout: 30000 });
  await sleep(2600);
  const stage = await page.$eval("#stage", (e) => { const r = e.getBoundingClientRect(); return { w: r.width, h: r.height, bottom: r.bottom }; });
  check(stage.w > 200 && stage.h > 200, `panggung terlihat (${Math.round(stage.w)}x${Math.round(stage.h)})`);
  check(stage.bottom <= vp.viewport.height + 1, `panggung muat di layar tanpa scroll (bawah ${Math.round(stage.bottom)})`);
  await page.screenshot({ path: `${OUT}/${vp.name}-1-warna.png` });
  await noHorizontalScroll(page, "play");
  // answer every counting question by tapping each item where it is drawn on screen
  const nq = await page.evaluate(() => window.__GH.S.sheet.task.questions.length);
  check(nq === 6, `6 soal hitung di lembar sapi (${nq})`);
  for (let qi = 0; qi < nq; qi++) {
    await sleep(qi === 0 ? 400 : 900); // let the zoom animation settle
    const info = await page.evaluate(() => {
      const G = window.__GH, { THREE } = G, S = G.S, q = S.sheet.task.questions[S.task.qi];
      const p = S.pieces.find((x) => x.pc.id === q.piece);
      G.pageRoot.updateMatrixWorld(true);
      const r = document.querySelector("#gl").getBoundingClientRect();
      const pts = q.items.map((it) => {
        const v = new THREE.Vector3(it.x, it.y - p.pc.hingeY, 0).applyMatrix4(p.hinge.matrixWorld).project(G.camera);
        return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height];
      });
      let gap = 1e9;
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) gap = Math.min(gap, Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]));
      const zoom = document.querySelector("#zoomer").style.transform;
      return { id: q.id, pts, gap: Math.round(gap), zoom };
    });
    if (info.pts.length > 1) warn(info.gap >= 44, `soal ${info.id}: jarak antar sasaran ${info.gap} px di layar (min 44, batas sentuh Apple)${info.zoom ? " · zoom" : ""}`);
    if (vp.name === "desktop" && qi === nq - 1) {
      // the parent's "mark one" button is the path that needs no tapping on the drawing (keyboard, missed taps)
      await page.click("#ortu summary");
      for (let i = 0; i < info.pts.length; i++) { await page.click("#tandai"); await sleep(150); }
    } else {
      for (const [x, y] of info.pts) { await tap(page, x, y, vp.hasTouch); await sleep(220); }
    }
    const got = await page.evaluate(() => window.__GH.S.task.counted.length);
    check(got === info.pts.length, `soal ${info.id}: ${got}/${info.pts.length} terhitung`);
    // after counting, the child picks how many (cardinality); try a wrong card first
    const n = info.pts.length;
    const wrong = await page.$(`[data-n]:not([data-n="${n}"])`);
    if (wrong && qi === 0) {
      await wrong.click(); await sleep(200);
      check(await page.evaluate(() => window.__GH.S.task.phase === "choose"), `soal ${info.id}: jawaban salah tidak menyelesaikan soal`);
    }
    await page.click(`[data-n="${n}"]`);
    check(await page.evaluate(() => window.__GH.S.task.phase === "done"), `soal ${info.id}: memilih angka ${n} benar`);
    if (qi === 0 || qi === 2) await page.screenshot({ path: `${OUT}/${vp.name}-2b-${info.id}.png` });
    if (qi < nq - 1) await page.click("#nextQ");
  }
  check(await page.isVisible("#restartQ"), "semua soal selesai");
  await sleep(500);
  await page.screenshot({ path: `${OUT}/${vp.name}-2-hitung.png`, fullPage: true });
  await page.click("#viewBtn"); await sleep(800);
  check(await page.evaluate(() => window.__GH.S.view === "3d"), "mode Putar 3D aktif");
  await page.screenshot({ path: `${OUT}/${vp.name}-3-3d.png` });
  await page.click("#viewBtn");
  await page.click("#backBtn"); await sleep(300);
  check(await page.isVisible("#intro"), "Ganti lembar kembali ke awal");

  // --- sheet 2: letters, spelling
  await page.click("[data-demo=tebal]");
  await page.waitForFunction(() => window.__GH?.S.pieces.length === 5, null, { timeout: 30000 });
  await sleep(2600);
  await page.click("#checkSpell");
  await page.waitForFunction(() => window.__GH.S.task && !window.__GH.S.task.playing && document.querySelector("#again"), null, { timeout: 60000 });
  check(true, "eja SA-PI selesai");
  await page.screenshot({ path: `${OUT}/${vp.name}-4-eja.png`, fullPage: true });
  await noHorizontalScroll(page, "eja");

  // browser back button returns to the start screen
  await page.goBack(); await sleep(300);
  check(await page.isVisible("#intro"), "tombol Back browser kembali ke awal");

  check(errors.length === 0, `tanpa error console${errors.length ? ": " + errors.join(" | ") : ""}`);
  await ctx.close();
}

// PWA: manifest + service worker
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(URL);
  const sw = await page.evaluate(async () => { const r = await navigator.serviceWorker.ready; return !!r.active; });
  check(sw, "service worker aktif");
  const man = await (await page.request.get(new globalThis.URL("/manifest.webmanifest", URL).href)).json();
  check(man.display === "standalone" && man.icons.length >= 3, "manifest PWA valid");
  // ?debug=1 shows scan diagnostics (the demo photos have no QR printed on them)
  await page.goto(URL + "?debug=1");
  await page.click("[data-demo=warna]");
  await page.waitForFunction(() => window.__GH?.S.pieces.length > 0, null, { timeout: 30000 });
  const chip = await page.$eval("#chip", (e) => (e.hidden ? "" : e.textContent));
  check(chip.includes("4/4 pojok") && chip.includes("QR"), `mode diagnosa: "${chip}"`);
  await ctx.close();
}

await browser.close();
stopServer();
if (warnings.length) console.log(`\n${warnings.length} peringatan (sasaran ketuk terlalu rapat untuk jari):\n  ` + warnings.join("\n  "));
console.log(failures.length ? `\n${failures.length} GAGAL` : "\nSemua lulus");
process.exit(failures.length ? 1 : 0);
