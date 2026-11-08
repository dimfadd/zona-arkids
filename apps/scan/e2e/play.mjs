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
  await page.screenshot({ path: `${OUT}/${vp.name}-0-peta.png`, fullPage: true });
  check(await page.locator(".pulau").count() === 10, "peta: 10 pulau episode");
  check(await page.locator(".pulau.kunci").count() === 9, "peta: episode 2-10 ditandai segera hadir");
  const noScroll = async (label) => {
    const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    check(sw <= iw, `${label}: tidak ada scroll horizontal (${sw} <= ${iw})`);
  };
  await noScroll("peta");
  // a locked episode explains itself and has no play button
  await page.click('[data-ep="2"]');
  check(await page.isVisible(".segera") && !(await page.isVisible("#playBtn")), "kartu episode terkunci: 'sedang dibuat', tanpa tombol main");
  await page.click("#epTutup");
  // the sticker book is empty at first
  await page.click('[data-go="stiker"]');
  check(await page.locator(".slot.ada").count() === 0, "buku stiker: kosong di awal");
  await page.click('#stiker [data-go="peta"]'); await sleep(200);

  // ---- open episode 1 from the map: it starts on the white cow from the book
  await page.click('[data-ep="1"]');
  await sleep(500); // let the sheet finish sliding in
  await page.screenshot({ path: `${OUT}/${vp.name}-0b-kartu-episode.png` });
  await page.click("#playBtn");
  await page.waitForFunction(() => window.__RK.screen === "main" && window.__RK.cow, null, { timeout: 30000 });
  check(await page.evaluate(() => "#" + window.__RK.cow.regions.badan[0].material.color.getHexString()) === "#f4f1ea", "awal episode: sapi masih putih seperti di buku");

  const stepId = () => page.evaluate(() => window.__RK.STEPS[window.__RK.R.si].id);
  const waitStep = (id) => page.waitForFunction((id) => window.__RK.STEPS[window.__RK.R.si].id === id && window.__RK.R.phase !== "done", id, { timeout: 25000 });
  const waitDone = () => page.waitForFunction(() => window.__RK.R.phase === "done", null, { timeout: 20000 });
  const next = async () => { await page.click("#nextBtn"); };

  /** Count the current step's 3D targets by tapping them, checking they are visible and apart. */
  const tapTargets = async () => {
    // camera arrived and the cow is not in the middle of a hop
    await page.waitForFunction(() => window.__RK.cameraSettled() && window.__RK.cow.group.position.y === 0, null, { timeout: 15000 });
    const pts = await targetsOnScreen(page, "count");
    const id = await stepId();
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
    return pts.length;
  };

  /** Trace the current letter stroke by stroke along its guide, as a finger would. */
  const traceLetter = async (wrongFirst) => {
    for (let guard = 0; guard < 12; guard++) {
      await page.waitForFunction(() => !window.__RK.trace.busy, null, { timeout: 10000 });
      if (await page.evaluate(() => window.__RK.R.phase === "done")) return;
      await page.evaluate((reverse) => {
        const T = window.__RK.trace, svg = T.el.querySelector("svg");
        let pts = T.guideOnScreen(); if (reverse) pts = pts.reverse();
        const fire = (type, p) => svg.dispatchEvent(new PointerEvent(type, { pointerId: 9, pointerType: "touch", isPrimary: true, clientX: p.x, clientY: p.y, bubbles: true }));
        fire("pointerdown", pts[0]); pts.slice(1).forEach((p) => fire("pointermove", p)); fire("pointerup", pts[pts.length - 1]);
      }, wrongFirst && guard === 0);
      if (wrongFirst && guard === 0) {
        await sleep(100);
        check(await page.evaluate(() => window.__RK.trace.strokeIndex === 0 && window.__RK.trace.misses === 1), "tulis: goresan terbalik tidak diterima");
      }
      await sleep(150);
    }
  };

  // ---- 1 HITUNG-KETUK: legs of the white cow (one wrong number first)
  await waitStep("kaki");
  const legs = await tapTargets();
  const wrong = await page.$(`[data-n]:not([data-n="${legs}"])`);
  await wrong.click(); await sleep(150);
  check(await page.evaluate(() => window.__RK.R.phase === "choose"), "kaki: angka salah tidak menyelesaikan soal");
  await page.click(`[data-n="${legs}"]`);
  check(await page.evaluate(() => window.__RK.R.phase === "done"), `kaki: memilih ${legs} benar`);
  await next();

  // ---- 2 BACA-KETUK-SUKU: SA · PI on the collar (PI first is out of order)
  await waitStep("kalung");
  await page.click('[data-suku="1"]'); await sleep(150);
  check(await page.evaluate(() => window.__RK.R.tapped === 0 && window.__RK.R.tries === 2), "kalung: PI duluan tidak diterima (mulai dari kiri)");
  await page.click('[data-suku="0"]'); await page.click('[data-suku="1"]');
  await waitDone();
  check(await page.locator(".kartu-suku.nyala").count() === 2, "kalung: SA dan PI menyala berurutan");
  await page.screenshot({ path: `${OUT}/${vp.name}-1-kalung.png` });
  await next();

  // ---- 3 WARNA-TOKOH: colouring screen
  await page.waitForFunction(() => window.__RK.screen === "warnai");
  const box = await page.locator(".papan-warna").boundingBox();
  const R_ = ["luar", "badan", "kepala", "moncong", "kuping", "tanduk", "kaki", "kuku", "ekor", "ambing", "corak"];
  /** A finger stroke through drawing-unit points (the crayon tip sits 64 px above the finger). */
  const fingerStroke = (units) => page.evaluate(({ units, bx, by, bw, bh }) => {
    const c = document.querySelector(".papan-warna");
    const toScreen = ([u, v]) => ({ x: bx + (u - 8) / 172 * bw + 10, y: by + (v - 20) / 156 * bh + 64 });
    const fire = (type, p) => c.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: "touch", isPrimary: true, clientX: p.x, clientY: p.y, bubbles: true }));
    const pts = units.map(toScreen);
    fire("pointerdown", pts[0]);
    const visible = !document.querySelector(".krayon-virtual").hidden;
    pts.slice(1).forEach((p) => fire("pointermove", p));
    fire("pointerup", pts[pts.length - 1]);
    return { visible, counts: window.__RK.board.paintedByRegion() };
  }, { units, bx: box.x, by: box.y, bw: box.width, bh: box.height });
  const named = (counts) => Object.fromEntries(counts.map((n, i) => [R_[i], n]).filter(([, n]) => n > 0));
  const line = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => [a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]);
  // finger mode: a stroke on the body that overshoots across the snout and off the cow colours the body only
  const r1 = await fingerStroke(line([76, 80], [176, 80], 30));
  check(r1.visible, "mode jari: krayon virtual tampil saat mewarnai");
  check(r1.counts[1] > 2000 && Object.keys(named(r1.counts)).length === 1, `mode jari: goresan tetap di badan saja (${JSON.stringify(named(r1.counts))})`);
  await page.evaluate(() => window.__RK.board.clear());
  // the "donut": the crayon lands on the body, crosses it to a spot, then colours the spot. Only the spot gets colour.
  const scribble = [];
  for (let k = 0; k < 8; k++) scribble.push(...line([50, 66 + k], [62, 66 + k], 6), ...line([62, 66.5 + k], [50, 66.5 + k], 6));
  const r2 = await fingerStroke([...line([36, 71], [55, 71], 5), ...scribble]);
  check(r2.counts[10] > 1500 && r2.counts[1] === 0, `mode jari: lewat badan menuju corak, hanya corak yang berwarna (${JSON.stringify(named(r2.counts))})`);
  await page.evaluate(() => window.__RK.board.clear());
  // after colouring the body a while, slipping onto a spot does not move the colour to the spot
  const bodyFirst = [];
  for (let k = 0; k < 6; k++) bodyFirst.push(...line([64, 96 + k * 2], [80, 96 + k * 2], 5), ...line([80, 97 + k * 2], [64, 97 + k * 2], 5));
  const r3 = await fingerStroke([...bodyFirst, ...line([80, 100], [100, 98], 6)]);
  check(r3.counts[1] > 2000 && r3.counts[10] === 0, `mode jari: setelah lama di badan, terpeleset ke corak tidak pindah (${JSON.stringify(named(r3.counts))})`);
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
  await page.screenshot({ path: `${OUT}/${vp.name}-2-warnai.png`, fullPage: true });
  await noScroll("mewarnai");
  await page.click("#doneBtn");
  await page.waitForFunction(() => window.__RK.screen === "main" && window.__RK.R.phase === "done");
  const colors = await page.evaluate(() => ({
    badan: "#" + window.__RK.cow.regions.badan[0].material.color.getHexString(),
    kaki: "#" + window.__RK.cow.regions.kaki[0].material.color.getHexString(),
    tanduk: "#" + window.__RK.cow.regions.tanduk[0].material.color.getHexString(),
  }));
  check(colors.badan === "#f7c925" && colors.kaki === "#f28c28" && colors.tanduk === "#2b2b2b", `warna anak pindah ke sapi 3D (${JSON.stringify(colors)})`);
  await sleep(800);
  await page.screenshot({ path: `${OUT}/${vp.name}-3-sapi.png` });
  await next();

  // ---- 4 HITUNG-SEKILAS: horns are shown, covered, then the child picks 1-4
  await page.waitForFunction(() => window.__RK.STEPS[window.__RK.R.si].id === "tanduk" && window.__RK.R.phase === "choose", null, { timeout: 25000 });
  check(await page.isVisible(".tirai") && await page.locator(".angka.empat .token").count() === 4, "tanduk sekilas: panggung ditutup, pilihan 1-4");
  await page.screenshot({ path: `${OUT}/${vp.name}-4-sekilas.png` });
  if (vp === VIEWPORTS[0]) {
    // two misses: a longer second look, then counting by tapping, with the answer marked
    await page.click('[data-n="3"]');
    await page.waitForFunction(() => window.__RK.R.phase === "lihat", null, { timeout: 10000 });
    check(!(await page.isVisible(".tirai")), "tanduk sekilas: salah pertama, tanduk ditampilkan lagi");
    await page.waitForFunction(() => window.__RK.R.phase === "choose", null, { timeout: 15000 });
    await page.click('[data-n="4"]'); await sleep(150);
    check(await page.evaluate(() => window.__RK.R.phase === "count" && window.__RK.R.glanceTap), "tanduk sekilas: salah kedua, beralih ke menghitung dengan ketukan");
    await tapTargets();
    check(await page.locator('.token.petunjuk[data-n="2"]').count() === 1, "tanduk sekilas: setelah diketuk, jawaban benar disorot");
  }
  await page.click('[data-n="2"]');
  check(await page.evaluate(() => window.__RK.R.phase === "done"), "tanduk sekilas: memilih 2 benar");
  await next();

  // ---- 5 HITUNG-KETUK: mangoes (after a walk). A save point was written at the chapter start.
  await waitStep("mangga");
  check(await page.evaluate(() => window.__RK.progress.savedRun(1)?.si === 4), "titik simpan: tersimpan di awal babak Pohon");
  if (vp === VIEWPORTS[0]) {
    // leave and come back: the episode goes on from the save point, with the child's colours
    await page.reload(); await page.waitForLoadState("networkidle");
    await page.click('[data-ep="1"]'); await sleep(500);
    check(await page.isVisible("#lanjutBtn"), "titik simpan: kartu episode menawarkan Lanjutkan");
    await page.click("#lanjutBtn");
    await page.waitForFunction(() => window.__RK.screen === "main" && window.__RK.cow && window.__RK.R.si === 4, null, { timeout: 30000 });
    check(await page.evaluate(() => "#" + window.__RK.cow.regions.badan[0].material.color.getHexString()) === "#f7c925", "titik simpan: sapi tetap berwarna setelah dilanjutkan");
  }
  const n = await tapTargets();
  await page.click(`[data-n="${n}"]`);
  check(await page.evaluate(() => window.__RK.R.phase === "done"), `mangga: memilih ${n} benar`);
  await page.screenshot({ path: `${OUT}/${vp.name}-5-mangga.png` });
  await next();

  // ---- 6 TULIS-TEBAL: S (backwards first, then right)
  await waitStep("tulis-s");
  check(await page.isVisible(".tulis-papan") && !(await page.isVisible("#stage3d")), "tulis S: kertas tulis menggantikan panggung 3D");
  await page.waitForFunction(() => !window.__RK.trace.busy, null, { timeout: 10000 });
  await page.screenshot({ path: `${OUT}/${vp.name}-6-tulis-s.png` });
  await traceLetter(true);
  await waitDone();
  check(await page.locator(".t-tebal").count() === 1, "tulis S: goresan jadi tebal berwarna");
  await next();

  // ---- 7 HITUNG-URUT: stepping stones 1-5 (a wrong stone first)
  await waitStep("batu");
  const wrongStone = await page.$('[data-batu]:not([data-batu="1"])');
  await wrongStone.click(); await sleep(150);
  check(await page.evaluate(() => window.__RK.R.stone === 1), "batu: nomor yang salah tidak diinjak");
  for (let k = 1; k <= 5; k++) { await page.click(`[data-batu="${k}"]`); await sleep(120); }
  await waitDone();
  await sleep(600);
  check(await page.evaluate(() => Math.abs(window.__RK.cow.group.position.x - 13.9) < 0.05), "batu: sapi sampai di batu kelima");
  await page.screenshot({ path: `${OUT}/${vp.name}-7-batu.png` });
  await next();

  // ---- 8 BACA-SUSUN: RU + MAH (one wrong card first)
  await waitStep("rumah");
  await page.waitForFunction(() => window.__RK.cameraSettled(), null, { timeout: 15000 });
  await page.click('[data-card="BU"]'); await sleep(150);
  check(await page.evaluate(() => window.__RK.R.built.length === 0), "rumah: kartu BU tidak diterima");
  await page.click('[data-card="RU"]'); await page.click('[data-card="MAH"]');
  check(await page.isVisible("text=Betul! Ini RUMAH Budi."), "rumah: RU + MAH tersusun");
  await sleep(2500);
  check(await page.evaluate(() => window.__RK.world.door.rotation.y < -0.8), "rumah: pintu terbuka");
  await next();

  // ---- 9 TULIS-LENGKAPI: S _ PI, write A (three strokes)
  await waitStep("tulis-a");
  check(await page.isVisible(".kata-besar.konteks .kosong"), "tulis A: kata S _ PI tampil sebagai konteks");
  await traceLetter(false);
  await waitDone();
  check((await page.textContent(".kata-besar.konteks")).replace(/\s/g, "") === "SAPI", "tulis A: papan nama lengkap jadi SAPI");
  check(await page.locator(".t-tebal").count() === 3, "tulis A: tiga goresan tebal");
  await page.screenshot({ path: `${OUT}/${vp.name}-8-tulis-a.png` });
  await next();

  // ---- 10 BACA-PILIH-BENDA: SA-PU (a wrong picture first, then tap the broom in 3D)
  await waitStep("sapu");
  await page.waitForFunction(() => window.__RK.cameraSettled(), null, { timeout: 15000 });
  await page.click('[data-item="bola"]'); await sleep(150);
  check(await page.evaluate(() => window.__RK.R.phase !== "done"), "sapu: memilih bola tidak diterima");
  const [sapu] = await targetsOnScreen(page, "items");
  check(sapu.visible, "sapu: benda sapu terlihat di 3D");
  await tap(page, vp, sapu.x, sapu.y); await sleep(300);
  check(await page.evaluate(() => window.__RK.R.phase === "done"), "sapu: mengetuk sapu 3D diterima");
  await noScroll("petualangan");
  await next();

  // ---- 11 BACA-KETUK-SUKU with a pause: read the name board together
  await waitStep("papan");
  await page.click('[data-suku="0"]'); await page.click('[data-suku="1"]');
  await page.waitForFunction(() => !!document.getElementById("nextBtn"), null, { timeout: 15000 });
  await page.screenshot({ path: `${OUT}/${vp.name}-9-papan.png` });

  // ---- finish: sticker + report
  await next();
  await page.waitForFunction(() => window.__RK.screen === "selesai");
  check((await page.getAttribute("#newSticker", "src")).startsWith("data:image/png"), "stiker sapi dibuat");
  await sleep(800); // let the sticker finish landing
  await page.screenshot({ path: `${OUT}/${vp.name}-10-selesai.png`, fullPage: true });
  await page.click("#toMapBtn"); await sleep(300);
  check(await page.locator('.pulau.selesai[data-ep="1"]').count() === 1, "peta: episode 1 bertanda selesai");
  await page.click('[data-go="stiker"]');
  check(await page.locator(".slot.ada").count() === 1, "buku stiker: stiker sapi muncul");
  await page.screenshot({ path: `${OUT}/${vp.name}-11-stiker.png`, fullPage: true });
  await page.click('#stiker [data-go="peta"]'); await sleep(200);
  // parents' room behind the gate: a wrong answer keeps it closed, the right one opens it
  await page.click('#peta [data-go="ortu"]');
  const [ga, gb] = (await page.textContent("#gateSoal")).match(/\d+/g).map(Number);
  const wrongGate = await page.$(`[data-gate]:not([data-gate="${ga * gb}"])`);
  await wrongGate.click(); await sleep(150);
  check(await page.evaluate(() => window.__RK.screen === "peta"), "gerbang orang tua: jawaban salah tidak membuka");
  await page.click(`[data-gate="${ga * gb}"]`);
  check(await page.evaluate(() => window.__RK.screen === "ortu"), "gerbang orang tua: jawaban benar membuka ruang Ayah/Bunda");
  check(await page.locator(".laporan tbody tr").count() >= 10, "ruang Ayah/Bunda: laporan berisi 10 soal");
  check(await page.isVisible("text=Menulis"), "ruang Ayah/Bunda: laporan memuat menulis");
  await page.screenshot({ path: `${OUT}/${vp.name}-12-ortu.png`, fullPage: true });
  await noScroll("ruang Ayah/Bunda");

  check(errors.length === 0, `tanpa error console${errors.length ? ": " + errors.join(" | ") : ""}`);
  await ctx.close();
}

await browser.close();
stopServer();
if (warnings.length) console.log(`\n${warnings.length} peringatan:\n  ` + warnings.join("\n  "));
console.log(failures.length ? `\n${failures.length} GAGAL` : "\nSemua lulus");
process.exit(failures.length ? 1 : 0);
