import { describe, expect, it } from "vitest";
import { LETTERS, TOLERANCE, judgeStroke, resample, type LetterKey, type Pt } from "../src/play/tracing-data";

// deterministic noise so the tests never flake
let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const jitter = (g: Pt[], amp: number) => resample(g, 3).map((p) => ({ x: p.x + (rnd() * 2 - 1) * amp, y: p.y + (rnd() * 2 - 1) * amp }));

describe("tracing judge", () => {
  for (const key of Object.keys(LETTERS) as LetterKey[]) {
    LETTERS[key].forEach((guide, i) => {
      const name = `${key} goresan ${i + 1}`;
      it(`${name}: goresan benar (dengan gemetar tangan) lulus`, () => {
        expect(judgeStroke(jitter(guide, TOLERANCE * 0.45), guide).ok).toBe(true);
      });
      it(`${name}: goresan terbalik gagal`, () => {
        const v = judgeStroke(jitter([...guide].reverse(), 2), guide);
        expect(v.ok).toBe(false);
        expect(v.miss).toBe("arah");
      });
      it(`${name}: mulai dari tengah gagal`, () => {
        const half = resample(guide, 3); const v = judgeStroke(half.slice(Math.floor(half.length / 2)), guide);
        expect(v.ok).toBe(false);
      });
      it(`${name}: berhenti di tengah gagal`, () => {
        const half = resample(guide, 3); expect(judgeStroke(half.slice(0, Math.floor(half.length / 2)), guide).ok).toBe(false);
      });
      it(`${name}: coretan acak gagal`, () => {
        const scribble = [guide[0], ...Array.from({ length: 40 }, () => ({ x: rnd() * 100, y: rnd() * 100 }))];
        expect(judgeStroke(scribble, guide).ok).toBe(false);
      });
    });
  }
  it("goresan yang menyimpang jauh dari jalur gagal", () => {
    const g = LETTERS.I[0];
    const detour = resample(g, 3).map((p) => (p.y > 40 && p.y < 60 ? { x: p.x + 30, y: p.y } : p));
    expect(judgeStroke(detour, g)).toMatchObject({ ok: false, miss: "keluar" });
  });
  it("toleransi dilipat dua setelah dibantu", () => {
    const g = LETTERS.I[0], loose = resample(g, 3).map((p) => ({ x: p.x + 18, y: p.y }));
    expect(judgeStroke(loose, g).ok).toBe(false);
    expect(judgeStroke(loose, g, TOLERANCE * 2).ok).toBe(true);
  });
});
