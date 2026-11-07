/* Roket Kertas - play: colour a cow, it becomes 3D, then a short trip to Budi's house with counting and reading. */
import "@fontsource/andika/latin-400.css";
import "@fontsource/andika/latin-700.css";
import "@fontsource/plus-jakarta-sans/latin-400.css";
import "@fontsource/plus-jakarta-sans/latin-500.css";
import "@fontsource/plus-jakarta-sans/latin-700.css";
import "@fontsource/plus-jakarta-sans/latin-800.css";
import "./play.css";

import * as THREE from "three";
import { registerSW } from "virtual:pwa-register";
import { ColoringBoard } from "./coloring";
import { CRAYONS } from "./cow-art";
import { Cow3D, anchorOf, type Countable } from "./cow3d";
import { World, STOPS, type Item } from "./world";
import { progress, type Attempt } from "./progress";
import { say, hush, NUM, setMuted, isMuted } from "./speech";
import { MUSIM_1, IKON, ikonSvg, type Episode } from "./episodes";

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector(s) as T;
const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const ICON_DENGAR = `<svg aria-hidden="true"><use href="#i-suara"/></svg>`;

const el = {
  peta: $("#peta"), stiker: $("#stiker"), ortu: $("#ortu"), warnai: $("#warnai"), main: $("#main"), selesai: $("#selesai"),
  dunia: $("#dunia"), stickers: $("#stickers"), report: $("#report"), clearData: $<HTMLButtonElement>("#clearData"),
  epSheet: $<HTMLDialogElement>("#epSheet"), epIkon: $("#epIkon"), epNo: $("#epNo"), epJudul: $("#epJudul"), epMenit: $("#epMenit"),
  epBelajar: $("#epBelajar"), epAksi: $("#epAksi"),
  gate: $<HTMLDialogElement>("#gate"), gateSoal: $("#gateSoal"), gatePilihan: $("#gatePilihan"),
  boardHost: $("#boardHost"), palette: $("#palette"), undoBtn: $<HTMLButtonElement>("#undoBtn"), clearBtn: $<HTMLButtonElement>("#clearBtn"),
  doneBtn: $<HTMLButtonElement>("#doneBtn"), stage: $("#stage3d"), loading: $("#loading3d"), panel: $("#panel"),
  chapters: $("#chapters"), ortuMain: $<HTMLDetailsElement>("#ortuMain"), ortuMainIsi: $("#ortuMainIsi"),
  newSticker: $<HTMLImageElement>("#newSticker"), againBtn: $<HTMLButtonElement>("#againBtn"), toMapBtn: $<HTMLButtonElement>("#toMapBtn"),
  toast: $("#toast"), installBtn: $<HTMLButtonElement>("#installBtn"),
};

let toastTimer = 0;
function toast(msg: string, ms = 3500) {
  el.toast.textContent = msg; el.toast.hidden = false;
  clearTimeout(toastTimer); toastTimer = window.setTimeout(() => (el.toast.hidden = true), ms);
}

// =================================================================== screens
type Screen = "peta" | "stiker" | "ortu" | "warnai" | "main" | "selesai";
const SCREENS: Screen[] = ["peta", "stiker", "ortu", "warnai", "main", "selesai"];
let current: Screen = "peta";
function show(s: Screen) {
  current = s;
  SCREENS.forEach((k) => (el[k].hidden = k !== s));
  document.body.classList.toggle("di-ortu", s === "ortu");
  if (s !== "peta" && history.state?.rk !== "in") history.pushState({ rk: "in" }, "");
  if (s === "peta") renderMap();
  if (s === "stiker") renderStickers();
  if (s === "ortu") renderReport();
  window.scrollTo({ top: 0 });
}
function goHome() { hush(); running = false; if (history.state?.rk === "in") history.back(); else show("peta"); }
window.addEventListener("popstate", () => { if (current !== "peta") { hush(); running = false; show("peta"); } });
document.querySelectorAll<HTMLElement>("[data-back]").forEach((b) => b.addEventListener("click", goHome));
document.querySelectorAll<HTMLElement>("[data-go]").forEach((b) => b.addEventListener("click", () => {
  const to = b.dataset.go as Screen;
  if (to === "peta") goHome();
  else if (to === "ortu") openGate();
  else show(to);
}));

// sound on/off for the spoken prompts, remembered on this device
function setSound(on: boolean, save = true) {
  setMuted(!on);
  document.querySelectorAll<HTMLElement>("[data-sound]").forEach((b) => {
    b.setAttribute("aria-pressed", String(on)); b.setAttribute("aria-label", on ? "Suara menyala" : "Suara mati");
    b.querySelector("use")!.setAttribute("href", on ? "#i-suara" : "#i-bisu");
  });
  if (save) try { localStorage.setItem("rk.suara", on ? "1" : "0"); } catch { /* storage blocked */ }
}
document.querySelectorAll<HTMLElement>("[data-sound]").forEach((b) => b.addEventListener("click", () => setSound(isMuted())));
try { setSound(localStorage.getItem("rk.suara") !== "0", false); } catch { setSound(true, false); }

// =================================================================== the map
/** Where each island sits on the 400-wide map, and the winding road between them. */
const MAP_W = 400, STEP_Y = 165, TOP_Y = 110;
const ISLAND_X = [200, 300, 150, 92, 230, 312, 210, 100, 180, 290];
function islandXY(i: number) { return { x: ISLAND_X[i], y: TOP_Y + i * STEP_Y }; }
function episodeDone(no: number) { return no === 1 && progress.stickers().length > 0; }

