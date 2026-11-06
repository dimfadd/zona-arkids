/* Gambarku Hidup - scan app. Port of prototype/src/app.js to a Vite + TS module. */
import "@fontsource/fredoka/latin-500.css";
import "@fontsource/fredoka/latin-600.css";
import "@fontsource/fredoka/latin-700.css";
import "@fontsource/nunito/latin-500.css";
import "@fontsource/nunito/latin-700.css";
import "@fontsource/nunito/latin-800.css";
import "./style.css";

import * as THREE from "three";
import { registerSW } from "virtual:pwa-register";
import * as C from "./core";
import type { Mat3, RGBAImage, Vec3 } from "./core";
import { AR } from "./vendor/aruco.js";
import rawConfig from "./content/config.json";

// ----------------------------------------------------------------- config types
interface Leg { x: number; y: number; r: number }
interface Piece {
  id: string; kind: "animal" | "letter"; box: number[]; hingeY: number;
  mask?: string; radius?: number; legs?: Leg[]; ch?: string;
}
interface Syllable { text: string; letters: number[]; say: string[] }
type Task =
  | { type: "count"; prompt: string; answer: number }
  | { type: "spell"; syllables: Syllable[]; word: { text: string; say: string } };
interface Sheet { title: string; markers: Record<string, [number, number][]>; pieces: Piece[]; task: Task }
interface Config { page: [number, number]; sheets: Record<string, Sheet> }

const CFG = rawConfig as unknown as Config;
const DEMO: Record<string, string> = { warna: "/demo/photo-warna.jpg", tebal: "/demo/photo-tebal.jpg" };

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector(s) as T;
const DEG = Math.PI / 180;
const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
const PX_PER_MM = 4;

// ----------------------------------------------------------------- dom
const el = {
  intro: $("#intro"), play: $("#play"), stage: $("#stage"), stageWrap: $("#stageWrap"),
  bg: $<HTMLImageElement>("#bg"), vid: $<HTMLVideoElement>("#vid"), gl: $<HTMLCanvasElement>("#gl"),
  chip: $("#chip"), busy: $("#busy"), panel: $("#panel"), toast: $("#toast"),
  file: $<HTMLInputElement>("#file"), liveBtn: $<HTMLButtonElement>("#liveBtn"), backBtn: $<HTMLButtonElement>("#backBtn"),
  replayBtn: $<HTMLButtonElement>("#replayBtn"), viewBtn: $<HTMLButtonElement>("#viewBtn"),
  captureBtn: $<HTMLButtonElement>("#captureBtn"), installBtn: $<HTMLButtonElement>("#installBtn"),
  liveNote: $("#liveNote"), iosNote: $("#iosNote"),
};

let toastTimer = 0;
function toast(msg: string, ms?: number) {
  el.toast.textContent = msg; el.toast.hidden = false;
  clearTimeout(toastTimer); toastTimer = window.setTimeout(() => (el.toast.hidden = true), ms || 4200);
}

// ----------------------------------------------------------------- state
interface PieceRT {
  pc: Piece; hinge: THREE.Group; front: THREE.Mesh; back: THREE.Mesh; hole: THREE.Mesh; shadow: THREE.Group;
  shadowMesh: THREE.Mesh; delay: number; target: number; phase: number; hopAt: number; hopH: number;
  badges: THREE.Mesh[]; cur?: number; yaw?: number;
}
type Mode = "idle" | "photo" | "live-scan" | "live";
const S = {
  mode: "idle" as Mode,
  W: 0, H: 0, f: 1000,
  sheetKey: null as string | null, sheet: null as Sheet | null,
  pieces: [] as PieceRT[], t0: 0, view: "ar" as "ar" | "3d", yaw: -18 * DEG, pitch: 52 * DEG,
  task: null as null | { type: string; counted: number[]; playing: boolean },
  stream: null as MediaStream | null, lastSeen: 0, smooth: null as [number, number][] | null,
  liveH: null as Mat3 | null, liveKey: null as string | null, liveCount: 0, pageTex: null as THREE.Texture | null,
  savedPose: null as { R: Vec3[]; t: Vec3 } | null, photoUrl: null as string | null, pausedLive: false,
};

// ----------------------------------------------------------------- three
const renderer = new THREE.WebGLRenderer({ canvas: el.gl, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 5, 20000);
const pageRoot = new THREE.Group();
pageRoot.matrixAutoUpdate = false;
scene.add(pageRoot);

// page outline used while scanning live
const outline = (() => {
  const [pw, ph] = CFG.page;
  const g = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, -0.3), new THREE.Vector3(pw, 0, -0.3), new THREE.Vector3(pw, ph, -0.3), new THREE.Vector3(0, ph, -0.3)]);
  const l = new THREE.LineLoop(g, new THREE.LineBasicMaterial({ color: 0x3ad08a }));
  l.visible = false; pageRoot.add(l); return l;
})();

// virtual paper for the 3D view
const pagePlane = (() => {
  const [pw, ph] = CFG.page;
  const g = new THREE.PlaneGeometry(pw, ph); g.translate(pw / 2, ph / 2, 0.2);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.BackSide }));
  m.visible = false; pageRoot.add(m); return m;
})();

