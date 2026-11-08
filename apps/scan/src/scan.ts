/* Roket Kertas - scan app. Port of prototype/src/app.js to a Vite + TS module. */
// Andika: letters children read (single-storey a/g, distinct I/l/1). Plus Jakarta Sans: parent-facing UI.
import "@fontsource/andika/latin-400.css";
import "@fontsource/andika/latin-700.css";
import "@fontsource/plus-jakarta-sans/latin-400.css";
import "@fontsource/plus-jakarta-sans/latin-500.css";
import "@fontsource/plus-jakarta-sans/latin-700.css";
import "@fontsource/plus-jakarta-sans/latin-800.css";
import "./style.css";

import * as THREE from "three";
import { registerSW } from "virtual:pwa-register";
import * as C from "./core";
import type { Mat3, RGBAImage, Vec3 } from "./core";
import { AR } from "./vendor/aruco.js";
import { readSheetQR, parseActivation, type QRRead } from "./qr";
import rawConfig from "./content/config.json";

// ----------------------------------------------------------------- config types
interface Leg { x: number; y: number; r: number }
interface Piece {
  id: string; kind: "animal" | "letter"; box: number[]; hingeY: number;
  mask?: string; radius?: number; legs?: Leg[]; ch?: string;
}
interface Syllable { text: string; letters: number[]; say: string[] }
interface CountItem { x: number; y: number; r: number }
interface CountQuestion { id: string; prompt: string; noun: string; piece: string; items: CountItem[] }
type Task =
  | { type: "count"; prompt: string; answer: number; questions?: CountQuestion[] }
  | { type: "spell"; syllables: Syllable[]; word: { text: string; say: string } };
interface Sheet {
  title: string; markers: Record<string, [number, number][]>; pieces: Piece[]; task: Task;
  qr?: [number, number, number]; guide?: string[];
}
interface Config { page: [number, number]; sheets: Record<string, Sheet> }

const CFG = rawConfig as unknown as Config;
const DEMO: Record<string, string> = { warna: "/demo/photo-warna.jpg", tebal: "/demo/photo-tebal.jpg" };

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector(s) as T;
const DEG = Math.PI / 180;
const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
const PX_PER_MM = 4;
// ?debug=1 shows scan diagnostics on the stage (corners found, timings, QR) for testing on real phones.
const DEBUG = new URLSearchParams(location.search).has("debug");

// ----------------------------------------------------------------- dom
const el = {
  intro: $("#intro"), play: $("#play"), stage: $("#stage"), stageWrap: $("#stageWrap"),
  bg: $<HTMLImageElement>("#bg"), vid: $<HTMLVideoElement>("#vid"), gl: $<HTMLCanvasElement>("#gl"),
  chip: $("#chip"), busy: $("#busy"), panel: $("#panel"), toast: $("#toast"),
  file: $<HTMLInputElement>("#file"), liveBtn: $<HTMLButtonElement>("#liveBtn"), backBtn: $<HTMLButtonElement>("#backBtn"),
  replayBtn: $<HTMLButtonElement>("#replayBtn"), viewBtn: $<HTMLButtonElement>("#viewBtn"),
  captureBtn: $<HTMLButtonElement>("#captureBtn"), installBtn: $<HTMLButtonElement>("#installBtn"),
  liveNote: $("#liveNote"), iosNote: $("#iosNote"), zoomer: $("#zoomer"),
  playInfo: $("#playInfo"), ortu: $<HTMLDetailsElement>("#ortu"), ortuIsi: $("#ortuIsi"),
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
  badges: Record<string, THREE.Mesh[]>; cur?: number; yaw?: number; calm?: number;
}
/** count: child taps each part · choose: child picks how many · done: answered right */
interface TaskState {
  type: string; playing: boolean; qi: number; counted: number[]; solved: Set<string>;
  phase: "count" | "choose" | "done";
}
type Mode = "idle" | "photo" | "live-scan" | "live";
const S = {
  mode: "idle" as Mode,
  W: 0, H: 0, f: 1000,
  sheetKey: null as string | null, sheet: null as Sheet | null,
  pieces: [] as PieceRT[], t0: 0, view: "ar" as "ar" | "3d", yaw: -18 * DEG, pitch: 52 * DEG,
  task: null as null | TaskState,
  stream: null as MediaStream | null, lastSeen: 0, smooth: null as [number, number][] | null,
  liveH: null as Mat3 | null, liveKey: null as string | null, liveCount: 0, pageTex: null as THREE.Texture | null,
  savedPose: null as { R: Vec3[]; t: Vec3 } | null, photoUrl: null as string | null, pausedLive: false,
  // QR on the sheet (per-buyer serial). Not enforced yet: read and reported only.
  qr: null as QRRead | null, serial: null as string | null,
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
  if (zoomed) requestAnimationFrame(() => zoomToQuestion(false));
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
    Object.values(p.badges).flat().forEach((b) => { const mat = b.material as BasicMat; mat.map?.dispose(); mat.dispose(); b.geometry.dispose(); });
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
      hopAt: 0, hopH: pc.kind === "letter" ? 9 : 14, badges: {},
    };
    // one hidden number badge per countable item, shown when the child taps it
    for (const q of countQuestions(sheet).filter((q) => q.piece === pc.id)) {
      p.badges[q.id] = q.items.map((it) => {
        const b = badge("", Math.max(8, Math.min(13, it.r * 2.2)));
        b.position.set(it.x, it.y - pc.hingeY, -0.6); b.visible = false;
        hinge.add(b); return b;
      });
    }
    S.pieces.push(p); i++;
  }
}

