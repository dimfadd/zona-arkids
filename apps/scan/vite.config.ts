import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  build: { target: "es2020", chunkSizeWarningLimit: 900 },
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false, // registered in src/main.ts
      includeAssets: ["favicon.svg", "icons/apple-touch-icon.png", "demo/*.jpg"],
      manifest: {
        id: "/",
        name: "Gambarku Hidup",
        short_name: "Gambarku",
        description: "Gambar anak berdiri dan bergoyang di atas kertasnya, lalu mengajak berhitung dan mengeja.",
        lang: "id",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "any",
        background_color: "#eef3f0",
        theme_color: "#eef3f0",
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