function renderMap() {
  const n = MUSIM_1.length, H = TOP_Y + (n - 1) * STEP_Y + 140;
  const pts = MUSIM_1.map((_, i) => islandXY(i));
  let road = `M ${pts[0].x} ${pts[0].y - 60}`;
  pts.forEach((p, i) => {
    if (i === 0) { road += ` L ${p.x} ${p.y}`; return; }
    const a = pts[i - 1], my = (a.y + p.y) / 2;
    road += ` C ${a.x} ${my}, ${p.x} ${my}, ${p.x} ${p.y}`;
  });
  // cut-paper scenery: hill bands with a darker paper edge under each, clouds near the top, lollipop trees
  const hills: string[] = [];
  for (let k = 0, y = 260; y < H + 120; k++, y += 330) {
    const c = k % 2 ? "var(--rumput-2)" : "var(--rumput)";
    // the hills run far past the map's sides (the svg overflows), so on wide screens they reach the window edges
    const d = `M -1600 ${y + 10} Q -1000 ${y - 80} -400 ${y - 10} T -10 ${y} Q 70 ${y - 70} 150 ${y - 20} T 300 ${y - 30} T 410 ${y - 10} T 1000 ${y - 40} T 2000 ${y} V ${H + 20} H -1600 Z`;
    hills.push(`<path d="${d}" transform="translate(0 6)" fill="#3e7d3a" opacity=".35"/><path d="${d}" fill="${c}" stroke="#26231f" stroke-width="2"/>`);
  }
  const cloud = (x: number, y: number, s: number) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 18 Q0 4 14 6 Q20 -6 34 2 Q48 -2 50 12 Q62 14 58 26 H4 Q-4 26 0 18Z" fill="#fff" stroke="#26231f" stroke-width="2" /></g>`;
  const trees = [[40, 250], [360, 420], [330, 120], [30, 600], [370, 760], [40, 930], [360, 1100], [30, 1290], [370, 1430], [50, 1580]]
    .filter(([, y]) => y < H - 40)
    .map(([x, y]) => `<g transform="translate(${x} ${y})"><rect x="-3" y="0" width="6" height="22" fill="#8b5a2b" stroke="#26231f" stroke-width="1.5"/><circle cx="0" cy="-6" r="16" fill="var(--rumput-3)" stroke="#26231f" stroke-width="2"/></g>`);
  el.dunia.innerHTML = `
    <svg viewBox="0 0 ${MAP_W} ${H}" aria-hidden="true">
      ${cloud(20, 18, 1)}${cloud(300, 40, .8)}${cloud(250, 300, .7)}
      ${hills.join("")}
      ${trees.join("")}
      <path d="${road}" fill="none" stroke="#26231f" stroke-width="40" stroke-linecap="round"/>
      <path d="${road}" fill="none" stroke="var(--tanah)" stroke-width="34" stroke-linecap="round"/>
      <path d="${road}" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="2 14" stroke-linecap="round"/>
    </svg>`;
  const firstOpen = MUSIM_1.findIndex((e) => e.siap && !episodeDone(e.no));
  const here = firstOpen >= 0 ? firstOpen : 0;
  MUSIM_1.forEach((ep, i) => {
    const p = islandXY(i);
    const b = document.createElement("button");
    b.type = "button"; b.dataset.ep = String(ep.no);
    b.className = `pulau ${!ep.siap ? "kunci" : ""} ${episodeDone(ep.no) ? "selesai" : ""} ${i === here ? "sekarang" : ""}`;
    b.style.left = `${(p.x / MAP_W) * 100}%`; b.style.top = `${(p.y / H) * 100}%`;
    b.setAttribute("aria-label", `Episode ${ep.no}: ${ep.judul}${ep.siap ? "" : ", segera hadir"}${episodeDone(ep.no) ? ", selesai" : ""}`);
    b.innerHTML = `<span class="pulau-bulat">${ikonSvg(ep.ikon, 60)}<span class="pulau-no">${ep.no}</span>${ep.siap ? "" : `<span class="pulau-gembok"><svg><use href="#i-kunci"/></svg></span>`}</span>
      <span class="pulau-label">${esc(ep.judul)}</span>`;
    b.addEventListener("click", () => openEpisode(ep));
    el.dunia.append(b);
  });
  // the paper rocket of the logo, drawn as a sticker (white cut edge), marks where the child is
  const marker = document.createElement("span");
  marker.className = "penanda"; marker.setAttribute("aria-hidden", "true");
  marker.innerHTML = `<svg viewBox="0 0 64 64" width="64" height="64">
    <path d="M32 3 Q47 15 46 40 L54 52 L44 50 L40 60 H24 L20 50 L10 52 L18 40 Q17 15 32 3Z" fill="#fff" stroke="#fff" stroke-width="7" stroke-linejoin="round"/>
    ${IKON.roket}</svg>`;
  const hp = islandXY(here);
  marker.style.left = `${((hp.x + 58) / MAP_W) * 100}%`; marker.style.top = `${((hp.y - 30) / H) * 100}%`;
  el.dunia.append(marker);
}