/** OpenCV pose -> three.js: diag(1,-1,-1) * [R|t]. */
function setPoseMatrix(R: Vec3[], t: Vec3) {
  if (S.mode === "photo") S.savedPose = { R, t };
  pageRoot.matrix.set(
    R[0][0], R[1][0], R[2][0], t[0],
    -R[0][1], -R[1][1], -R[2][1], -t[1],
    -R[0][2], -R[1][2], -R[2][2], -t[2],
    0, 0, 0, 1);
  pageRoot.matrixWorldNeedsUpdate = true;
}

function setCameraFromIntrinsics() {
  camera.fov = 2 * Math.atan(S.H / 2 / S.f) / DEG;
  camera.aspect = S.W / S.H;
  camera.updateProjectionMatrix();
}

function setOrbitPose() {
  const [pw, ph] = CFG.page;
  const D = 470;
  const tilt = -(90 * DEG - S.pitch);
  const m = new THREE.Matrix4().makeScale(1, -1, -1)
    .multiply(new THREE.Matrix4().makeTranslation(0, -18, D))
    .multiply(new THREE.Matrix4().makeRotationX(tilt))
    .multiply(new THREE.Matrix4().makeRotationZ(S.yaw))
    .multiply(new THREE.Matrix4().makeTranslation(-pw / 2, -ph / 2 - 10, 0));
  pageRoot.matrix.copy(m); pageRoot.matrixWorldNeedsUpdate = true;
  camera.fov = 42; camera.aspect = S.W / S.H; camera.updateProjectionMatrix();
}

// ----------------------------------------------------------------- layout
const sideBySide = window.matchMedia("(min-width: 900px), (orientation: landscape) and (max-height: 560px)");
function layout() {
  if (!S.W) return;
  const cw = el.stageWrap.clientWidth || 360;
  const vh = window.visualViewport?.height ?? window.innerHeight;
  // Phones in portrait: stage on top, task below, so leave room for the toolbar + panel.
  // Side-by-side: the stage can use nearly the full height.
  const maxH = sideBySide.matches ? Math.max(220, vh - (document.body.classList.contains("playing") && vh < 560 ? 16 : 110))
    : Math.max(260, Math.min(vh * 0.62, 760));
  const s = Math.min(cw / S.W, maxH / S.H);
  const w = Math.round(S.W * s), h = Math.round(S.H * s);
  el.stage.style.width = w + "px"; el.stage.style.height = h + "px"; el.stage.style.aspectRatio = "auto";
  renderer.setSize(w, h, false);
}
new ResizeObserver(() => layout()).observe(el.stageWrap);
window.addEventListener("resize", layout);
window.visualViewport?.addEventListener("resize", layout);

// ----------------------------------------------------------------- images
function loadImage(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
}
function toImageData(source: CanvasImageSource, w: number, h: number) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const x = c.getContext("2d", { willReadFrequently: true })!;
  x.drawImage(source, 0, 0, w, h);
  return x.getImageData(0, 0, w, h);
}
function canvasFrom(img: { data: Uint8ClampedArray<ArrayBuffer>; width: number; height: number }) {
  const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
  c.getContext("2d")!.putImageData(new ImageData(img.data, img.width, img.height), 0, 0);
  return c;
}

const detector = new AR.Detector();
function detect(source: CanvasImageSource, sw: number, sh: number, detW: number) {
  const scale = sw / detW, dh = Math.round(sh / scale);
  const small = toImageData(source, detW, dh);
  const markers = detector.detect(small);
  return C.correspondences(markers, CFG.sheets, scale);
}

// ----------------------------------------------------------------- masks
const maskCache: Record<string, HTMLCanvasElement> = {};
async function pieceMask(pc: Piece, w: number, h: number) {
  // canvas with white RGB and alpha = keep
  const key = pc.id + S.sheetKey + w + "x" + h;
  if (maskCache[key]) return maskCache[key];
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const x = c.getContext("2d", { willReadFrequently: true })!;
  if (pc.mask) {
    const im = await loadImage(pc.mask);
    x.drawImage(im, 0, 0, w, h);
    const d = x.getImageData(0, 0, w, h);
    for (let i = 0; i < d.data.length; i += 4) { d.data[i + 3] = d.data[i]; d.data[i] = d.data[i + 1] = d.data[i + 2] = 255; }
    x.putImageData(d, 0, 0);
  } else {
    const s = w / pc.box[2], r = (pc.radius || 4) * s, inset = 0.4 * s;
    x.fillStyle = "#fff"; x.beginPath();
    if (x.roundRect) x.roundRect(inset, inset, w - 2 * inset, h - 2 * inset, r); else x.rect(inset, inset, w - 2 * inset, h - 2 * inset);
    x.fill();
  }
  maskCache[key] = c; return c;
}
function grayFromAlpha(maskC: HTMLCanvasElement, blurPx: number) {
  const c = document.createElement("canvas"); c.width = maskC.width; c.height = maskC.height;
  const x = c.getContext("2d")!;
  x.fillStyle = "#000"; x.fillRect(0, 0, c.width, c.height);
  if (blurPx) x.filter = `blur(${blurPx}px)`;
  x.drawImage(maskC, 0, 0);
  return c;
}
function tex(canvas: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(canvas);
  t.flipY = false; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
  t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  return t;
}
type BasicMat = THREE.MeshBasicMaterial;

