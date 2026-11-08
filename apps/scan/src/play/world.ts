/**
 * The little world of the first adventure: a dirt road through a meadow, a mango tree and Budi's house.
 * Same drawn style as the cow (toon shading + ink outline). The road runs along +x.
 */
import * as THREE from "three";
import { inked, toonMat } from "./cow3d";

export const STOPS = { start: 0, pohon: 8, sungai: 12.6, rumah: 17.2 };
/** Stepping stones across the river, in order 1..5. */
export const STONES_X = [0, 1, 2, 3, 4].map((i) => STOPS.sungai - 1.3 + i * 0.65);
export type Item = "sapu" | "bola" | "topi";

/** A canvas texture with words in the children's typeface (Andika). */
export function wordTexture(parts: { text: string; color: string }[], w = 512, h = 192, bg = "#fbf6e9") {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const x = c.getContext("2d")!;
  x.fillStyle = bg; x.fillRect(0, 0, w, h);
  x.font = `700 ${Math.round(h * 0.62)}px Andika, sans-serif`; x.textBaseline = "middle";
  const total = parts.reduce((s, p) => s + x.measureText(p.text).width, 0);
  let cx = (w - total) / 2;
  for (const p of parts) { x.fillStyle = p.color; x.fillText(p.text, cx, h * 0.56); cx += x.measureText(p.text).width; }
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
  return t;
}

export class World {
  readonly group = new THREE.Group();
  readonly mangoes: THREE.Mesh[] = [];
  readonly items: Record<Item, THREE.Group> = {} as Record<Item, THREE.Group>;
  readonly door = new THREE.Group();
  readonly ibu = new THREE.Group();
  private mangoSpots: THREE.Vector3[] = [];
  private tree = new THREE.Group();
  private doorTarget = 0;