function openEpisode(ep: Episode) {
  el.epIkon.innerHTML = ikonSvg(ep.ikon, 64);
  el.epNo.textContent = `Episode ${ep.no}`;
  el.epJudul.textContent = ep.judul;
  el.epMenit.textContent = ep.siap ? ep.menit ?? "" : "Segera hadir";
  const row = (label: string, value: string, bg: string, mark: string) =>
    `<li><span class="ikon-kecil" style="background:${bg}">${mark}</span><div><b>${label}</b><span>${esc(value)}</span></div></li>`;
  const crayonMark = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M5 19 15 9l3 3-10 10H5zM15 9l2-2 3 3-2 2" fill="#fff" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
  const penMark = `<svg width="20" height="20" aria-hidden="true" style="color:#fff"><use href="#i-pen"/></svg>`;
  el.epBelajar.innerHTML = row("Mewarnai", ep.belajar.warnai, "var(--merah)", crayonMark)
    + row("Membaca", ep.belajar.baca, "var(--biru)", "Aa")
    + (ep.belajar.tulis ? row("Menulis", ep.belajar.tulis, "#6a43a3", penMark) : "")
    + row("Berhitung", ep.belajar.hitung, "var(--hijau)", "12");
  el.epAksi.innerHTML = ep.siap
    ? `<button class="tombol merah besar" id="playBtn" type="button"><svg><use href="#i-main"/></svg>${episodeDone(ep.no) ? "Main lagi" : "Main"}</button>`
    : `<p class="segera">Episode ini sedang dibuat. Selesaikan episode 1 dulu, ya.</p>`;
  document.getElementById("playBtn")?.addEventListener("click", () => {
    el.epSheet.close(); board.clear(); show("warnai");
    say("Ayo warnai sapimu. Pilih krayon, lalu gosok di gambarnya.");
  });
  el.epSheet.showModal();
  say(ep.judul);
}
document.getElementById("epTutup")!.addEventListener("click", () => el.epSheet.close());
el.epSheet.addEventListener("click", (e) => { if (e.target === el.epSheet) el.epSheet.close(); }); // tap on the backdrop

// =================================================================== sticker book
function renderStickers() {
  const st = progress.stickers();
  el.stickers.innerHTML = MUSIM_1.map((ep) => {
    const mine = ep.no === 1 ? st : [];
    const last = mine[mine.length - 1];
    return `<div class="slot ${last ? "ada" : ""}">
      <div class="slot-isi">${last ? `<img src="${last.png}" alt="Stiker ${esc(ep.judul)}">` : ikonSvg(ep.ikon, 64)}</div>
      <span class="slot-label">${esc(ep.judul)}</span>
      ${mine.length > 1 ? `<span class="slot-jumlah">${mine.length} stiker</span>` : ""}</div>`;
  }).join("");
}

// =================================================================== parents: gate, report, settings
function openGate() {
  const a = 3 + Math.floor(Math.random() * 7), b = 3 + Math.floor(Math.random() * 7), right = a * b;
  const opts = new Set([right]);
  while (opts.size < 3) opts.add(right + (Math.floor(Math.random() * 9) - 4 || 5));
  el.gateSoal.textContent = `${a} × ${b} = ?`;
  el.gatePilihan.innerHTML = [...opts].sort((x, y) => x - y).map((v) => `<button class="tombol putih" type="button" data-gate="${v}">${v}</button>`).join("");
  el.gatePilihan.querySelectorAll<HTMLButtonElement>("[data-gate]").forEach((btn) => btn.addEventListener("click", () => {
    if (Number(btn.dataset.gate) === right) { el.gate.close(); show("ortu"); }
    else { btn.classList.remove("salah"); void btn.offsetWidth; btn.classList.add("salah"); }
  }));
  el.gate.showModal();
}
document.getElementById("gateTutup")!.addEventListener("click", () => el.gate.close());
el.gate.addEventListener("click", (e) => { if (e.target === el.gate) el.gate.close(); });