// ----------------------------------------------------------------- pieces
function clearPieces() {
  for (const p of S.pieces) {
    pageRoot.remove(p.hinge, p.hole, p.shadow);
    [p.front, p.back, p.hole, p.shadowMesh].forEach((m) => {
      const mat = m.material as BasicMat;
      m.geometry.dispose(); mat.map?.dispose(); mat.alphaMap?.dispose(); mat.dispose();
    });
    p.badges.forEach((b) => { const mat = b.material as BasicMat; mat.map?.dispose(); mat.dispose(); b.geometry.dispose(); });
  }
  S.pieces = [];
}

async function buildPieces(src: RGBAImage, H: Mat3) {
  clearPieces();
  const sheet = S.sheet!;
  let i = 0;
  for (const pc of sheet.pieces) {
    const [bx, by, bw, bh] = pc.box;
    const raw = C.rectify(src, H, pc.box, PX_PER_MM, S.mode === "photo" ? 2 : 1);
    const white = C.paperWhite(raw);
    C.enhance(raw, white, pc.kind === "letter" ? { sat: 1.25, ink: 1.25 } : { sat: 1.2 });
    const w = raw.width, h = raw.height;
    const mask = await pieceMask(pc, w, h);
    // front: drawing with mask alpha
    const front = canvasFrom(raw);
    const fx = front.getContext("2d")!;
    fx.globalCompositeOperation = "destination-in"; fx.drawImage(mask, 0, 0);
    fx.globalCompositeOperation = "source-over";
    // hole: paper-tone silhouette with an inner shade along the top edge
    const tone = `rgb(${white.map((v) => Math.round(v * 0.93)).join(",")})`;
    const hole = document.createElement("canvas"); hole.width = w; hole.height = h;
    const hx = hole.getContext("2d")!;
    hx.fillStyle = tone; hx.fillRect(0, 0, w, h);
    hx.globalCompositeOperation = "destination-in"; hx.drawImage(mask, 0, 0);
    hx.globalCompositeOperation = "source-atop";
    hx.filter = `blur(${Math.max(2, w / 90)}px)`; hx.globalAlpha = 0.45;
    const inv = document.createElement("canvas"); inv.width = w; inv.height = h;
    const ix = inv.getContext("2d")!; ix.fillStyle = "#3a3026"; ix.fillRect(0, 0, w, h);
    ix.globalCompositeOperation = "destination-out"; ix.drawImage(mask, 0, Math.max(3, h / 60));
    hx.drawImage(inv, 0, 0);
    const maskGray = grayFromAlpha(mask, 0);
    const shadowGray = grayFromAlpha(mask, Math.max(3, w / 45));

    const geo = () => { const g = new THREE.PlaneGeometry(bw, bh); g.translate(bx + bw / 2, by - pc.hingeY + bh / 2, 0); return g; };
    const hinge = new THREE.Group(); hinge.position.set(0, pc.hingeY, 0); hinge.rotation.order = "ZYX";
    // BackSide on purpose: the plane normal points into the paper and the camera sees its back face.
    const frontMesh = new THREE.Mesh(geo(), new THREE.MeshBasicMaterial({ map: tex(front), alphaTest: 0.5, side: THREE.BackSide }));
    const backMesh = new THREE.Mesh(geo(), new THREE.MeshBasicMaterial({ color: 0xe9e3d8, alphaMap: tex(maskGray), alphaTest: 0.5, side: THREE.FrontSide }));
    hinge.add(frontMesh, backMesh);

    const holeGeo = new THREE.PlaneGeometry(bw, bh); holeGeo.translate(bx + bw / 2, by + bh / 2, -0.05);
    const holeMesh = new THREE.Mesh(holeGeo, new THREE.MeshBasicMaterial({ map: tex(hole), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    holeMesh.renderOrder = 1;

    const shadow = new THREE.Group(); shadow.position.set(0, pc.hingeY, -0.12);
    const shadowMesh = new THREE.Mesh(geo(), new THREE.MeshBasicMaterial({ color: 0x1a120a, alphaMap: tex(shadowGray), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    shadowMesh.renderOrder = 2; shadow.add(shadowMesh);

    pageRoot.add(holeMesh, shadow, hinge);
    const p: PieceRT = {
      pc, hinge, front: frontMesh, back: backMesh, hole: holeMesh, shadow, shadowMesh,
      delay: 0.25 + i * 0.16, target: (pc.kind === "letter" ? 74 : 70) * DEG, phase: i * 1.3 + 0.4,
      hopAt: 0, hopH: pc.kind === "letter" ? 9 : 14, badges: [],
    };
    pc.legs?.forEach((leg) => {
      const b = badge("");
      b.position.set(leg.x, leg.y - pc.hingeY, -0.6); b.visible = false;
      hinge.add(b); p.badges.push(b);
    });
    S.pieces.push(p); i++;
  }
}

function badge(text: string) {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(13, 13),
    new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, depthTest: false, side: THREE.BackSide }));
  m.renderOrder = 10; m.userData.canvas = c; drawBadge(m, text); return m;
}
function drawBadge(m: THREE.Mesh, text: string) {
  const c = m.userData.canvas as HTMLCanvasElement, x = c.getContext("2d")!;
  x.clearRect(0, 0, 128, 128);
  x.fillStyle = "#ffffff"; x.beginPath(); x.arc(64, 64, 60, 0, 7); x.fill();
  x.fillStyle = "#f07f1a"; x.beginPath(); x.arc(64, 64, 52, 0, 7); x.fill();
  x.fillStyle = "#fff"; x.font = "700 70px Fredoka, Nunito, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
  x.fillText(text, 64, 69);
  (m.material as BasicMat).map!.needsUpdate = true;
}

// ----------------------------------------------------------------- animation
const easeOutBack = (k: number) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
const _inv = new THREE.Matrix4(), _cam = new THREE.Vector3();
function animatePieces(now: number) {
  const t = (now - S.t0) / 1000;
  let camLocal: THREE.Vector3 | null = null;
  if (S.view === "ar" && S.pieces.length) {
    pageRoot.updateMatrixWorld(true);
    _inv.copy(pageRoot.matrixWorld).invert();
    camLocal = _cam.set(0, 0, 0).applyMatrix4(_inv);
  }
  for (const p of S.pieces) {
    // face the camera: stand less upright when the photo is taken from straight above
    let want = p.target, yawWant = 0;
    if (camLocal) {
      const hx = p.pc.box[0] + p.pc.box[2] / 2, vx = camLocal.x - hx, vy = camLocal.y - p.pc.hingeY, vz = camLocal.z;
      // angle of the camera seen from the hinge, in the plane the piece folds in
      const eS = Math.atan2(-vz, vy);
      want = Math.max(25 * DEG, Math.min(p.target, 135 * DEG - eS));
      const horiz = Math.hypot(vx, vy);
      if (p.pc.kind === "animal" && horiz > 40 && vy > 0) yawWant = Math.max(-20 * DEG, Math.min(20 * DEG, Math.atan2(-vx, vy)));
    }
    p.cur = p.cur == null ? want : p.cur + (want - p.cur) * 0.12;
    p.yaw = p.yaw == null ? yawWant : p.yaw + (yawWant - p.yaw) * 0.12;
    const k = Math.min(1, Math.max(0, (t - p.delay) / 0.95));
    const base = p.cur * (k > 0 ? easeOutBack(k) : 0);
    const settle = Math.min(1, Math.max(0, (t - p.delay - 0.95) / 0.8));
    const amp = (reduceMotion ? 1.2 : 5) * DEG;
    const th = base + settle * amp * Math.sin(t * 2 * Math.PI * 0.62 + p.phase);
    p.hinge.rotation.x = th;
    p.hinge.rotation.z = p.yaw * Math.min(1, k * 1.5) + settle * (reduceMotion ? 0.01 : 0.04) * Math.sin(t * 2 * Math.PI * 0.31 + p.phase * 1.7);
    let hz = 0, sc = 1;
    if (p.hopAt) {
      const ht = (now - p.hopAt) / 1000;
      if (ht < 0.55) { hz = -Math.sin((ht / 0.55) * Math.PI) * p.hopH; sc = 1 + 0.07 * Math.sin((ht / 0.55) * Math.PI); }
      else p.hopAt = 0;
    }
    p.hinge.position.z = hz;
    p.hinge.scale.set(sc, sc, sc);
    const lift = Math.min(1, th / (40 * DEG));
    (p.hole.material as BasicMat).opacity = Math.min(1, k * 4);
    p.shadow.scale.y = Math.max(0.12, 0.18 + 0.5 * Math.cos(th));
    p.shadow.rotation.z = p.hinge.rotation.z;
    (p.shadowMesh.material as BasicMat).opacity = (p.pc.kind === "letter" ? 0.16 : 0.24) * lift * (1 - Math.min(0.5, -hz / 40));
  }
}

function hop(p: PieceRT | undefined, now?: number) { if (p) p.hopAt = now || performance.now(); }

function loop(now: number) {
  requestAnimationFrame(loop);
  if (S.mode === "idle" || document.hidden) return;
  if (S.mode === "live-scan" || S.mode === "live") trackLive(now);
  if (S.view === "3d") setOrbitPose();
  animatePieces(now);
  renderer.render(scene, camera);
}
requestAnimationFrame(loop);

// ----------------------------------------------------------------- speech
let voice: SpeechSynthesisVoice | null = null;
function pickVoice() {
  if (!("speechSynthesis" in window)) return;
  const vs = speechSynthesis.getVoices();
  voice = vs.find((v) => /^id([-_]|$)/i.test(v.lang)) || vs.find((v) => /indones/i.test(v.name)) || null;
}
if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function say(text: string, rate?: number) {
  return new Promise<void>((res) => {
    if (!("speechSynthesis" in window)) { setTimeout(res, 650); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "id-ID"; if (voice) u.voice = voice;
    u.rate = rate || 0.82; u.pitch = 1.15;
    let done = false; const fin = () => { if (!done) { done = true; res(); } };
    u.onend = fin; u.onerror = fin;
    setTimeout(fin, 900 + text.length * 170);
    speechSynthesis.speak(u);
  });
}
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ----------------------------------------------------------------- tasks
const NUM = ["nol", "satu", "dua", "tiga", "empat", "lima"];
function setupTask() {
  const task = S.sheet!.task;
  S.task = { type: task.type, counted: [], playing: false };
  if (task.type === "count") renderCount(); else renderSpell("ready");
}

function renderCount() {
  const task = S.sheet!.task as Extract<Task, { type: "count" }>;
  const n = task.answer, c = S.task!.counted.length, done = c >= n;
  el.panel.innerHTML = `
    <h2>${done ? `Hebat! Kaki sapi ada ${n}.` : task.prompt}</h2>
    <p class="${done ? "success" : ""}">${done ? "Ketuk sapinya untuk mendengar suaranya, atau hitung ulang." : "Ketuk kaki sapi satu per satu di gambar. Hitung bersama anak."}</p>
    <div class="row"><div class="slots">${Array.from({ length: n }, (_, i) => `<div class="slot ${i < c ? "on" : ""}">${i < c ? i + 1 : ""}</div>`).join("")}</div>
    ${c ? `<button class="btn small" id="recount" type="button">Hitung ulang</button>` : ""}</div>`;
  const rc = document.getElementById("recount");
  if (rc) rc.onclick = resetCount;
}
function resetCount() {
  S.task!.counted = []; S.pieces.forEach((p) => p.badges.forEach((b) => (b.visible = false))); renderCount();
}

function onCountTap(p: PieceRT, pageX: number, pageY: number, now: number) {
  const task = S.sheet!.task as Extract<Task, { type: "count" }>;
  const legs = p.pc.legs || [];
  let hit = -1, best = 1e9;
  legs.forEach((l, i) => { const d = Math.hypot(pageX - l.x, pageY - l.y); if (d < l.r * 1.45 && d < best) { best = d; hit = i; } });
  if (hit < 0) { hop(p, now); say("mooo", 0.7); return; }
  if (S.task!.counted.includes(hit)) { toast("Kaki itu sudah dihitung. Cari kaki yang lain."); return; }
  S.task!.counted.push(hit);
  const k = S.task!.counted.length;
  drawBadge(p.badges[hit], String(k)); p.badges[hit].visible = true;
  renderCount();
  if (k >= task.answer) {
    say(NUM[k]).then(() => { hop(p); confetti(); return say(`Hebat! Kaki sapi ada ${NUM[k]}.`); });
  } else say(NUM[k] || String(k));
}

function renderSpell(phase: "ready" | "play" | "done", caption?: string) {
  const task = S.sheet!.task as Extract<Task, { type: "spell" }>;
  const syl = task.syllables.map((s) => `<span>${s.text}</span>`).join("");
  if (phase === "ready") {
    el.panel.innerHTML = `<h2>Ayo eja bersama anak</h2>
      <p>Tunjuk huruf yang berdiri satu per satu dan minta anak mengejanya. Setelah anak selesai, ketuk tombol di bawah untuk mencocokkan.</p>
      <div class="row"><button class="btn leaf" id="checkSpell" type="button">Anak sudah mengeja · Cek</button></div>`;
    document.getElementById("checkSpell")!.onclick = playSpell;
  } else {
    el.panel.innerHTML = `<h2>${phase === "done" ? "Betul! Dibaca: Sapi" : "Dengarkan cara mengejanya"}</h2>
      <div class="caption" id="cap">${caption || ""}</div>
      <div class="syl">${phase === "done" ? syl + `<span>${task.word.text}</span>` : ""}</div>
      ${phase === "done" ? `<div class="row"><button class="btn small" id="again" type="button">Putar lagi</button><button class="btn small" id="reset" type="button">Eja ulang</button></div>` : ""}`;
    const a = document.getElementById("again"), r = document.getElementById("reset");
    if (a) a.onclick = playSpell;
    if (r) r.onclick = () => renderSpell("ready");
  }
}

async function playSpell() {
  if (!S.task || S.task.playing) return;
  S.task.playing = true;
  const task = S.sheet!.task as Extract<Task, { type: "spell" }>;
  const letters = S.pieces.filter((p) => p.pc.kind === "letter");
  const cow = S.pieces.find((p) => p.pc.kind === "animal");
  renderSpell("play", "");
  const setCap = (html: string) => { const c = document.getElementById("cap"); if (c) c.innerHTML = html; };
  const shown: string[] = [];
  for (const s of task.syllables) {
    for (let j = 0; j < s.letters.length; j++) {
      const L = letters[s.letters[j]];
      hop(L);
      shown.push(L.pc.ch || "");
      setCap(renderCaption(shown, null));
      await say(s.say[j]);
      await wait(120);
    }
    s.letters.forEach((li) => hop(letters[li]));
    setCap(renderCaption(shown, s.text));
    await say(s.say[s.say.length - 1]);
    await wait(260);
    shown.push(" ");
  }
  letters.forEach((L, i) => setTimeout(() => hop(L), i * 90));
  if (cow) setTimeout(() => hop(cow), 380);
  setCap(`<span class="hl">Sapi</span>`);
  await say("dibaca, " + task.word.say);
  confetti();
  if (S.task) S.task.playing = false;
  renderSpell("done", `S-A <span class="hl">Sa</span> · P-I <span class="hl">Pi</span>`);
}
function renderCaption(shown: string[], syl: string | null) {
  const txt = shown.join("").trim().split(" ").map((g) => g.split("").join("-")).join(" · ");
  return syl ? `${txt} <span class="hl">${syl[0] + syl.slice(1).toLowerCase()}</span>` : txt;
}

function confetti() {
  if (reduceMotion) return;
  const cols = ["#f07f1a", "#23855a", "#3a7bd5", "#f2c230", "#e24f6b"];
  const r = el.stage.getBoundingClientRect();
  for (let i = 0; i < 34; i++) {
    const s = document.createElement("span"); s.className = "confetti";
    s.style.left = (r.width * (0.15 + Math.random() * 0.7)) + "px"; s.style.top = (r.height * (0.05 + Math.random() * 0.25)) + "px";
    s.style.background = cols[i % cols.length]; s.style.setProperty("--dx", (Math.random() * 120 - 60) + "px");
    s.style.animationDelay = (Math.random() * 0.25) + "s";
    el.stage.appendChild(s); setTimeout(() => s.remove(), 1800);
  }
}

// ----------------------------------------------------------------- tapping & orbit
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let drag: { x: number; y: number; moved: boolean; yaw: number; pitch: number } | null = null;
el.gl.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, moved: false, yaw: S.yaw, pitch: S.pitch }; el.gl.setPointerCapture(e.pointerId); });
el.gl.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (Math.hypot(dx, dy) > 7) drag.moved = true;
  if (drag.moved && S.view === "3d") {
    S.yaw = Math.max(-75 * DEG, Math.min(75 * DEG, drag.yaw + dx * 0.006));
    S.pitch = Math.max(18 * DEG, Math.min(88 * DEG, drag.pitch + dy * 0.005));
  }
});
el.gl.addEventListener("pointercancel", () => { drag = null; });
el.gl.addEventListener("pointerup", (e) => {
  const d = drag; drag = null;
  if (!d || d.moved || !S.pieces.length || !S.task) return;
  const r = el.gl.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  pageRoot.updateMatrixWorld(true);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(S.pieces.map((p) => p.front), false);
  if (!hits.length || !hits[0].uv) return;
  const h = hits[0], p = S.pieces.find((q) => q.front === h.object)!;
  const [bx, by, bw, bh] = p.pc.box;
  const px = bx + h.uv!.x * bw, py = by + h.uv!.y * bh;
  const now = performance.now();
  if (S.task.type === "count" && p.pc.kind === "animal") onCountTap(p, px, py, now);
  else if (p.pc.kind === "letter") {
    hop(p, now);
    const ch = (p.pc.ch || "").toLowerCase();
    say(ch === "s" ? "es" : ch === "p" ? "pe" : ch);
  } else { hop(p, now); say("mooo", 0.7); }
});

