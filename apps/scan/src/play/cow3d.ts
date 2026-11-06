/**
 * The child's cow in 3D, built from simple shapes so every part can be a separate, tappable object.
 * Looks drawn rather than rendered: flat toon shading plus a dark ink outline (inverted hull).
 * Facing +x (head to the right, like the drawing), standing on y = 0.
 */
import * as THREE from "three";
import { UNPAINTED, type RegionKey } from "./cow-art";

export type Countable = "kaki" | "tanduk" | "mata" | "kuping";

const INK = 0x26231f;

/** Two-step toon ramp: lit and shadow, nothing in between. */
const toonRamp = (() => {
  const t = new THREE.DataTexture(new Uint8Array([150, 150, 150, 255, 255, 255]), 2, 1, THREE.RGBFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return t;
})();

export function toonMat(hex: string | number) {
  return new THREE.MeshToonMaterial({ color: new THREE.Color(hex), gradientMap: toonRamp });
}

/** Mesh with an ink outline: a slightly larger back-facing copy drawn in ink. */
export function inked(geo: THREE.BufferGeometry, mat: THREE.Material, outline = 0.035) {
  const m = new THREE.Mesh(geo, mat);
  const o = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide }));
  o.userData.outline = true;
  // grow the hull along the normals in a vertex-shader-free way: scale relative to the mesh size
  geo.computeBoundingSphere();
  const r = geo.boundingSphere!.radius || 1;
  o.scale.setScalar(1 + outline / r);
  m.add(o);
  return m;
}

export class Cow3D {
  readonly group = new THREE.Group();
  readonly regions: Record<RegionKey, THREE.Mesh[]> = {
    badan: [], kepala: [], moncong: [], kuping: [], tanduk: [], kaki: [], kuku: [], ekor: [], ambing: [], corak: [],
  };
  readonly countables: Record<Countable, THREE.Mesh[]> = { kaki: [], tanduk: [], mata: [], kuping: [] };
  private legPivots: THREE.Group[] = [];
  private head = new THREE.Group();
  private tail = new THREE.Group();
  private bodyGroup = new THREE.Group();
  private hopAt = 0;
  walking = false;
  /** 0..1, how still the cow stands (1 = no idle sway). Raised while the child counts. */
  calm = 0;