function renderReport() {
  const log = progress.log();
  if (!log.length) { el.report.innerHTML = `<p class="kecil">Belum ada catatan. Laporan muncul setelah anak menyelesaikan soal pertama di episode 1.</p>`; return; }
  const of = (k: Attempt["skill"]) => log.filter((a) => a.skill === k);
  const tile = (k: Attempt["skill"], label: string) => { const a = of(k); return `<div><b>${a.filter((x) => x.tries === 1).length} dari ${a.length}</b><span>${label}, benar di percobaan pertama</span></div>`; };
  el.report.innerHTML = `
    <div class="ringkas">${tile("hitung", "Berhitung")}${tile("baca", "Membaca")}</div>
    <table class="laporan"><thead><tr><th>Soal</th><th>Kemampuan</th><th>Hasil</th><th>Tanggal</th></tr></thead><tbody>
    ${log.slice(-12).reverse().map((a) => `<tr><td class="kata">${esc(a.label)}</td><td>${a.skill === "hitung" ? "Berhitung" : "Membaca"}</td>
      <td class="${a.tries === 1 ? "hasil-1" : ""}">${a.tries === 1 ? "Benar langsung" : `Benar setelah ${a.tries} kali coba`}</td>
      <td>${new Date(a.at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</td></tr>`).join("")}
    </tbody></table>`;
}
let clearArmed = 0;
el.clearData.addEventListener("click", () => {
  const label = el.clearData.lastChild!;
  if (Date.now() - clearArmed > 4000) { clearArmed = Date.now(); label.textContent = "Ketuk lagi untuk menghapus"; return; }
  progress.clear(); clearArmed = 0; label.textContent = "Hapus data"; renderReport(); toast("Data di HP ini sudah dihapus.");
});

// =================================================================== colouring
const board = new ColoringBoard();
el.boardHost.append(board.el);
const crayonSvg = (hex: string) => `<svg viewBox="0 0 34 70" aria-hidden="true"><path d="M7 20 L17 2 L27 20Z" fill="${hex}" stroke="#26231f" stroke-width="2.4" stroke-linejoin="round"/><rect x="7" y="20" width="20" height="48" rx="3" fill="${hex}" stroke="#26231f" stroke-width="2.4"/><rect x="7" y="32" width="20" height="18" fill="#fff" opacity=".6"/><path d="M7 32 H27 M7 50 H27" stroke="#26231f" stroke-width="1.6"/></svg>`;
CRAYONS.forEach((c, i) => {
  const b = document.createElement("button");
  b.type = "button"; b.className = "krayon";
  b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(i === 0)); b.setAttribute("aria-label", `Krayon ${c.name}`);
  b.innerHTML = crayonSvg(c.hex);
  b.addEventListener("click", () => {
    board.color = c.hex; if (board.tool === "hapus") setTool("besar");
    el.palette.querySelectorAll(".krayon").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
    say(c.name, 1);
  });
  el.palette.append(b);
});
function setTool(t: "besar" | "kecil" | "hapus") {
  board.tool = t === "hapus" ? "hapus" : "kuas";
  if (t !== "hapus") board.size = t;
  document.querySelectorAll<HTMLElement>("[data-tool]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.tool === t)));
}
document.querySelectorAll<HTMLElement>("[data-tool]").forEach((b) => b.addEventListener("click", () => setTool(b.dataset.tool as "besar")));
board.onChange = () => { el.undoBtn.disabled = !board.canUndo(); };

// finger (virtual crayon, stays inside the part) or pen (paints where it touches); set in the parents' room
function setMode(m: "jari" | "pen", save = true) {
  board.inputMode = m;
  document.querySelectorAll<HTMLElement>("[data-mode]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.mode === m)));
  if (save) try { localStorage.setItem("rk.mode", m); } catch { /* storage blocked */ }
}
document.querySelectorAll<HTMLElement>("[data-mode]").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode as "jari" | "pen")));
board.onPenDetected = () => { setMode("pen"); toast("Pen terdeteksi. Mewarnai langsung dengan pen."); };
try { const saved = localStorage.getItem("rk.mode"); if (saved === "pen" || saved === "jari") setMode(saved, false); } catch { /* storage blocked */ }
el.undoBtn.addEventListener("click", () => board.undo());
let wipeArmed = 0;
el.clearBtn.addEventListener("click", () => {
  if (Date.now() - wipeArmed > 3000) { wipeArmed = Date.now(); toast("Ketuk sekali lagi untuk menghapus semua warna."); say("Ketuk sekali lagi untuk menghapus semua."); return; }
  wipeArmed = 0; board.clear();
});
el.doneBtn.addEventListener("click", () => {
  if (board.coverage() < 0.04) { toast("Warnai dulu sapinya, ya."); say("Warnai dulu sapinya, ya."); return; }
  startAdventure();
});

// =================================================================== 3D
let renderer: THREE.WebGLRenderer | null = null;
const scene = new THREE.Scene();
scene.background = new THREE.Color("#dcefff");
scene.fog = new THREE.Fog("#dcefff", 22, 48);
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
// total light on a lit face is about 1.0, so a crayon colour shows on the 3D cow as the child picked it
scene.add(new THREE.HemisphereLight(0xffffff, 0xd8e8cc, 0.55));
const sun = new THREE.DirectionalLight(0xffffff, 0.45); sun.position.set(4, 8, 6); scene.add(sun);
let world: World | null = null;
let cow: Cow3D | null = null;
let running = false;

/** Where the camera looks and how much width must fit on screen. */
interface Shot { target: THREE.Vector3; width: number; dir: THREE.Vector3 }
let shot: Shot = { target: new THREE.Vector3(0, 1.1, 0), width: 4.2, dir: new THREE.Vector3(0.12, 0.28, 1) };
const camTarget = new THREE.Vector3(0, 1.1, 0);
function shotFor(name: "sapi" | "kaki" | "kepala" | "jalan" | "pohon" | "rumah" | "dapur"): Shot {
  const c = cow!.group.position;
  switch (name) {
    case "sapi": return { target: new THREE.Vector3(c.x + 0.15, 1.15, 0), width: 4.4, dir: new THREE.Vector3(0.15, 0.3, 1) };
    // a little from above and behind, so near and far legs separate on screen
    case "kaki": return { target: new THREE.Vector3(c.x - 0.05, 0.6, 0), width: 2.8, dir: new THREE.Vector3(-0.35, 0.2, 1) };
    // three-quarter front view of the head: both horns, eyes and ears apart
    case "kepala": return { target: new THREE.Vector3(c.x + 1.3, 1.85, 0), width: 2.6, dir: new THREE.Vector3(1, 0.55, 0.45) };
    case "jalan": return { target: new THREE.Vector3(c.x + 1.2, 1.3, 0), width: 7, dir: new THREE.Vector3(0, 0.3, 1) };
    case "pohon": return { target: new THREE.Vector3(STOPS.pohon + 1.0, 2.0, -1.0), width: 5.6, dir: new THREE.Vector3(0, 0.12, 1) };
    case "rumah": return { target: new THREE.Vector3(STOPS.rumah + 0.6, 1.5, -1.6), width: 6.4, dir: new THREE.Vector3(0, 0.18, 1) };
    case "dapur": return { target: new THREE.Vector3(STOPS.rumah + 1.9, 0.75, -0.9), width: 6.2, dir: new THREE.Vector3(0, 0.45, 1) };
  }
}
function desiredCamera(s: Shot) {
  const vfov = camera.fov * Math.PI / 180;
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
  // fit the shot's width, and its height (~0.8 of the width) on wide, short screens
  const dist = Math.max(2.6, (s.width / 2) / Math.tan(hfov / 2), (s.width * 0.4) / Math.tan(vfov / 2));
  return s.target.clone().add(s.dir.clone().normalize().multiplyScalar(dist));
}