// ----------------------------------------------------------------- flows
// The Android back button returns to the start screen instead of leaving the app.
function showPlay() {
  el.intro.hidden = true; el.play.hidden = false; document.body.classList.add("playing");
  if (history.state?.gh !== "play") history.pushState({ gh: "play" }, "");
  requestAnimationFrame(layout);
}
function resetToIntro() {
  stopLive(); clearPieces(); S.mode = "idle"; S.view = "ar"; S.task = null; S.savedPose = null;
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  el.play.hidden = true; el.intro.hidden = false; el.panel.innerHTML = ""; el.bg.removeAttribute("src");
  el.stage.classList.remove("view3d"); pagePlane.visible = false; el.bg.hidden = false; el.viewBtn.textContent = "Putar 3D";
  document.body.classList.remove("playing");
  window.scrollTo({ top: 0 });
}
window.addEventListener("popstate", () => { if (!el.play.hidden) resetToIntro(); });
function goBack() { if (history.state?.gh === "play") history.back(); else resetToIntro(); }

function photoFailed(title: string, body: string) {
  el.busy.hidden = true;
  el.panel.innerHTML = `<h2>${title}</h2><p>${body}</p><div class="row"><label class="btn primary" for="file">Foto ulang</label></div>`;
}

async function runPhoto(src: string) {
  stopLive();
  showPlay();
  S.mode = "photo"; S.view = "ar"; el.stage.classList.remove("view3d"); el.viewBtn.textContent = "Putar 3D";
  pagePlane.visible = false; pageRoot.visible = true; outline.visible = false;
  el.vid.hidden = true; el.bg.hidden = false; el.captureBtn.hidden = true; el.chip.hidden = true;
  el.viewBtn.hidden = false; el.replayBtn.hidden = false;
  clearPieces();
  el.panel.innerHTML = `<h2>Membaca lembar…</h2><p>Mencari 4 kotak hitam di pojok.</p>`;
  el.busy.hidden = false; el.busy.textContent = "Membaca lembar…";
  try {
    const im = await loadImage(src);
    const maxSide = 2000, s = Math.min(1, maxSide / Math.max(im.naturalWidth, im.naturalHeight));
    S.W = Math.round(im.naturalWidth * s); S.H = Math.round(im.naturalHeight * s);
    el.bg.src = src; layout();
    await wait(30);
    const full = toImageData(im, S.W, S.H);
    const detW = Math.min(1100, S.W);
    let corr = detect(im, S.W, S.H, detW);
    if (!corr || corr.count < 4) { const c2 = detect(im, S.W, S.H, Math.min(1600, S.W)); if (c2 && (!corr || c2.count > corr.count)) corr = c2; }
    if (!corr || corr.count < 2) {
      photoFailed("Kotak hitam di pojok belum terbaca", "Foto ulang dari atas, dengan cahaya terang, dan pastikan keempat kotak hitam masuk ke foto. Jangan sampai tertutup jari.");
      return;
    }
    if (corr.count < 4) toast(`Baru ${corr.count} dari 4 pojok terbaca. Hasilnya bisa sedikit meleset.`);
    S.sheetKey = corr.key; S.sheet = CFG.sheets[corr.key];
    const H = C.homography(corr.src, corr.dst)!;
    const fe = C.estimateFocal(H, S.W, S.H);
    S.f = corr.count === 4 && fe.estimated ? fe.f : 0.78 * Math.max(S.W, S.H);
    setCameraFromIntrinsics();
    const P = C.pose(H, S.f, S.W, S.H);
    setPoseMatrix(P.R, P.t);
    el.busy.textContent = "Memotong gambar…";
    await wait(20);
    await document.fonts?.ready;
    await buildPieces(full, H);
    // virtual paper for the 3D view
    const pageImg = C.rectify(full, H, [0, 0, CFG.page[0], CFG.page[1]], 2, 1);
    C.enhance(pageImg, C.paperWhite(pageImg), { sat: 1.1 });
    S.pageTex?.dispose();
    S.pageTex = tex(canvasFrom(pageImg));
    pagePlane.material.map = S.pageTex; pagePlane.material.needsUpdate = true;
    el.busy.hidden = true;
    S.t0 = performance.now();
    setupTask();
  } catch (err) {
    console.error(err);
    photoFailed("Foto tidak bisa dibuka", "Coba foto ulang atau pilih foto lain.");
  }
}

