// Plays the whole first adventure in headless Chromium at several screen sizes.
// Usage: npm run build && node e2e/play.mjs [screenshot dir]
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
// Playwright is resolved from the machine (globally installed), not from package.json.
const { chromium } = createRequire(import.meta.url)("playwright");

const OUT = process.argv[2] || "e2e/out-play";
mkdirSync(OUT, { recursive: true });
const PORT = 4181, URL = `http://localhost:${PORT}/`;
const VIEWPORTS = [
  { name: "hp-kecil", viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true },
  { name: "hp-besar", viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true },
  { name: "hp-landscape", viewport: { width: 915, height: 412 }, isMobile: true, hasTouch: true },
  { name: "desktop", viewport: { width: 1440, height: 900 } },
];

const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "pipe", detached: true });
const stopServer = () => { try { process.kill(-server.pid, "SIGTERM"); } catch {} };
process.on("exit", stopServer);
await new Promise((res, rej) => {
  server.stdout.on("data", (d) => { if (String(d).includes(String(PORT))) res(); });
  server.on("exit", () => rej(new Error("preview server exited")));
});
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });

const failures = [], warnings = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); console.log(ok ? "  ok  " : "  FAIL", msg); };
const warn = (ok, msg) => { if (!ok) warnings.push(msg); console.log(ok ? "  ok  " : "  WARN", msg); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tap = (page, vp, x, y) => (vp.hasTouch ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));

/** Screen positions of the current step's targets, plus whether each is the first thing a ray hits. */
const targetsOnScreen = (page, kind) => page.evaluate((kind) => {
  const G = window.__RK, { THREE } = G, cam = G.camera;
  const s = G.STEPS[G.R.si];
  const list = kind === "items" ? [G.world.items.sapu] : s.target === "mangga" ? G.world.mangoes : G.cow.countables[s.target];
  const canvas = document.querySelector("#stage3d canvas"), r = canvas.getBoundingClientRect();
  const scene = list[0]; let root = scene; while (root.parent) root = root.parent;
  const ray = new THREE.Raycaster();
  return list.map((obj) => {
    const p = G.anchorOf(obj);
    const v = p.clone().project(cam);
    ray.set(cam.position, p.clone().sub(cam.position).normalize());
    const hit = ray.intersectObjects(root.children, true).find((h) => h.object.type !== "Sprite");
    let o = hit && hit.object, visible = false;
    while (o) { if (o === obj) { visible = true; break; } o = o.parent; }
    return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height, visible };
  });
}, kind);