function ensure3D() {
  if (renderer) return;
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  el.stage.append(renderer.domElement);
  renderer.domElement.setAttribute("aria-label", "Sapimu dalam 3D. Ketuk bagian yang dihitung.");
  world = new World(); scene.add(world.group);
  cow = new Cow3D(); scene.add(cow.group);
  new ResizeObserver(resize3D).observe(el.stage);
  resize3D();
  bindTaps();
  requestAnimationFrame(loop);
}
function resize3D() {
  if (!renderer) return;
  const w = el.stage.clientWidth, h = el.stage.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix();
}

let lastFrame = performance.now();
/** True once the camera has reached the current shot (tests wait for this before tapping). */
function cameraSettled() {
  return camera.position.distanceTo(desiredCamera(shot)) < 0.01 && camTarget.distanceTo(shot.target) < 0.01;
}
function loop(now: number) {
  requestAnimationFrame(loop);
  if (!renderer || current !== "main" || document.hidden) return;
  cow!.update(now); world!.update(now);
  const want = desiredCamera(shot);
  // time-based easing: the camera arrives in about a second however fast the phone draws frames
  const dt = Math.min(0.1, (now - lastFrame) / 1000); lastFrame = now;
  const k = reduceMotion ? 1 : 1 - Math.exp(-dt * 5);
  camera.position.lerp(want, k); camTarget.lerp(shot.target, k);
  camera.lookAt(camTarget);
  badges.forEach((b) => b.update());
  renderer.render(scene, camera);
}

/** Walk the cow to x, the camera following along the road. */
function walkTo(x: number) {
  return new Promise<void>((done) => {
    const c = cow!; const from = c.group.position.x, dist = Math.abs(x - from);
    const dur = reduceMotion ? 300 : (dist / 2.4) * 1000, t0 = performance.now();
    c.walking = true; c.group.rotation.y = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / dur);
      c.group.position.x = from + (x - from) * k;
      shot = shotFor("jalan");
      if (k < 1) requestAnimationFrame(tick); else { c.walking = false; done(); }
    };
    requestAnimationFrame(tick);
  });
}

// ------------------------------------------------------------------- number badges that follow a part
class Badge {
  sprite: THREE.Sprite;
  /** px: on-screen diameter, the same however close the camera is, so a badge never hides a neighbour. */
  constructor(public part: THREE.Object3D, n: number, private px = 40) {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const x = c.getContext("2d")!;
    x.fillStyle = "#ffffff"; x.beginPath(); x.arc(64, 64, 60, 0, 7); x.fill();
    x.fillStyle = "#26231f"; x.beginPath(); x.arc(64, 64, 52, 0, 7); x.fill();
    x.fillStyle = "#ffffff"; x.font = "700 74px Andika, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(String(n), 64, 70);
    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, sizeAttenuation: false }));
    this.sprite.renderOrder = 20;
    scene.add(this.sprite); this.update();
  }
  update() {
    const p = anchorOf(this.part);
    const toCam = camera.position.clone().sub(p).normalize().multiplyScalar(0.35);
    this.sprite.position.copy(p.add(toCam));
    // sizeAttenuation off: scale is in view units at distance 1; turn the wanted pixels into that
    const h = Math.max(1, el.stage.clientHeight);
    this.sprite.scale.setScalar((this.px / h) * 2 * Math.tan((camera.fov * Math.PI) / 360));
  }
  dispose() { scene.remove(this.sprite); this.sprite.material.map?.dispose(); this.sprite.material.dispose(); }
}
let badges: Badge[] = [];
function clearBadges() { badges.forEach((b) => b.dispose()); badges = []; }

// =================================================================== adventure steps
type CountTarget = Countable | "mangga";
type Step =
  | { kind: "count"; id: string; target: CountTarget; prompt: string; noun: string; label: string; chapter: number }
  | { kind: "build"; id: string; parts: string[]; extra: string; word: string; chapter: number }
  | { kind: "pick"; id: string; parts: string[]; answer: Item; chapter: number };

const CHAPTERS = ["Sapiku", "Pohon", "Rumah", "Ibu"];
const STEPS: Step[] = [
  { kind: "count", id: "kaki", target: "kaki", prompt: "Ada berapa kaki sapimu?", noun: "Kaki sapi", label: "Kaki sapi", chapter: 0 },
  { kind: "count", id: "tanduk", target: "tanduk", prompt: "Ada berapa tanduk sapimu?", noun: "Tanduk sapi", label: "Tanduk sapi", chapter: 0 },
  { kind: "count", id: "mangga", target: "mangga", prompt: "Ada berapa mangga di pohon?", noun: "Mangganya", label: "Mangga", chapter: 1 },
  { kind: "build", id: "rumah", parts: ["RU", "MAH"], extra: "BU", word: "rumah", chapter: 2 },
  { kind: "pick", id: "sapu", parts: ["SA", "PU"], answer: "sapu", chapter: 3 },
];