  constructor() {
    const g = this.group;
    // meadow and road
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 40), toonMat("#a7d48a"));
    ground.rotation.x = -Math.PI / 2; ground.position.set(10, 0, 0); g.add(ground);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(60, 2.2), toonMat("#e6cf9f"));
    road.rotation.x = -Math.PI / 2; road.position.set(10, 0.01, 0.4); g.add(road);
    // a small river across the road, with five stepping stones (HITUNG-URUT)
    const river = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 40), toonMat("#7cc4ef"));
    river.rotation.x = -Math.PI / 2; river.position.set(STOPS.sungai, 0.02, 0); g.add(river);
    for (const side of [-1, 1]) {
      const bank = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 40), toonMat("#26231f"));
      bank.rotation.x = -Math.PI / 2; bank.position.set(STOPS.sungai + side * 1.7, 0.025, 0); g.add(bank);
    }
    const rock = toonMat("#b9b2a3");
    STONES_X.forEach((x, i) => {
      const st = inked(new THREE.CylinderGeometry(0.27, 0.3, 0.14, 18), rock, 0.03);
      st.position.set(x, 0.07, 0.4 + (i % 2 ? 0.12 : -0.12)); g.add(st);
    });
    // a few flowers along the road, for depth while walking
    const petal = toonMat("#f39bb6"), heart = toonMat("#f7c925");
    for (let i = 0; i < 14; i++) {
      const f = new THREE.Group();
      const x = -6 + i * 2.1 + (i % 3) * 0.4, z = i % 2 ? 2.2 : -1.6 - (i % 3) * 0.5;
      if (Math.abs(x - STOPS.sungai) < 2) continue; // no flowers in the river
      f.position.set(x, 0, z);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 6), toonMat("#3e8a4a")); stem.position.y = 0.17;
      const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), i % 2 ? petal : toonMat("#ffffff")); bloom.position.y = 0.38;
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), heart); dot.position.set(0, 0.38, 0.08);
      f.add(stem, bloom, dot); g.add(f);
    }

    // mango tree
    this.tree.position.set(STOPS.pohon + 1.6, 0, -2.2); g.add(this.tree);
    const trunk = inked(new THREE.CylinderGeometry(0.22, 0.32, 2.2, 14), toonMat("#8b5a2b"), 0.04);
    trunk.position.y = 1.1; this.tree.add(trunk);
    const leaf = toonMat("#4f9a4a");
    const crown = [[0, 3.0, 0, 1.45], [-1.0, 2.6, 0.2, 1.0], [1.05, 2.6, 0.1, 1.05], [0, 3.9, -0.1, 0.95]] as const;
    for (const [x, y, z, r] of crown) {
      const ball = inked(new THREE.SphereGeometry(r, 24, 18), leaf, 0.05);
      ball.position.set(x, y, z); this.tree.add(ball);
    }
    // possible mango places, far enough apart for a finger, hanging just in front of the leaves
    this.mangoSpots = [[-0.9, 2.55], [0.15, 2.35], [1.0, 2.7], [-0.4, 3.35], [0.65, 3.55]].map(([x, y]) => {
      let front = 0;
      for (const [bx, by, bz, r] of crown) { const d = r * r - (x - bx) ** 2 - (y - by) ** 2; if (d > 0) front = Math.max(front, bz + Math.sqrt(d)); }
      return new THREE.Vector3(x, y, front + 0.12);
    });

    // Budi's house
    const house = new THREE.Group(); house.position.set(STOPS.rumah + 1.2, 0, -3.0); g.add(house);
    const walls = inked(new THREE.BoxGeometry(3.4, 2.3, 2.4), toonMat("#f4ead2"), 0.05);
    walls.position.y = 1.15; house.add(walls);
    const roof = inked(new THREE.ConeGeometry(2.75, 1.5, 4), toonMat("#c4302b"), 0.06);
    roof.position.y = 3.05; roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.82); house.add(roof);
    // door hinged on its left edge, opens after the child builds RU + MAH
    this.door.position.set(-0.45, 0.72, 1.21); house.add(this.door);
    const leafDoor = inked(new THREE.BoxGeometry(0.9, 1.44, 0.06), toonMat("#8b5a2b"), 0.03);
    leafDoor.position.x = 0.45; this.door.add(leafDoor);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), toonMat("#f7c925")); knob.position.set(0.78, 0, 0.05); this.door.add(knob);
    const dark = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.44), new THREE.MeshBasicMaterial({ color: 0x3a2e24 }));
    dark.position.set(0, 0.72, 1.205); house.add(dark);
    const win = inked(new THREE.BoxGeometry(0.8, 0.6, 0.05), toonMat("#bfe3f6"), 0.03);
    win.position.set(1.05, 1.45, 1.21); house.add(win);
    // the sign the child reads: RU in ink, MAH in blue, so the syllables are visible
    const sign = inked(new THREE.BoxGeometry(1.7, 0.62, 0.06), new THREE.MeshBasicMaterial({
      map: wordTexture([{ text: "RU", color: "#26231f" }, { text: "MAH", color: "#2f5fa8" }]) }), 0.03);
    sign.position.set(0, 2.02, 1.24); house.add(sign);
    house.userData.sign = sign;

    // Ibu, waiting by the door
    this.ibu.position.set(STOPS.rumah - 0.3, 0, -1.3); g.add(this.ibu);
    const dress = inked(new THREE.ConeGeometry(0.42, 1.15, 20), toonMat("#2f7fd6"), 0.04);
    dress.position.y = 0.58; this.ibu.add(dress);
    const headI = inked(new THREE.SphereGeometry(0.26, 20, 16), toonMat("#d9a27c"), 0.03);
    headI.position.y = 1.36; this.ibu.add(headI);
    const hair = inked(new THREE.SphereGeometry(0.28, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), toonMat("#2b2b2b"), 0.02);
    hair.position.y = 1.4; this.ibu.add(hair);
    for (const s of [1, -1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0x26231f }));
      eye.position.set(0.09 * s, 1.38, 0.24); this.ibu.add(eye);
    }
    this.ibu.visible = false;

    // the three things on the porch: only one of them is SA-PU
    this.items.sapu = this.makeSapu(); this.items.bola = this.makeBola(); this.items.topi = this.makeTopi();
    const order: Item[] = ["bola", "sapu", "topi"];
    order.forEach((k, i) => {
      const it = this.items[k]; it.position.set(STOPS.rumah + 1.5 + i * 1.25, 0, -0.9);
      it.userData.home = it.position.clone(); it.visible = false; g.add(it);
    });
  }

  private tag(group: THREE.Group, item: Item) {
    // an invisible, finger-sized tap area around the thing (a thin broom handle is too hard to hit)
    const proxy = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    proxy.position.y = 0.45; group.add(proxy);
    group.userData.anchor = new THREE.Vector3(0, 0.45, 0);
    group.userData.item = item;
    group.traverse((o) => { o.userData.item = item; });
    return group;
  }
  private makeSapu() {
    const s = new THREE.Group();
    const stick = inked(new THREE.CylinderGeometry(0.04, 0.04, 1.3, 10), toonMat("#c99a5b"), 0.02);
    stick.position.y = 0.95; s.add(stick);
    const bristle = inked(new THREE.ConeGeometry(0.26, 0.5, 16), toonMat("#e2c46a"), 0.03);
    bristle.position.y = 0.25; bristle.rotation.x = Math.PI; s.add(bristle);
    s.rotation.z = -0.15;
    return this.tag(s, "sapu");
  }
  private makeBola() {
    const b = new THREE.Group();
    const ball = inked(new THREE.SphereGeometry(0.32, 24, 18), toonMat("#e0392b"), 0.03);
    ball.position.y = 0.32; b.add(ball);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.322, 0.05, 8, 32), toonMat("#ffffff"));
    band.position.y = 0.32; band.rotation.x = Math.PI / 2; b.add(band);
    return this.tag(b, "bola");
  }
  private makeTopi() {
    const t = new THREE.Group();
    const brim = inked(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 28), toonMat("#f7c925"), 0.03);
    brim.position.y = 0.03; t.add(brim);
    const crown = inked(new THREE.CylinderGeometry(0.22, 0.26, 0.32, 24), toonMat("#f7c925"), 0.03);
    crown.position.y = 0.21; t.add(crown);
    const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(0.265, 0.265, 0.07, 24), toonMat("#e0392b"));
    ribbon.position.y = 0.1; t.add(ribbon);
    return this.tag(t, "topi");
  }

  /** Hang n mangoes (1..5) on the tree. Returns the mango meshes, which the child taps one by one. */
  setMangoes(n: number) {
    this.mangoes.forEach((m) => this.tree.remove(m));
    this.mangoes.length = 0;
    const mat = toonMat("#f2a03a");
    for (let i = 0; i < n; i++) {
      const m = inked(new THREE.SphereGeometry(0.2, 18, 14), mat, 0.03);
      m.scale.set(0.85, 1.15, 0.85); m.position.copy(this.mangoSpots[i]);
      m.userData.mango = i;
      m.traverse((o) => { o.userData.mango = i; });
      this.tree.add(m); this.mangoes.push(m);
    }
    return this.mangoes;
  }

  openDoor() { this.doorTarget = -1.7; this.ibu.visible = true; }
  showItems(on: boolean) { (Object.values(this.items)).forEach((it) => (it.visible = on)); }
  reset() {
    this.doorTarget = 0; this.door.rotation.y = 0; this.ibu.visible = false; this.showItems(false);
    (Object.values(this.items)).forEach((it) => it.position.copy(it.userData.home as THREE.Vector3));
  }

  update(now: number) {
    this.door.rotation.y += (this.doorTarget - this.door.rotation.y) * 0.08;
    const t = now / 1000;
    this.mangoes.forEach((m, i) => { if (!m.userData.picked) m.rotation.z = Math.sin(t * 1.5 + i) * 0.08; });
  }
}
