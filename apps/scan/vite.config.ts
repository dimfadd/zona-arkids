import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  build: { target: "es2020", chunkSizeWarningLimit: 900 },
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false, // registered in src/main.ts
      includeAssets: ["icons/favicon-64.png", "icons/apple-touch-icon.png", "brand/*.png", "demo/*.jpg"],
      manifest: {
        id: "/",
        name: "Roket Kertas",
        short_name: "Roket Kertas",
        description: "Belajar calistung dari kertas. Anak mewarnai dan menebalkan huruf, lalu gambarnya berdiri di layar dan mengajak berhitung serta membaca.",
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
        globPatterns: ["**/*.{js,css,html,svg,png,jpg,woff2,webmanifest}"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: "/index.html",
      },
    }),
  ],
  test: { include: ["test/**/*.test.ts"] },
});