interface Run {
  si: number; phase: "count" | "choose" | "done"; counted: number[]; tries: number;
  built: string[]; cards: string[]; mangoes: number;
}
let R: Run = { si: 0, phase: "count", counted: [], tries: 1, built: [], cards: [], mangoes: 4 };

async function startAdventure() {
  show("main");
  el.loading.hidden = false;
  await document.fonts?.load("700 40px Andika").catch(() => undefined);
  ensure3D();
  el.loading.hidden = true;
  running = true;
  const colors = board.regionColors();
  cow!.setColors(colors);
  cow!.group.position.set(STOPS.start, 0, 0); cow!.group.rotation.y = 0;
  world!.reset();
  // 3 to 5 mangoes; ?mangga=N fixes the number (used by the tests to check the fullest tree)
  const forced = Number(new URLSearchParams(location.search).get("mangga"));
  const mangoes = forced >= 1 && forced <= 5 ? forced : 3 + Math.floor(Math.random() * 3);
  R = { si: 0, phase: "count", counted: [], tries: 1, built: [], cards: [], mangoes };
  world!.setMangoes(R.mangoes);
  shot = shotFor("sapi");
  camera.position.copy(desiredCamera(shot)); camTarget.copy(shot.target);
  cow!.hop();
  openStep(0, false);
  await say("Ini sapimu! Geser untuk memutarnya.");
  if (running && R.si === 0) say(STEPS[0].kind === "count" ? STEPS[0].prompt : "");
}

function renderChapters() {
  const ch = STEPS[R.si].chapter;
  el.chapters.innerHTML = CHAPTERS.map((c, i) => `<li ${i === ch ? 'aria-current="step"' : ""} class="${i < ch ? "lewat" : ""}">${c}</li>`).join("");
}

function openStep(i: number, speak = true) {
  R.si = i; R.phase = "count"; R.counted = []; R.tries = 1; R.built = [];
  clearBadges();
  const s = STEPS[i];
  cow!.calm = s.kind === "count" && s.target !== "mangga" ? 1 : 0;
  if (s.kind === "count") {
    cow!.group.rotation.y = 0;
    shot = shotFor(s.target === "mangga" ? "pohon" : s.target === "kaki" ? "kaki" : "kepala");
  }
  if (s.kind === "build") { shot = shotFor("rumah"); R.cards = shuffle([...s.parts, s.extra]); }
  if (s.kind === "pick") { shot = shotFor("dapur"); world!.showItems(true); }
  renderChapters(); renderStep(); renderParentTools();
  if (speak) say(promptOf(s));
}
function promptOf(s: Step) {
  return s.kind === "count" ? s.prompt
    : s.kind === "build" ? "Susun kartunya, jadi nama tempat ini."
    : "Ibu minta tolong ambilkan benda ini. Baca kartunya, lalu pilih bendanya.";
}
function shuffle<T>(a: T[]) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function targetsOf(t: CountTarget): THREE.Object3D[] { return t === "mangga" ? world!.mangoes : cow!.countables[t]; }

/** Five answer cards around the right answer. */
function choices(n: number) { const start = Math.max(1, Math.min(n - 2, 6)); return Array.from({ length: 5 }, (_, i) => start + i); }

function renderStep() {
  const s = STEPS[R.si];
  const next = R.phase === "done"
    ? `<button class="tombol merah besar" id="nextBtn" type="button">${R.si === STEPS.length - 1 ? "Selesai!" : STEPS[R.si + 1].chapter !== s.chapter ? "Ayo jalan!" : "Lanjut"}</button>` : "";
  const ask = (t: string) => `<div class="soal"><p class="soal-teks">${esc(t)}</p><button class="bulat dengar" id="dengar" type="button" aria-label="Dengar lagi">${ICON_DENGAR}</button></div>`;
  if (s.kind === "count") {
    const n = targetsOf(s.target).length, c = R.counted.length;
    const body = R.phase === "count"
      ? `<div class="ketuk" aria-label="${c} dari ${n} sudah diketuk">${Array.from({ length: n }, (_, i) => `<span class="${i < c ? "on" : ""}">${i < c ? i + 1 : ""}</span>`).join("")}</div>`
      : R.phase === "choose"
        ? `<div class="angka" role="group" aria-label="Pilih jumlahnya">${choices(n).map((k) => `<button class="token" type="button" data-n="${k}">${k}</button>`).join("")}</div>`
        : `<p class="pujian">Betul! ${esc(s.noun)} ada ${n}.</p>`;
    el.panel.innerHTML = `${R.phase === "done" ? "" : ask(R.phase === "count" ? s.prompt : "Jadi, ada berapa?")}${body}${next}`;
    el.panel.querySelectorAll<HTMLButtonElement>("[data-n]").forEach((b) => b.addEventListener("click", () => chooseNumber(b, Number(b.dataset.n))));
  } else if (s.kind === "build") {
    const doneWord = R.built.length === s.parts.length;
    el.panel.innerHTML = `${doneWord ? `<p class="pujian">Betul! Ini RUMAH Budi.</p>` : ask("Susun kartunya, jadi nama tempat ini.")}
      <div class="slot-kata" aria-label="Kata yang disusun">${s.parts.map((_, i) => `<span>${R.built[i] ?? ""}</span>`).join("")}</div>
      ${doneWord ? "" : `<div class="kartu-baris" role="group" aria-label="Kartu suku kata">${R.cards.map((c) => `<button class="kartu-suku" type="button" data-card="${c}" ${R.built.includes(c) ? "disabled" : ""}>${c}</button>`).join("")}</div>`}
      ${next}`;
    el.panel.querySelectorAll<HTMLButtonElement>("[data-card]").forEach((b) => b.addEventListener("click", () => tapCard(b)));
  } else {
    el.panel.innerHTML = `${R.phase === "done" ? `<p class="pujian">Betul! Itu SAPU. Terima kasih!</p>` : ask("Ibu minta tolong ambilkan:")}
      <p class="kata-besar" aria-label="${s.parts.join("")}"><span>${s.parts[0]}</span><span class="s2">${s.parts[1]}</span></p>
      ${R.phase === "done" ? "" : `<div class="pilih-benda" role="group" aria-label="Pilih bendanya">${(["bola", "sapu", "topi"] as Item[]).map((k, i) => `<button class="benda" type="button" data-item="${k}" aria-label="Gambar ${i + 1}">${itemIcon(k)}</button>`).join("")}</div>`}
      ${next}`;
    el.panel.querySelectorAll<HTMLButtonElement>("[data-item]").forEach((b) => b.addEventListener("click", () => pickItem(b.dataset.item as Item, b)));
  }
  document.getElementById("dengar")?.addEventListener("click", () => say(R.phase === "choose" ? "Jadi, ada berapa?" : promptOf(s)));
  document.getElementById("nextBtn")?.addEventListener("click", nextStep);
}

