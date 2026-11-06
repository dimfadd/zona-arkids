const puppeteer = require("puppeteer-core"); const fs = require("fs"), path = require("path");
const OUT = process.argv[2];
(async () => {
  const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new",
    args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
      "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream",
      "--use-file-for-fake-video-capture=" + path.join(__dirname, "../build/live.y4m")] });
  const page = await browser.newPage();
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true });
  await page.setRequestInterception(true);
  page.on("request", (r) => {
    const u = r.url();
    if (u.includes("three.min.js")) return r.respond({ status: 200, contentType: "text/javascript", body: fs.readFileSync(path.join(__dirname, "../node_modules/three/build/three.min.js")) });
    if (u.startsWith("https://fonts.")) return r.respond({ status: 200, contentType: "text/css", body: "" });
    r.continue();
  });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  await page.goto("http://localhost:8765/");
  await page.click("#liveBtn");
  await page.waitForFunction(() => !document.querySelector("#captureBtn").disabled, { timeout: 20000 }).catch(() => console.log("capture never enabled"));
  console.log("chip:", await page.$eval("#chip", (e) => e.textContent));
  await page.screenshot({ path: OUT + "/live-scan.png" });
  await page.click("#captureBtn");
  await page.waitForFunction(() => window.__GH.S.mode === "live", { timeout: 20000 });
  await new Promise((r) => setTimeout(r, 2500));
  console.log("chip after:", await page.$eval("#chip", (e) => e.textContent));
  await page.screenshot({ path: OUT + "/live-on.png" });
  await browser.close();
})();
