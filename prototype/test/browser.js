const puppeteer = require("puppeteer-core");
const fs = require("fs"), path = require("path");
const OUT = process.argv[2];
(async () => {
  const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new",
    args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: false });
  await page.setRequestInterception(true);
  page.on("request", (r) => {
    const u = r.url();
    if (u.includes("three.min.js")) return r.respond({ status: 200, contentType: "text/javascript", body: fs.readFileSync(path.join(__dirname, "../node_modules/three/build/three.min.js")) });
    if (u.startsWith("https://fonts.")) return r.respond({ status: 200, contentType: "text/css", body: "" });
    r.continue();
  });
  page.on("console", (m) => console.log("console:", m.type(), m.text()));
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  await page.goto("file://" + path.join(__dirname, "../dist/standalone/index.html"));
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: OUT + "/s0-intro.png", fullPage: true });
  for (const demo of ["warna", "tebal"]) {
    await page.click(`[data-demo=${demo}]`);
    await page.waitForFunction(() => window.__GH && window.__GH.S.pieces.length > 0, { timeout: 30000 });
    await new Promise((r) => setTimeout(r, 300));
    await page.screenshot({ path: `${OUT}/s1-${demo}-fold.png` });
    await new Promise((r) => setTimeout(r, 2600));
    await page.screenshot({ path: `${OUT}/s2-${demo}-stand.png`, fullPage: true });
    if (demo === "warna") {
      // tap each leg by projecting its page position through the standee
      const pts = await page.evaluate(() => {
        const G = window.__GH, { THREE } = G, p = G.S.pieces[0];
        G.pageRoot.updateMatrixWorld(true);
        const r = document.querySelector("#gl").getBoundingClientRect();
        return p.pc.legs.map((l) => {
          const v = new THREE.Vector3(l.x, l.y - p.pc.hingeY, 0).applyMatrix4(p.hinge.matrixWorld).project(G.camera);
          return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height];
        });
      });
      for (const [x, y] of pts) { await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.up(); await new Promise((r) => setTimeout(r, 250)); }
      await new Promise((r) => setTimeout(r, 600));
      await page.screenshot({ path: `${OUT}/s3-warna-counted.png`, fullPage: true });
      await page.click("#viewBtn");
      await new Promise((r) => setTimeout(r, 900));
      await page.screenshot({ path: `${OUT}/s4-warna-3d.png` });
      await page.click("#viewBtn");
    } else {
      await page.click("#checkSpell");
      await new Promise((r) => setTimeout(r, 1500));
      await page.screenshot({ path: `${OUT}/s3-tebal-spell.png` });
      await page.waitForFunction(() => !window.__GH.S.task.playing, { timeout: 40000 });
      await page.screenshot({ path: `${OUT}/s4-tebal-done.png`, fullPage: true });
    }
    await page.click("#backBtn");
    await new Promise((r) => setTimeout(r, 300));
  }
  await browser.close();
})();