/** Picture-only buttons, so the child has to read the word to choose. */
function itemIcon(k: Item) {
  const s = `fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"`;
  if (k === "sapu") return `<svg viewBox="0 0 48 48" ${s} aria-hidden="true"><path d="M30 4 22 28"/><path d="M14 26h16l4 16H10z"/><path d="M16 34l-2 8M22 34v8M28 34l2 8"/></svg>`;
  if (k === "bola") return `<svg viewBox="0 0 48 48" ${s} aria-hidden="true"><circle cx="24" cy="24" r="16"/><path d="M8 24h32"/><path d="M24 8c6 5 6 27 0 32"/></svg>`;
  return `<svg viewBox="0 0 48 48" ${s} aria-hidden="true"><path d="M6 34h36"/><path d="M14 34c0-12 4-18 10-18s10 6 10 18"/><path d="M14 28h20"/></svg>`;
}

// ------------------------------------------------------------------- counting
function countOne(index: number, part: THREE.Object3D) {
  const s = STEPS[R.si]; if (s.kind !== "count" || R.phase !== "count") return;
  if (R.counted.includes(index)) { toast("Yang itu sudah dihitung. Cari yang lain."); return; }
  R.counted.push(index);
  const k = R.counted.length, n = targetsOf(s.target).length;
  badges.push(new Badge(part, k, s.target === "mangga" ? 44 : 38));
  if (k >= n) { R.phase = "choose"; renderStep(); say(NUM[k]).then(() => say("Jadi, ada berapa?")); }
  else { renderStep(); say(NUM[k] || String(k)); }
}
function chooseNumber(btn: HTMLButtonElement, k: number) {
  const s = STEPS[R.si]; if (s.kind !== "count" || R.phase !== "choose") return;
  const n = targetsOf(s.target).length;
  if (k !== n) {
    R.tries++; btn.classList.remove("salah"); void btn.offsetWidth; btn.classList.add("salah");
    say("Hmm, coba hitung lagi angka terakhirnya.");
    if (R.tries >= 3) el.panel.querySelector(`[data-n="${n}"]`)?.classList.add("petunjuk");
    return;
  }
  R.phase = "done";
  progress.record({ skill: "hitung", label: `${s.label} (${n})`, tries: R.tries });
  renderStep(); if (s.target !== "mangga") cow!.hop();
  say(`Betul! ${s.noun} ada ${NUM[n] || n}.`);
}

// ------------------------------------------------------------------- reading: build RU + MAH
function tapCard(b: HTMLButtonElement) {
  const s = STEPS[R.si]; if (s.kind !== "build") return;
  const card = b.dataset.card!, want = s.parts[R.built.length];
  if (card !== want) {
    R.tries++; b.classList.remove("salah"); void b.offsetWidth; b.classList.add("salah");
    say(`Itu ${card.toLowerCase()}. Cari yang lain.`);
    if (R.tries >= 3) el.panel.querySelector(`[data-card="${want}"]`)?.classList.add("petunjuk");
    return;
  }
  R.built.push(card); say(card.toLowerCase());
  if (R.built.length === s.parts.length) {
    R.phase = "done";
    progress.record({ skill: "baca", label: s.parts.join("·"), tries: R.tries });
    renderStep();
    wait(700).then(() => say(`${s.parts.map((p) => p.toLowerCase()).join(", ")}, ${s.word}!`)).then(() => { world!.openDoor(); });
  } else renderStep();
}

// ------------------------------------------------------------------- reading: pick the SA-PU
function pickItem(item: Item, btn?: HTMLElement) {
  const s = STEPS[R.si]; if (s.kind !== "pick" || R.phase === "done") return;
  if (item !== s.answer) {
    R.tries++;
    if (btn) { btn.classList.remove("salah"); void (btn as HTMLElement).offsetWidth; btn.classList.add("salah"); }
    say(`Itu ${item}. Coba baca lagi: ${s.parts.map((p) => p.toLowerCase()).join("... ")}.`);
    if (R.tries >= 3) el.panel.querySelector(`[data-item="${s.answer}"]`)?.classList.add("petunjuk");
    return;
  }
  R.phase = "done";
  progress.record({ skill: "baca", label: s.parts.join("·"), tries: R.tries });
  const it = world!.items.sapu; it.position.set(world!.ibu.position.x + 0.45, 0, world!.ibu.position.z + 0.2);
  renderStep(); cow!.hop();
  say("Betul! Itu sapu. Terima kasih, ya!");
}