function badge(text: string, size = 13) {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, depthTest: false, side: THREE.BackSide }));
  m.renderOrder = 10; m.userData.canvas = c; drawBadge(m, text); return m;
}
function drawBadge(m: THREE.Mesh, text: string) {
  const c = m.userData.canvas as HTMLCanvasElement, x = c.getContext("2d")!;
  x.clearRect(0, 0, 128, 128);
  // a paper sticker: white rim, ink disc, white number in the children's typeface
  x.fillStyle = "#ffffff"; x.beginPath(); x.arc(64, 64, 60, 0, 7); x.fill();
  x.fillStyle = "#26231f"; x.beginPath(); x.arc(64, 64, 52, 0, 7); x.fill();
  x.fillStyle = "#fff"; x.font = "700 72px Andika, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
  x.fillText(text, 64, 70);
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
    // Hold still while the child is counting on this piece: the head swings ~12 mm at 5 degrees,
    // more than the size of an eye, so taps would miss a moving target.
    const counting = S.task?.type === "count" && countingOn(p);
    const calmWant = counting ? 0.08 : 1;
    p.calm = p.calm == null ? calmWant : p.calm + (calmWant - p.calm) * 0.06;
    const amp = (reduceMotion ? 1.2 : 5) * DEG * p.calm;
    const th = base + settle * amp * Math.sin(t * 2 * Math.PI * 0.62 + p.phase);
    p.hinge.rotation.x = th;
    p.hinge.rotation.z = p.yaw * Math.min(1, k * 1.5) + settle * p.calm * (reduceMotion ? 0.01 : 0.04) * Math.sin(t * 2 * Math.PI * 0.31 + p.phase * 1.7);
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
const NUM = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh"];
const ICON_DENGAR = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9a4 4 0 0 1 0 6"/><path d="M19.5 6.5a7.5 7.5 0 0 1 0 11"/></svg>`;
const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Counting questions of a sheet. Older configs only have the legs question. */
function countQuestions(sheet: Sheet): CountQuestion[] {
  const t = sheet.task;
  if (t.type !== "count") return [];
  if (t.questions?.length) return t.questions;
  const cow = sheet.pieces.find((p) => p.legs);
  return cow ? [{ id: "kaki", prompt: t.prompt, noun: "Kaki sapi", piece: cow.id, items: cow.legs! }] : [];
}

function setupTask() {
  const task = S.sheet!.task;
  S.task = { type: task.type, counted: [], playing: false, qi: 0, solved: new Set(), phase: "count" };
  renderParentGuide();
  if (task.type === "count") openQuestion(0, false); else renderSpell("ready");
}

function currentQuestion() { return countQuestions(S.sheet!)[S.task!.qi]; }
function countingOn(p: PieceRT) {
  const q = S.task && S.sheet ? currentQuestion() : null;
  return !!q && q.piece === p.pc.id && S.task!.phase === "count";
}
function questionPiece(q: CountQuestion) { return S.pieces.find((p) => p.pc.id === q.piece); }

function openQuestion(i: number, speak = true) {
  const qs = countQuestions(S.sheet!);
  S.task!.qi = i; S.task!.counted = []; S.task!.phase = "count";
  S.pieces.forEach((p) => Object.values(p.badges).flat().forEach((b) => (b.visible = false)));
  renderCount();
  // the first question waits for the piece to finish standing up before zooming
  const settle = Math.max(0, S.t0 + 1500 - performance.now());
  setTimeout(() => { if (S.task?.qi === i) zoomToQuestion(true); }, settle);
  if (speak) say(qs[i].prompt);
}

/** Five answer cards around the right answer, so the answer is not always in the same place. */
function answerChoices(n: number) {
  const start = Math.max(1, Math.min(n - 2, 10 - 4));
  return Array.from({ length: 5 }, (_, i) => start + i);
}

function renderCount() {
  const qs = countQuestions(S.sheet!), q = qs[S.task!.qi], n = q.items.length, t = S.task!;
  const c = t.counted.length, last = t.qi === qs.length - 1, allDone = qs.every((x) => t.solved.has(x.id));
  el.playInfo.textContent = `Soal ${t.qi + 1} dari ${qs.length}`;
  const ask = t.phase === "count" ? q.prompt : t.phase === "choose" ? "Jadi, ada berapa?" : "";
  const body = t.phase === "count"
    ? `<div class="ketuk" aria-label="${c} dari ${n} sudah diketuk">${Array.from({ length: n }, (_, i) => `<span class="${i < c ? "on" : ""}">${i < c ? i + 1 : ""}</span>`).join("")}</div>`
    : t.phase === "choose"
      ? `<div class="angka" role="group" aria-label="Pilih jumlahnya">${answerChoices(n).map((k) => `<button class="btn" type="button" data-n="${k}">${k}</button>`).join("")}</div>`
      : `<p class="pujian">Betul! ${esc(q.noun)} ada ${n}.</p>`;
  const dots = qs.map((x, i) => `<button type="button" data-q="${i}" class="${t.solved.has(x.id) ? "selesai" : ""}" ${i === t.qi ? 'aria-current="step"' : ""} aria-label="Soal ${i + 1}${t.solved.has(x.id) ? ", selesai" : ""}">${i + 1}</button>`).join("");
  const next = last
    ? (allDone ? `<button class="btn utama" id="restartQ" type="button">Ulangi dari soal 1</button>` : "")
    : `<button class="btn ${t.phase === "done" ? "utama" : ""}" id="nextQ" type="button">Soal berikutnya</button>`;
  el.panel.innerHTML = `
    ${ask ? `<div class="soal"><p class="soal-teks">${esc(ask)}</p><button class="btn dengar" id="dengar" type="button" aria-label="Dengar soalnya lagi">${ICON_DENGAR}</button></div>` : ""}
    ${body}
    <div class="nav-soal"><div class="titik" role="group" aria-label="Pilih soal">${dots}</div>${next}</div>`;
  document.getElementById("dengar")?.addEventListener("click", () => say(ask));
  document.getElementById("nextQ")?.addEventListener("click", () => openQuestion(S.task!.qi + 1));
  document.getElementById("restartQ")?.addEventListener("click", () => { S.task!.solved.clear(); openQuestion(0); });
  el.panel.querySelectorAll<HTMLElement>("[data-q]").forEach((b) => b.addEventListener("click", () => openQuestion(Number(b.dataset.q))));
  el.panel.querySelectorAll<HTMLButtonElement>("[data-n]").forEach((b) => b.addEventListener("click", () => chooseAnswer(b, Number(b.dataset.n))));
}

function resetCount() { openQuestion(S.task!.qi, false); }

/** Count one item: from a tap on the drawing, or from the parent's "mark one" button. */
function countItem(p: PieceRT, q: CountQuestion, hit: number) {
  const t = S.task!;
  t.counted.push(hit);
  const k = t.counted.length, badges = p.badges[q.id];
  drawBadge(badges[hit], String(k)); badges[hit].visible = true;
  if (k >= q.items.length) {
    // every part is counted: now the child says how many (cardinality), not the app
    t.phase = "choose";
    renderCount();
    say(NUM[k] || String(k)).then(() => say("Jadi, ada berapa?"));
  } else { renderCount(); say(NUM[k] || String(k)); }
}

function onCountTap(p: PieceRT, pageX: number, pageY: number, now: number) {
  const q = currentQuestion(), t = S.task!;
  if (q.piece !== p.pc.id || t.phase !== "count") { hop(p, now); return; }
  let hit = -1, best = 1e9;
  q.items.forEach((it, i) => { const d = Math.hypot(pageX - it.x, pageY - it.y); if (d < it.r * 1.45 && d < best) { best = d; hit = i; } });
  if (hit < 0) { hop(p, now); say("mooo", 0.7); return; }
  if (t.counted.includes(hit)) { toast("Yang itu sudah dihitung. Cari yang lain."); return; }
  countItem(p, q, hit);
}

function chooseAnswer(btn: HTMLButtonElement, k: number) {
  const q = currentQuestion(), n = q.items.length, t = S.task!;
  if (t.phase !== "choose") return;
  if (k !== n) {
    btn.classList.remove("salah"); void btn.offsetWidth; btn.classList.add("salah");
    say(`Hmm, coba hitung lagi ${q.noun.split(" ")[0].toLowerCase()}nya.`);
    return;
  }
  t.phase = "done"; t.solved.add(q.id);
  renderCount();
  const p = questionPiece(q);
  hop(p);
  say(`Betul! ${q.noun} ada ${NUM[n] || n}.`);
}

// ----------------------------------------------------------------- parent drawer
let spellByLetterName = false;
try { spellByLetterName = localStorage.getItem("gh.eja") === "huruf"; } catch { /* storage blocked */ }

function renderParentGuide() {
  const sh = S.sheet!, guide = sh.guide || [];
  el.ortu.hidden = false;
  const isCount = sh.task.type === "count";
  el.ortuIsi.innerHTML = `
    ${guide.length ? `<ol>${guide.map((g) => `<li>${esc(g)}</li>`).join("")}</ol>` : ""}
    ${isCount
      ? `<p>Biarkan anak mengetuk sendiri satu per satu, lalu memilih angkanya. Beri jeda sebelum membantu, dan puji usahanya.</p>
         <button class="btn kecil" id="tandai" type="button">Ketukan tidak kena? Tandai satu bagian</button>`
      : `<label class="pilihan"><input type="checkbox" id="ejaHuruf" ${spellByLetterName ? "checked" : ""}> Sebut nama huruf dulu (es, a, sa)</label>
         <p>Bawaannya suku kata (sa, pi, sapi), seperti cara membaca di kelas 1 SD.</p>`}
    <p>Suara sementara memakai suara bawaan HP. Versi jual memakai rekaman suara asli.</p>`;
  document.getElementById("tandai")?.addEventListener("click", () => {
    const q = currentQuestion(), p = questionPiece(q), t = S.task!;
    if (!p || t.phase !== "count") return;
    const next = q.items.findIndex((_, i) => !t.counted.includes(i));
    if (next >= 0) countItem(p, q, next);
  });
  document.getElementById("ejaHuruf")?.addEventListener("change", (e) => {
    spellByLetterName = (e.target as HTMLInputElement).checked;
    try { localStorage.setItem("gh.eja", spellByLetterName ? "huruf" : "suku"); } catch { /* storage blocked */ }
  });
}

// ----------------------------------------------------------------- reading (syllable method)
function renderWord(task: Extract<Task, { type: "spell" }>, active: number) {
  // active = index of the syllable being read; -1 = none yet; syllables.length = whole word
  return task.syllables.map((s, i) => {
    const cls = active === task.syllables.length || i < active ? "suku-selesai" : i === active ? "suku-on" : active < 0 ? "suku-selesai" : "suku-belum";
    return `<span class="${cls}">${esc(s.text)}</span>`;
  }).join(" ");
}

function renderSpell(phase: "ready" | "play" | "done") {
  const task = S.sheet!.task as Extract<Task, { type: "spell" }>;
  el.playInfo.textContent = "Membaca";
  const ask = phase === "ready" ? "Ayo baca kata ini." : phase === "done" ? "" : "Dengarkan.";
  el.panel.innerHTML = `
    ${ask ? `<div class="soal"><p class="soal-teks">${ask}</p>${phase === "ready" ? `<button class="btn dengar" id="dengar" type="button" aria-label="Dengar petunjuknya">${ICON_DENGAR}</button>` : ""}</div>` : ""}
    <p class="kata" id="kata" aria-label="${esc(task.word.text)}">${renderWord(task, -1)}</p>
    ${phase === "done" ? `<p class="pujian">Betul! Dibaca ${esc(task.word.say)}.</p>` : ""}
    ${phase === "ready" ? `<button class="btn utama besar" id="checkSpell" type="button">Sudah dibaca · Dengar contoh</button>` : ""}
    ${phase === "done" ? `<div class="nav-soal"><button class="btn utama" id="again" type="button">Dengar lagi</button><button class="btn" id="reset" type="button">Baca ulang</button></div>` : ""}`;
  document.getElementById("dengar")?.addEventListener("click", () => say("Ayo baca kata ini bersama Ayah atau Bunda."));
  document.getElementById("checkSpell")?.addEventListener("click", playSpell);
  document.getElementById("again")?.addEventListener("click", playSpell);
  document.getElementById("reset")?.addEventListener("click", () => renderSpell("ready"));
}

async function playSpell() {
  if (!S.task || S.task.playing) return;
  S.task.playing = true;
  const task = S.sheet!.task as Extract<Task, { type: "spell" }>;
  const letters = S.pieces.filter((p) => p.pc.kind === "letter");
  const animal = S.pieces.find((p) => p.pc.kind === "animal");
  renderSpell("play");
  const setWord = (active: number) => { const k = document.getElementById("kata"); if (k) k.innerHTML = renderWord(task, active); };
  for (let si = 0; si < task.syllables.length; si++) {
    const s = task.syllables[si];
    setWord(si);
    if (spellByLetterName) {
      // optional: letter names first ("es", "a"), then the syllable
      for (let j = 0; j < s.letters.length; j++) { hop(letters[s.letters[j]]); await say(s.say[j]); await wait(100); }
    }
    s.letters.forEach((li) => hop(letters[li]));
    await say(s.say[s.say.length - 1]); // the syllable sound: "sa"
    await wait(260);
  }
  setWord(task.syllables.length);
  letters.forEach((L, i) => setTimeout(() => hop(L), i * 90));
  if (animal) setTimeout(() => hop(animal), 380);
  await say(task.word.say);
  if (S.task) S.task.playing = false;
  renderSpell("done");
}

/** Tapping a letter card reads its whole syllable, the way children learn to read at school. */
function syllableOf(letterIndex: number) {
  const t = S.sheet?.task;
  return t && t.type === "spell" ? t.syllables.find((s) => s.letters.includes(letterIndex)) : undefined;
}

// ----------------------------------------------------------------- zoom
// Small parts (eyes, horns) sit ~20 px apart on a phone screen, smaller than a fingertip.
// Zoom the photo + 3D layer together until neighbouring items are at least MIN_GAP apart.
const MIN_GAP = 56, MIN_DIAMETER = 44, MAX_ZOOM = 3;
let zoomed = false;
function setZoom(s: number, tx: number, ty: number, animate: boolean) {
  el.zoomer.style.transition = animate && !reduceMotion ? "" : "none";
  el.zoomer.style.transform = s === 1 ? "" : `translate(${tx}px, ${ty}px) scale(${s})`;
  zoomed = s !== 1;
}
function resetZoom() { setZoom(1, 0, 0, true); }

function zoomToQuestion(animate: boolean) {
  if (!S.task || S.task.type !== "count" || S.view !== "ar" || S.mode !== "photo") { resetZoom(); return; }
  const q = currentQuestion(), p = q && questionPiece(q);
  if (!p) { resetZoom(); return; }
  const w = el.stage.clientWidth, h = el.stage.clientHeight;
  pageRoot.updateMatrixWorld(true);
  const toPx = (x: number, y: number) => {
    const v = new THREE.Vector3(x, y - p.pc.hingeY, 0).applyMatrix4(p.hinge.matrixWorld).project(camera);
    return [(v.x + 1) / 2 * w, (1 - v.y) / 2 * h];
  };
  const pts = q.items.map((it) => { const c = toPx(it.x, it.y), e = toPx(it.x + it.r, it.y); return { x: c[0], y: c[1], r: Math.hypot(e[0] - c[0], e[1] - c[1]) }; });
  let need = 1;
  for (let i = 0; i < pts.length; i++) {
    need = Math.max(need, MIN_DIAMETER / (2 * pts[i].r || 1));
    for (let j = i + 1; j < pts.length; j++) need = Math.max(need, MIN_GAP / (Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y) || 1));
  }
  const pad = 12;
  const x0 = Math.min(...pts.map((t) => t.x - t.r)) - pad, x1 = Math.max(...pts.map((t) => t.x + t.r)) + pad;
  const y0 = Math.min(...pts.map((t) => t.y - t.r)) - pad, y1 = Math.max(...pts.map((t) => t.y + t.r)) + pad;
  const fit = Math.min(w / (x1 - x0), h / (y1 - y0));
  const s = Math.max(1, Math.min(need, fit, MAX_ZOOM));
  if (s < 1.08) { resetZoom(); return; }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const tx = Math.min(0, Math.max(w - s * w, w / 2 - s * cx)), ty = Math.min(0, Math.max(h - s * h, h / 2 - s * cy));
  setZoom(s, tx, ty, animate);
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
    const syl = syllableOf(S.pieces.filter((x) => x.pc.kind === "letter").indexOf(p));
    if (syl) {
      S.pieces.filter((x) => x.pc.kind === "letter").forEach((x, i) => { if (syl.letters.includes(i)) hop(x, now); });
      say(syl.say[syl.say.length - 1]);
    } else hop(p, now);
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
  stopLive(); clearPieces(); resetZoom(); S.mode = "idle"; S.view = "ar"; S.task = null; S.savedPose = null;
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  el.play.hidden = true; el.intro.hidden = false; el.panel.innerHTML = ""; el.bg.removeAttribute("src");
  el.ortuIsi.innerHTML = ""; el.ortu.open = false; el.ortu.hidden = true; el.playInfo.textContent = "";
  el.stage.classList.remove("view3d"); pagePlane.visible = false; el.bg.hidden = false; el.viewBtn.textContent = "Putar 3D";
  document.body.classList.remove("playing");
  window.scrollTo({ top: 0 });
}
window.addEventListener("popstate", () => { if (!el.play.hidden) resetToIntro(); });
function goBack() { if (history.state?.gh === "play") history.back(); else resetToIntro(); }

