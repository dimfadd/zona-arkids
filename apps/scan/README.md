# Roket Kertas · scan app (PWA)

Vite + TypeScript port of `prototype/`. Photo mode, live camera, paper-cutout AR, count and spell tasks.
three.js, js-aruco (patched) and fonts are bundled, so the app works offline once installed.

## Run locally
```bash
cd apps/scan
npm install
npm run dev        # http://localhost:5173 (camera works on localhost)
npm test           # golden tests: 4 photos, 4/4 markers, port == prototype
npm run build && npm run e2e   # headless Chromium at 5 screen sizes
```

## Deploy to Vercel
In the Vercel project: **Settings → Build and Deployment → Root Directory = `apps/scan`**,
Framework Preset **Vite**, no command overrides. `apps/scan/vercel.json` sets install/build/output
and headers. No env vars needed yet.

After the first deploy, rebuild the printable PDF so its QR points at the new address:
```bash
cd prototype && APP_URL="https://<your-app>.vercel.app" python3 build_assets.py
```

## Layout
- `src/core.ts` geometry (homography, pose, rectify, white balance). Do not change the math without the golden test.
- `src/main.ts` app: three.js scene, standees, tasks, live camera, PWA.
- `src/vendor/aruco.js` js-aruco 0.1.0 with the min-perimeter patch.
- `src/content/config.json` sheet config copied from `prototype/build/config.json`.