async function nextStep() {
  const s = STEPS[R.si];
  if (R.si === STEPS.length - 1) { finish(); return; }
  const n = STEPS[R.si + 1];
  if (n.chapter !== s.chapter) {
    el.panel.innerHTML = `<p class="pujian">Ayo jalan…</p>`;
    clearBadges();
    cow!.calm = 0;
    const to = n.chapter === 1 ? STOPS.pohon - 1.2 : STOPS.rumah - 2.4;
    if (n.kind === "pick") { openStep(R.si + 1); return; }
    await walkTo(to);
    if (!running) return;
  }
  openStep(R.si + 1);
}

function finish() {
  clearBadges();
  const png = board.snapshot(320);
  progress.addSticker(png);
  el.newSticker.src = png;
  show("selesai");
  say("Hore! Sapimu sudah membantu Ibu. Stikernya masuk ke buku stiker.");
}
el.againBtn.addEventListener("click", () => { board.clear(); show("warnai"); });
el.toMapBtn.addEventListener("click", goHome);

// ------------------------------------------------------------------- parent tools (also the keyboard path)
function renderParentTools() {
  const s = STEPS[R.si];
  el.ortuMainIsi.innerHTML = s.kind === "count"
    ? `<p>Biarkan anak mengetuk sendiri satu per satu, lalu memilih angkanya. Beri jeda sebelum membantu, dan puji usahanya.</p>
       <button class="tombol putih kecil" id="tandai" type="button">Ketukan tidak kena? Tandai satu</button>`
    : s.kind === "build"
      ? `<p>Tunjuk papan nama rumah, baca pelan bersama: ru, mah. Anak menyusun kartunya sendiri.</p>`
      : `<p>Ajak anak membaca kartu: sa, pu. Jangan sebutkan bendanya dulu; biar anak yang memilih.</p>`;
  document.getElementById("tandai")?.addEventListener("click", () => {
    const st = STEPS[R.si]; if (st.kind !== "count" || R.phase !== "count") return;
    const ts = targetsOf(st.target), i = ts.findIndex((_, k) => !R.counted.includes(k));
    if (i >= 0) countOne(i, ts[i]);
  });
}

// ------------------------------------------------------------------- taps and turning the cow
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function bindTaps() {
  const c = renderer!.domElement;
  let down: { x: number; y: number; rot: number; moved: boolean; id: number } | null = null;
  c.addEventListener("pointerdown", (e) => { down = { x: e.clientX, y: e.clientY, rot: cow!.group.rotation.y, moved: false, id: e.pointerId }; c.setPointerCapture(e.pointerId); });
  c.addEventListener("pointermove", (e) => {
    if (!down || e.pointerId !== down.id) return;
    const dx = e.clientX - down.x;
    if (Math.abs(dx) > 8 || Math.abs(e.clientY - down.y) > 8) down.moved = true;
    const s = STEPS[R.si];
    // the child may turn the cow while getting to know it
    if (down.moved && s.kind === "count" && s.target !== "mangga") cow!.group.rotation.y = down.rot + dx * 0.012;
  });
  c.addEventListener("pointercancel", () => { down = null; });
  c.addEventListener("pointerup", (e) => {
    const d = down; down = null;
    if (!d || d.moved) return;
    const r = c.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    onTap();
  });
}
function onTap() {
  const s = STEPS[R.si];
  if (s.kind === "count" && R.phase === "count") {
    const ts = targetsOf(s.target);
    const hit = ray.intersectObjects(ts, true)[0];
    if (!hit) { if (s.target !== "mangga" && ray.intersectObject(cow!.group, true).length) { cow!.hop(); say("mooo", 0.7); } return; }
    let o: THREE.Object3D | null = hit.object;
    while (o && !ts.includes(o)) o = o.parent;
    if (o) countOne(ts.indexOf(o), o);
  } else if (s.kind === "pick") {
    const hit = ray.intersectObjects(Object.values(world!.items), true)[0];
    if (hit) pickItem(hit.object.userData.item as Item, el.panel.querySelector<HTMLElement>(`[data-item="${hit.object.userData.item}"]`) ?? undefined);
  } else if (ray.intersectObject(cow!.group, true).length) { cow!.hop(); say("mooo", 0.7); }
}

// =================================================================== PWA + start
registerSW({ immediate: true });
let installEvt: (Event & { prompt: () => Promise<void> }) | null = null;
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installEvt = e as typeof installEvt; el.installBtn.hidden = false; });
el.installBtn.addEventListener("click", async () => { if (!installEvt) return; el.installBtn.hidden = true; await installEvt.prompt(); installEvt = null; });
window.addEventListener("appinstalled", () => { el.installBtn.hidden = true; });

show("peta");
history.replaceState({ rk: "home" }, "");

// Handle for automated browser tests.
(window as unknown as { __RK: unknown }).__RK = {
  board, get cow() { return cow; }, get world() { return world; }, camera, THREE, anchorOf, cameraSettled, get R() { return R; }, STEPS, get screen() { return current; },
};