// ----------------------------------------------------------------- live camera
function getCamera() {
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false,
  });
}
async function attachStream(stream: MediaStream) {
  S.stream = stream; el.vid.srcObject = stream;
  await el.vid.play().catch(() => {});
  await new Promise<void>((r) => { if (el.vid.videoWidth) r(); else el.vid.onloadedmetadata = () => r(); });
}

async function startLive() {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) { liveBlocked(); return; }
  let stream: MediaStream;
  try { stream = await getCamera(); } catch { liveBlocked(); return; }
  await attachStream(stream);
  showPlay(); clearPieces();
  S.mode = "live-scan"; S.view = "ar"; S.W = el.vid.videoWidth; S.H = el.vid.videoHeight;
  S.f = 0.78 * Math.max(S.W, S.H); setCameraFromIntrinsics(); layout();
  pagePlane.visible = false; el.stage.classList.remove("view3d"); el.viewBtn.textContent = "Putar 3D";
  el.bg.hidden = true; el.vid.hidden = false; el.chip.hidden = false; el.captureBtn.hidden = false; el.captureBtn.disabled = true;
  el.viewBtn.hidden = true; el.replayBtn.hidden = true; S.smooth = null; S.task = null; S.sheetKey = null;
  el.panel.innerHTML = `<h2>Arahkan kamera ke lembar</h2><p>Pegang HP di atas lembar sampai 4 kotak hitam terlihat dan garis hijau muncul di tepi kertas. Lalu ketuk <b>Hidupkan!</b></p>`;
}
function liveBlocked() {
  el.liveNote.hidden = false;
  el.liveNote.textContent = window.isSecureContext
    ? "Izin kamera ditolak atau kamera tidak tersedia. Izinkan kamera di pengaturan browser, atau pakai tombol foto."
    : "Kamera langsung butuh alamat HTTPS. Pakai tombol foto dulu.";
  toast(el.liveNote.textContent, 6000);
}
function stopLive() {
  if (S.stream) { S.stream.getTracks().forEach((t) => t.stop()); S.stream = null; }
  el.vid.srcObject = null; outline.visible = false; S.pausedLive = false;
}