function photoFailed(title: string, body: string) {
  el.busy.hidden = true;
  el.playInfo.textContent = "";
  el.panel.innerHTML = `<div class="soal"><p class="soal-teks">${title}</p></div><p class="tip">${body}</p>
    <label class="btn utama besar" for="file">Foto ulang</label>`;
}

async function runPhoto(src: string) {
  stopLive();
  showPlay();
  S.mode = "photo"; S.view = "ar"; el.stage.classList.remove("view3d"); el.viewBtn.textContent = "Putar 3D";
  pagePlane.visible = false; pageRoot.visible = true; outline.visible = false;
  el.vid.hidden = true; el.bg.hidden = false; el.captureBtn.hidden = true; el.chip.hidden = true;
  el.viewBtn.hidden = false; el.replayBtn.hidden = false;
  clearPieces(); setZoom(1, 0, 0, false);
  el.panel.innerHTML = ""; el.ortu.hidden = true; el.playInfo.textContent = "Membaca lembar…";
  el.busy.hidden = false; el.busy.textContent = "Membaca lembar…";
  try {
    const im = await loadImage(src);
    const maxSide = 2000, s = Math.min(1, maxSide / Math.max(im.naturalWidth, im.naturalHeight));
    S.W = Math.round(im.naturalWidth * s); S.H = Math.round(im.naturalHeight * s);
    el.bg.src = src; layout();
    await wait(30);
    const full = toImageData(im, S.W, S.H);
    const detW = Math.min(1100, S.W);
    const tDet = performance.now();
    let corr = detect(im, S.W, S.H, detW);
    if (!corr || corr.count < 4) { const c2 = detect(im, S.W, S.H, Math.min(1600, S.W)); if (c2 && (!corr || c2.count > corr.count)) corr = c2; }
    if (!corr || corr.count < 2) {
      photoFailed("Kotak hitam di pojok belum terbaca", "Foto ulang dari atas, dengan cahaya terang, dan pastikan keempat kotak hitam masuk ke foto. Jangan sampai tertutup jari.");
      return;
    }
    if (corr.count < 4) toast(`Baru ${corr.count} dari 4 pojok terbaca. Hasilnya bisa sedikit meleset.`);
    const detMs = performance.now() - tDet;
    S.sheetKey = corr.key; S.sheet = CFG.sheets[corr.key];
    const H = C.homography(corr.src, corr.dst)!;
    scanQR(full, H);
    showDebug(`${corr.count}/4 pojok · ${S.W}×${S.H} · deteksi ${Math.round(detMs)} ms · galat ${C.reprojError(H, corr.src, corr.dst).toFixed(1)} px`);
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

// ----------------------------------------------------------------- QR + diagnostics
function scanQR(full: RGBAImage, H: Mat3) {
  S.qr = S.sheet?.qr ? readSheetQR(full, H, S.sheet.qr) : null;
  S.serial = S.qr ? parseActivation(S.qr.text)?.serial ?? null : null;
}
function showDebug(line: string) {
  if (!DEBUG) return;
  const qr = S.qr ? `QR terbaca (${Math.round(S.qr.ms)} ms)${S.serial ? " · serial " + S.serial : " · bukan link aktivasi"}` : "QR tidak terbaca";
  el.chip.hidden = false; el.chip.classList.remove("ok");
  el.chip.textContent = `${line} · ${qr}`;
  console.info("[scan]", line, "|", qr, S.qr?.text ?? "");
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
  el.ortu.hidden = true; el.playInfo.textContent = "Kamera langsung";
  el.panel.innerHTML = `<p class="tip">Pegang HP di atas lembar sampai keempat kotak hitam terlihat dan garis hijau muncul di tepi kertas. Lalu ketuk <b>Hidupkan!</b></p>`;
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
  scanQR(full, H);
  showDebug(`${corr ? corr.count : 0}/4 pojok · video ${S.W}×${S.H}`);
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
  if (S.task?.type === "count") openQuestion(S.task.qi, false);
});
el.viewBtn.addEventListener("click", () => {
  if (S.view === "ar") {
    S.view = "3d"; el.bg.hidden = true; pagePlane.visible = true; el.stage.classList.add("view3d"); setZoom(1, 0, 0, false);
    el.viewBtn.textContent = "Kembali ke foto"; toast("Geser gambar untuk memutar.", 2500);
  } else {
    S.view = "ar"; el.bg.hidden = false; pagePlane.visible = false; el.stage.classList.remove("view3d");
    el.viewBtn.textContent = "Putar 3D"; setCameraFromIntrinsics();
    if (S.savedPose) setPoseMatrix(S.savedPose.R, S.savedPose.t); // restore photo pose
    requestAnimationFrame(() => zoomToQuestion(false));
  }
});

// ----------------------------------------------------------------- PWA
// the archived paper-scan page has nothing to lose: switch to a new version as soon as it is ready
const updateScan = registerSW({ immediate: true, onNeedRefresh() { updateScan(true); } });

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
