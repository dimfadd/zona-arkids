import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";
import { execSync } from "node:child_process";

// Shown in the parents' room, so anyone can tell which version a phone is running.
const sha = (process.env.VERCEL_GIT_COMMIT_SHA || (() => { try { return execSync("git rev-parse HEAD").toString().trim(); } catch { return "lokal"; } })()).slice(0, 7);
const BUILD = `${sha} · ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`;

export default defineConfig({
  define: { __BUILD__: JSON.stringify(BUILD) },
  build: {
    target: "es2020", chunkSizeWarningLimit: 900,
    // index.html = the game (main product); scan.html = the earlier paper-scan prototype, kept for reference
    rollupOptions: { input: { main: "index.html", scan: "scan.html" } },
  },
  plugins: [
    VitePWA({
      // A new version waits until the child is back on the map, then the app reloads itself there
      // (see src/play/app.ts). Nobody has to clear a cache, and nobody loses a half-played episode.
      registerType: "prompt",
      injectRegister: false, // registered in src/main.ts
      includeAssets: ["icons/favicon-64.png", "icons/apple-touch-icon.png", "brand/*.png", "demo/*.jpg"],
      manifest: {
        id: "/",
        name: "Roket Kertas",
        short_name: "Roket Kertas",
        description: "Belajar calistung sambil bermain: anak mewarnai sapi, sapinya jadi 3D, lalu berhitung dan membaca dalam perjalanan ke rumah Budi.",
        lang: "id",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "any",
        background_color: "#ffffff",
        theme_color: "#ffffff",
        categories: ["education", "kids"],
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{js,css,html,svg,png,jpg,woff2,webmanifest}"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: "/index.html",
        // scan.html is its own page: never answer it with the game's index.html
        navigateFallbackDenylist: [/^\/scan(\.html)?$/],
        // ?debug=1 must still find the cached page
        ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^debug$/],
      },
    }),
  ],
  test: { include: ["test/**/*.test.ts"] },
});