// Release the camera when the app goes to the background, and take it back on return.
document.addEventListener("visibilitychange", async () => {
  const live = S.mode === "live-scan" || S.mode === "live";
  if (document.hidden && live && S.stream) {
    S.stream.getTracks().forEach((t) => t.stop()); S.stream = null; S.pausedLive = true;
  } else if (!document.hidden && live && S.pausedLive) {
    S.pausedLive = false;
    try { await attachStream(await getCamera()); S.smooth = null; } catch { liveBlocked(); goBack(); }
  }
});

const detCanvas = document.createElement("canvas");
const detCtx = detCanvas.getContext("2d", { willReadFrequently: true })!;
function trackLive(now: number) {
  if (el.vid.readyState < 2 || !S.stream) return;
  // Some phones change the video size after rotation; keep the projection in sync.
  if (el.vid.videoWidth && (el.vid.videoWidth !== S.W || el.vid.videoHeight !== S.H)) {
    S.W = el.vid.videoWidth; S.H = el.vid.videoHeight; S.f = 0.78 * Math.max(S.W, S.H);
    setCameraFromIntrinsics(); layout(); S.smooth = null;
  }
  const detW = 640, scale = S.W / detW, dh = Math.round(S.H / scale);
  if (detCanvas.width !== detW || detCanvas.height !== dh) { detCanvas.width = detW; detCanvas.height = dh; }
  detCtx.drawImage(el.vid, 0, 0, detW, dh);
  const markers = detector.detect(detCtx.getImageData(0, 0, detW, dh));
  const corr = C.correspondences(markers, CFG.sheets, scale);
  const okCount = corr ? corr.count : 0;
  if (corr && okCount >= 2 && (!S.sheetKey || S.mode === "live-scan" || corr.key === S.sheetKey)) {
    const H = C.homography(corr.src, corr.dst);
    if (H) {
      const [pw, ph] = CFG.page, ref: [number, number][] = [[0, 0], [pw, 0], [pw, ph], [0, ph]];
      const proj = ref.map((p) => C.apply(H, p[0], p[1]));
      if (!S.smooth) S.smooth = proj;
      else S.smooth = S.smooth.map((q, i) => [q[0] + (proj[i][0] - q[0]) * 0.45, q[1] + (proj[i][1] - q[1]) * 0.45]);
      const Hs = C.homography(ref, S.smooth)!;
      const P = C.pose(Hs, S.f, S.W, S.H);
      setPoseMatrix(P.R, P.t);
      S.liveH = H; S.liveKey = corr.key; S.liveCount = okCount; S.lastSeen = now;
      pageRoot.visible = true;
    }
  }
  const lost = now - S.lastSeen > 450;
  if (lost) { pageRoot.visible = false; S.smooth = null; }
  if (S.mode === "live-scan") {
    outline.visible = !lost;
    el.chip.textContent = lost ? "Mencari 4 kotak hitam…" : `${S.liveCount} dari 4 pojok terlihat`;
    el.chip.classList.toggle("ok", !lost && S.liveCount >= 3);
    el.captureBtn.disabled = lost || S.liveCount < 3;
  } else {
    el.chip.textContent = lost ? "Arahkan lagi ke lembar" : "Ketuk gambarnya";
    el.chip.classList.toggle("ok", !lost);
  }
}