  constructor() {
    const g = this.bodyGroup;
    this.group.add(g);

    // body
    const body = this.part("badan", new THREE.SphereGeometry(1, 36, 24), 0.03);
    body.scale.set(1.15, 0.62, 0.58); body.position.set(0, 1.15, 0); g.add(body);

    // spots: three on each side, lying on the body surface
    const spotAt = (x: number, y: number, side: 1 | -1) => {
      const a = 1.15, b = 0.62, c = 0.58;
      const z = side * c * Math.sqrt(Math.max(0, 1 - (x / a) ** 2 - (y / b) ** 2));
      const s = this.part("corak", new THREE.SphereGeometry(1, 20, 14), 0.02);
      s.scale.set(0.24, 0.17, 0.05);
      s.position.set(x, 1.15 + y, z * 0.985);
      const n = new THREE.Vector3(x / a ** 2, y / b ** 2, z / c ** 2).normalize();
      s.lookAt(s.position.clone().add(n));
      g.add(s);
    };
    for (const side of [1, -1] as const) { spotAt(-0.55, 0.12, side); spotAt(0.2, 0.3, side); spotAt(0.3, -0.22, side); }

    // udder
    const udder = this.part("ambing", new THREE.SphereGeometry(0.2, 20, 14), 0.02);
    udder.scale.set(1, 0.7, 1); udder.position.set(0.05, 0.56, 0); g.add(udder);

    // legs: pivot at the hip so they can swing while walking
    // far legs (z < 0) sit a little further back than near legs, like the drawing,
    // so all four stay visible and tappable from the side
    const legSpots: [number, number][] = [[0.74, 0.3], [0.5, -0.3], [-0.6, 0.3], [-0.84, -0.3]];
    legSpots.forEach(([x, z]) => {
      const pivot = new THREE.Group(); pivot.position.set(x, 1.0, z);
      const leg = this.part("kaki", new THREE.CylinderGeometry(0.13, 0.12, 0.85, 18), 0.025);
      leg.position.y = -0.42;
      const hoof = this.part("kuku", new THREE.CylinderGeometry(0.135, 0.15, 0.16, 18), 0.02);
      hoof.position.y = -0.92;
      // the lower leg is what the child sees below the belly: badges and tap checks aim there
      leg.userData.anchor = new THREE.Vector3(0, -0.22, 0);
      pivot.add(leg, hoof); g.add(pivot);
      this.legPivots.push(pivot);
      this.countables.kaki.push(leg);
    });

    // tail
    this.tail.position.set(-1.08, 1.38, 0);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(-0.22, -0.2, 0), new THREE.Vector3(-0.28, -0.55, 0), new THREE.Vector3(-0.24, -0.8, 0)]);
    const tailMesh = this.part("ekor", new THREE.TubeGeometry(curve, 24, 0.045, 10, false), 0.02);
    const tuft = this.part("ekor", new THREE.SphereGeometry(0.12, 16, 12), 0.02);
    tuft.scale.set(0.8, 1.2, 0.8); tuft.position.set(-0.24, -0.88, 0);
    this.tail.add(tailMesh, tuft); g.add(this.tail);

    // head
    this.head.position.set(1.25, 1.55, 0); g.add(this.head);
    const skull = this.part("kepala", new THREE.SphereGeometry(1, 30, 22), 0.03);
    skull.scale.set(0.46, 0.45, 0.42); this.head.add(skull);
    const snout = this.part("moncong", new THREE.SphereGeometry(1, 26, 18), 0.025);
    snout.scale.set(0.3, 0.24, 0.33); snout.position.set(0.36, -0.2, 0); this.head.add(snout);
    const patch = this.part("corak", new THREE.SphereGeometry(1, 18, 12), 0.015);
    patch.scale.set(0.07, 0.15, 0.17); patch.position.set(0.41, 0.17, 0); this.head.add(patch);
    for (const side of [1, -1]) {
      const ear = this.part("kuping", new THREE.SphereGeometry(1, 20, 14), 0.02);
      ear.scale.set(0.11, 0.07, 0.25); ear.position.set(0.0, 0.2, side * 0.5); ear.rotation.x = side * -0.35;
      this.head.add(ear); this.countables.kuping.push(ear);
      const horn = this.part("tanduk", new THREE.ConeGeometry(0.075, 0.32, 16), 0.02);
      horn.position.set(0.04, 0.48, side * 0.2); horn.rotation.x = side * 0.38;
      this.head.add(horn); this.countables.tanduk.push(horn);
      const eye = inked(new THREE.SphereGeometry(0.075, 16, 12), new THREE.MeshBasicMaterial({ color: INK }), 0.0);
      eye.position.set(0.33, 0.1, side * 0.2); this.head.add(eye); this.countables.mata.push(eye);
      const shine = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      shine.position.set(0.39, 0.13, side * 0.22); this.head.add(shine);
      const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshBasicMaterial({ color: INK }));
      nostril.scale.set(0.6, 1, 1.3); nostril.position.set(0.65, -0.17, side * 0.09); this.head.add(nostril);
    }
    this.setColors({});
  }

  private part(region: RegionKey, geo: THREE.BufferGeometry, outline: number) {
    const m = inked(geo, toonMat(UNPAINTED[region]), outline);
    m.userData.region = region;
    this.regions[region].push(m);
    return m;
  }

  /** Dress the cow in the child's colours; blank regions keep their natural colour. */
  setColors(colors: Partial<Record<RegionKey, string | null>>) {
    (Object.keys(this.regions) as RegionKey[]).forEach((k) => {
      const hex = colors[k] ?? UNPAINTED[k];
      this.regions[k].forEach((m) => (m.material as THREE.MeshToonMaterial).color.set(hex));
    });
  }

  hop() { this.hopAt = performance.now(); }

  update(now: number) {
    const t = now / 1000;
    const sway = 1 - this.calm;
    if (this.walking) {
      const w = t * 7;
      // diagonal pairs step together: front-near with back-far
      this.legPivots.forEach((p, i) => { p.rotation.z = Math.sin(w + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.45; });
      this.bodyGroup.position.y = Math.abs(Math.sin(w)) * 0.05;
      this.head.rotation.z = Math.sin(w * 2) * 0.04;
    } else {
      this.legPivots.forEach((p) => (p.rotation.z *= 0.85));
      this.bodyGroup.position.y = Math.sin(t * 2) * 0.01 * sway;
      this.head.rotation.z = Math.sin(t * 1.3) * 0.05 * sway;
      this.head.rotation.y = Math.sin(t * 0.7) * 0.12 * sway;
    }
    this.tail.rotation.x = Math.sin(t * 3) * 0.35 * (this.walking ? 1 : sway * 0.8 + 0.2);
    if (this.hopAt) {
      const k = (now - this.hopAt) / 550;
      if (k >= 1) { this.hopAt = 0; this.group.position.y = 0; }
      else this.group.position.y = Math.sin(k * Math.PI) * 0.45;
    }
  }
}

/** The point of a part the child looks at: its anchor if it has one, otherwise the middle of its bounds. */
export function anchorOf(obj: THREE.Object3D, out = new THREE.Vector3()) {
  const a = obj.userData.anchor as THREE.Vector3 | undefined;
  if (a) return obj.localToWorld(out.copy(a));
  return new THREE.Box3().setFromObject(obj).getCenter(out);
}