for (const vp of VIEWPORTS) {
  console.log(`\n[${vp.name}] ${vp.viewport.width}x${vp.viewport.height}`);
  const ctx = await browser.newContext({ ...vp, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(URL + "?mangga=5"); await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${OUT}/${vp.name}-0-beranda.png`, fullPage: true });
  check(await page.isVisible(".kosong"), "beranda: keadaan kosong kebun stiker tampil");
  const noScroll = async (label) => {
    const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    check(sw <= iw, `${label}: tidak ada scroll horizontal (${sw} <= ${iw})`);
  };
  await noScroll("beranda");

  // ---- colouring
  await page.click("#startBtn");
  const box = await page.locator(".papan-warna").boundingBox();
  // finger mode (default): a touch stroke that starts on the body and runs across the snout and off the cow
  // must colour the body only. The crayon tip sits 64 px above the finger.
  const fingerResult = await page.evaluate(({ bx, by, bw, bh }) => {
    const c = document.querySelector(".papan-warna");
    const fire = (type, x, y) => c.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: "touch", isPrimary: true, clientX: x, clientY: y, bubbles: true }));
    const tipY = by + bh * 0.42, fingerY = tipY + 64;
    fire("pointerdown", bx + bw * 0.40 + 10, fingerY);
    const visible = !document.querySelector(".krayon-virtual").hidden;
    for (let i = 1; i <= 30; i++) fire("pointermove", bx + bw * (0.40 + i * 0.019) + 10, fingerY);
    fire("pointerup", bx + bw * 0.97, fingerY);
    return { visible, counts: window.__RK.board.paintedByRegion() };
  }, { bx: box.x, by: box.y, bw: box.width, bh: box.height });
  const R_ = ["luar", "badan", "kepala", "moncong", "kuping", "tanduk", "kaki", "kuku", "ekor", "ambing", "corak"];
  const painted = Object.fromEntries(fingerResult.counts.map((n, i) => [R_[i], n]).filter(([, n]) => n > 0));
  check(fingerResult.visible, "mode jari: krayon virtual tampil saat mewarnai");
  check(fingerResult.counts[1] > 2000 && Object.keys(painted).length === 1, `mode jari: goresan tetap di badan saja (${JSON.stringify(painted)})`);
  await page.evaluate(() => window.__RK.board.clear());
  // pen mode: paints where it touches, free
  const sx = box.x + box.width * 0.35, sy = box.y + box.height * 0.42;
  await page.mouse.move(sx, sy); await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(sx + i * box.width * 0.025, sy + Math.sin(i) * 6);
  await page.mouse.up();
  check(await page.evaluate(() => window.__RK.board.coverage() > 0), "goresan mouse (mode bebas) mewarnai papan");
  check(await page.isEnabled("#undoBtn"), "tombol urungkan aktif setelah mewarnai");
  await page.evaluate(() => {
    const b = window.__RK.board;
    b.fillRegion("badan", "#f7c925"); b.fillRegion("kepala", "#f7c925"); b.fillRegion("kaki", "#f28c28");
    b.fillRegion("corak", "#8b5a2b"); b.fillRegion("tanduk", "#2b2b2b"); b.fillRegion("moncong", "#f39bb6");
  });
  await page.screenshot({ path: `${OUT}/${vp.name}-1-warnai.png`, fullPage: true });
  await noScroll("mewarnai");

  // ---- 3D
  await page.click("#doneBtn");
  await page.waitForFunction(() => window.__RK.screen === "main" && window.__RK.cow, null, { timeout: 30000 });
  await sleep(1800);
  const colors = await page.evaluate(() => ({
    badan: "#" + window.__RK.cow.regions.badan[0].material.color.getHexString(),
    kaki: "#" + window.__RK.cow.regions.kaki[0].material.color.getHexString(),
    tanduk: "#" + window.__RK.cow.regions.tanduk[0].material.color.getHexString(),
  }));
  check(colors.badan === "#f7c925" && colors.kaki === "#f28c28" && colors.tanduk === "#2b2b2b", `warna anak pindah ke sapi 3D (${JSON.stringify(colors)})`);
  await page.screenshot({ path: `${OUT}/${vp.name}-2-sapi.png` });

  // ---- counting steps: kaki, tanduk, mangga
  for (let step = 0; step < 3; step++) {
    // wait until the camera has arrived (time-based easing; slow renderers take longer)
    await page.waitForFunction(() => window.__RK.cameraSettled(), null, { timeout: 15000 });
    const pts = await targetsOnScreen(page, "count");
    const id = await page.evaluate(() => window.__RK.STEPS[window.__RK.R.si].id);
    let gap = 1e9;
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) gap = Math.min(gap, Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y));
    check(pts.every((p) => p.visible), `${id}: semua sasaran terlihat, tidak tertutup (${pts.filter((p) => p.visible).length}/${pts.length})`);
    warn(gap >= 44, `${id}: jarak antar sasaran ${Math.round(gap)} px (min 44)`);
    for (const p of pts) { await tap(page, vp, p.x, p.y); await sleep(200); }
    const counted = await page.evaluate(() => window.__RK.R.counted.slice());
    check(counted.length === pts.length, `${id}: ${counted.length}/${pts.length} terhitung lewat ketukan`);
    if (counted.length !== pts.length) {
      console.log("    titik layar:", JSON.stringify(pts.map((p) => [Math.round(p.x), Math.round(p.y)])), "terhitung:", JSON.stringify(counted));
      await page.screenshot({ path: `${OUT}/${vp.name}-gagal-${id}.png` });
    }
    if (step === 1) await page.screenshot({ path: `${OUT}/${vp.name}-3-tanduk.png` });
    if (step === 0) { // one wrong number first
      const wrong = await page.$(`[data-n]:not([data-n="${pts.length}"])`);
      await wrong.click(); await sleep(150);
      check(await page.evaluate(() => window.__RK.R.phase === "choose"), `${id}: angka salah tidak menyelesaikan soal`);
    }
    await page.click(`[data-n="${pts.length}"]`);
    check(await page.evaluate(() => window.__RK.R.phase === "done"), `${id}: memilih ${pts.length} benar`);
    if (step === 2) await page.screenshot({ path: `${OUT}/${vp.name}-4-mangga.png` });
    await page.click("#nextBtn");
    if (step === 1 || step === 2) await page.waitForFunction((s) => window.__RK.R.si === s, step + 1, { timeout: 20000 });
  }

  // ---- reading: build RU + MAH (one wrong card first)
  await page.waitForFunction(() => window.__RK.cameraSettled(), null, { timeout: 15000 });
  await page.click('[data-card="BU"]'); await sleep(150);
  check(await page.evaluate(() => window.__RK.R.built.length === 0), "rumah: kartu BU tidak diterima");
  await page.click('[data-card="RU"]'); await page.click('[data-card="MAH"]');
  check(await page.isVisible("text=Betul! Ini RUMAH Budi."), "rumah: RU + MAH tersusun");
  await sleep(2500);
  check(await page.evaluate(() => window.__RK.world.door.rotation.y < -0.8), "rumah: pintu terbuka");
  await page.screenshot({ path: `${OUT}/${vp.name}-5-rumah.png` });
  await page.click("#nextBtn");

  // ---- reading: pick SA-PU (a wrong picture first, then tap the broom in 3D)
  await page.waitForFunction(() => window.__RK.cameraSettled(), null, { timeout: 15000 });
  await page.click('[data-item="bola"]'); await sleep(150);
  check(await page.evaluate(() => window.__RK.R.phase !== "done"), "sapu: memilih bola tidak diterima");
  const [sapu] = await targetsOnScreen(page, "items");
  check(sapu.visible, "sapu: benda sapu terlihat di 3D");
  await tap(page, vp, sapu.x, sapu.y); await sleep(300);
  check(await page.evaluate(() => window.__RK.R.phase === "done"), "sapu: mengetuk sapu 3D diterima");
  await page.screenshot({ path: `${OUT}/${vp.name}-6-sapu.png` });
  await noScroll("petualangan");

  // ---- finish: sticker + report
  await page.click("#nextBtn");
  await page.waitForFunction(() => window.__RK.screen === "selesai");
  check((await page.getAttribute("#newSticker", "src")).startsWith("data:image/png"), "stiker sapi dibuat");
  await page.screenshot({ path: `${OUT}/${vp.name}-7-selesai.png`, fullPage: true });
  await page.click("#homeBtn"); await sleep(300);
  check(await page.locator(".stiker").count() >= 1, "beranda: stiker muncul di kebun stiker");
  await page.click("#laporan summary");
  check(await page.locator(".laporan tbody tr").count() >= 5, "beranda: laporan berisi 5 soal");
  await page.screenshot({ path: `${OUT}/${vp.name}-8-laporan.png`, fullPage: true });

  check(errors.length === 0, `tanpa error console${errors.length ? ": " + errors.join(" | ") : ""}`);
  await ctx.close();
}

await browser.close();
stopServer();
if (warnings.length) console.log(`\n${warnings.length} peringatan:\n  ` + warnings.join("\n  "));
console.log(failures.length ? `\n${failures.length} GAGAL` : "\nSemua lulus");
process.exit(failures.length ? 1 : 0);
