/**
 * Read the per-buyer QR code printed on every sheet.
 * The QR sits at a known place on the page, so instead of searching the whole photo we
 * cut it out with the page homography (straight, sharp, fixed size) and decode that.
 */
import jsQR from "jsqr";
import { rectify, type Mat3, type RGBAImage } from "./core";

/** [x, y, size] of the QR in page mm (see prototype/build_assets.py). */
export type QRBox = [number, number, number];

export interface QRRead { text: string; ms: number; pxPerMm: number }

/** Try a few sampling densities; small or blurry photos decode better at some than others. */
export function readSheetQR(src: RGBAImage, H: Mat3, qr: QRBox, densities = [8, 12, 6]): QRRead | null {
  const [x, y, s] = qr, margin = 3; // mm of white quiet zone around the code
  const t0 = performance.now();
  for (const d of densities) {
    const img = rectify(src, H, [x - margin, y - margin, s + 2 * margin, s + 2 * margin], d, 2);
    const res = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
    if (res?.data) return { text: res.data, ms: performance.now() - t0, pxPerMm: d };
  }
  return null;
}

/**
 * Activation link printed in the QR: https://<domain>/a/<SERIAL>.
 * Serials are upper-case letters/digits with optional dashes (e.g. GH1-7K3Q-9XZD), so the
 * whole URL can be printed in upper case, which lets the QR use the denser alphanumeric mode.
 */
export function parseActivation(text: string): { serial: string } | null {
  const m = /^https?:\/\/[^/\s]+\/A\/([A-Z0-9][A-Z0-9-]{5,31})\/?$/i.exec(text.trim());
  return m ? { serial: m[1].toUpperCase().replace(/-/g, "") } : null;
}