async function captureLive() {
  if (!S.liveH || !S.liveKey) return;
  el.captureBtn.disabled = true;
  el.busy.hidden = false; el.busy.textContent = "Memotong gambar…";
  await wait(20);
  const full = toImageData(el.vid, S.W, S.H);
  S.sheetKey = S.liveKey; S.sheet = CFG.sheets[S.liveKey];
  // re-detect on this exact frame for a sharper cut
  const c = document.createElement("canvas"); c.width = S.W; c.height = S.H; c.getContext("2d")!.putImageData(full, 0, 0);
  const corr = detect(c, S.W, S.H, Math.min(1000, S.W));
  const H = (corr && corr.key === S.sheetKey && corr.count >= 2 && C.homography(corr.src, corr.dst)) || S.liveH;
  await document.fonts?.ready;
  await buildPieces(full, H);
  el.busy.hidden = true; outline.visible = false;
  S.mode = "live"; el.captureBtn.hidden = true; el.replayBtn.hidden = false;
  S.t0 = performance.now();
  setupTask();
}

// ----------------------------------------------------------------- wiring
el.file.addEventListener("change", () => {
  const f = el.file.files?.[0];
  if (!f) return;
  if (S.photoUrl) URL.revokeObjectURL(S.photoUrl);
  S.photoUrl = URL.createObjectURL(f);
  runPhoto(S.photoUrl);
  el.file.value = "";
});
document.querySelectorAll<HTMLElement>("[data-demo]").forEach((b) => b.addEventListener("click", () => runPhoto(DEMO[b.dataset.demo!])));
el.liveBtn.addEventListener("click", startLive);
el.captureBtn.addEventListener("click", captureLive);
el.backBtn.addEventListener("click", goBack);
el.replayBtn.addEventListener("click", () => {
  S.t0 = performance.now();
  if (S.task?.type === "count") resetCount();
});
el.viewBtn.addEventListener("click", () => {
  if (S.view === "ar") {
    S.view = "3d"; el.bg.hidden = true; pagePlane.visible = true; el.stage.classList.add("view3d");
    el.viewBtn.textContent = "Kembali ke foto"; toast("Geser gambar untuk memutar.", 2500);
  } else {
    S.view = "ar"; el.bg.hidden = false; pagePlane.visible = false; el.stage.classList.remove("view3d");
    el.viewBtn.textContent = "Putar 3D"; setCameraFromIntrinsics();
    if (S.savedPose) setPoseMatrix(S.savedPose.R, S.savedPose.t); // restore photo pose
  }
});

// ----------------------------------------------------------------- PWA
registerSW({ immediate: true });

let installEvt: (Event & { prompt: () => Promise<void> }) | null = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault(); installEvt = e as typeof installEvt; el.installBtn.hidden = false;
});
el.installBtn.addEventListener("click", async () => {
  if (!installEvt) return;
  el.installBtn.hidden = true; await installEvt.prompt(); installEvt = null;
});
window.addEventListener("appinstalled", () => { el.installBtn.hidden = true; });

const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
if (isIOS && !standalone) el.iosNote.hidden = false;
if (!window.isSecureContext) el.liveNote.hidden = false;

// Handle for automated browser tests.
(window as unknown as { __GH: unknown }).__GH = { S, pageRoot, camera, renderer, THREE };
