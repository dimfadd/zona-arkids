# Roket Kertas · catatan proyek

Nama produk: **Roket Kertas**, keterangan "Belajar calistung dari kertas" (dipilih Nov 2026).
Nama sebelumnya: Gambarku Hidup (nama kerja), lalu sempat "Calistung AR for Kids".
Merek, domain, dan akun sosial belum dicek; pemilik perlu cek PDKI kelas 9, 16, 41.

Baca juga `prototype/CLAUDE.md` (riset, desain lembar, cara kerja mesin AR). File ini mencatat
struktur repo dan keputusan yang diambil sesudahnya.

**Pemilik:** Dimfad. Bahasa kerja Bahasa Indonesia. Berperan sebagai penasihat: kelemahan di kalimat
pertama, label keyakinan [Pasti] / [Kemungkinan Besar] / [Menebak], tanpa basa-basi. Keputusan teknis
yang wajar diambil langsung; keputusan bisnis ditanyakan.

## Struktur repo
```
prototype/     prototipe asli (dibekukan) + pipeline konten Python: sheets.py (sumber kebenaran
               layout, soal hitung, posisi QR), build_assets.py, make_photos.py
apps/scan/     aplikasi PWA (Vite + TS) yang di-deploy ke Vercel. Lihat apps/scan/README.md
               Vercel: Root Directory = apps/scan; konfigurasi di apps/scan/vercel.json
```
Konten mengalir: `prototype/sheets.py` → `build_assets.py` → `config.json` → disalin ke
`apps/scan/src/content/config.json`. Saat ini hanya bagian `task` dan `qr` yang di-patch ke config
(mask PNG lama dipertahankan); setelah katalog objek dibuat, salin config hasil build penuh.

## Tes
- `cd apps/scan && npm test`: golden test 4 foto (4/4 marker, galat < 2 px, hasil identik dengan
  prototipe, QR terbaca), validasi konten (setiap titik ketuk ada di atas potongan).
- `npm run build && npm run e2e`: Chromium headless di 5 ukuran layar, menjawab 6 soal hitung, eja,
  3D, PWA. "WARN" = sasaran ketuk < 44 px; perbaikannya di gambar, bukan kode.

## Keputusan (Nov 2026)
- **Produk:** produk digital (PDF) per tingkat. Tingkat 1 = **10 objek × 2 lembar = 20 halaman**
  (lembar mewarnai dengan banyak soal hitung + lembar tebalkan huruf). Tingkat berikutnya tema lain:
  hewan, kendaraan, bagian tubuh, bunga, buah. Mesin AR sama, hanya data konten berbeda.
- **Banyak soal per lembar:** lembar sapi punya 6 soal (kaki, corak, mata, tanduk, kuping, ekor).
  Soal hanya tentang bagian yang tergambar sebagai garis, bukan warna ("corak bulat", bukan
  "corak gelap"). Bagian kecil di-zoom otomatis; potongan berhenti bergoyang saat dihitung.
- **Aturan gambar baru:** bagian yang dihitung berjarak **≥ 20 mm** di kertas (kaki sapi hanya 15 mm
  → 36-40 px di HP kecil walau sudah di-zoom).
- **Aturan kata:** Level 1 hanya KV-KV (MATA, KAKI ya; EKOR, TANDUK, KUPING = Level 2).
- **Pembayaran:** Midtrans (Snap) di toko sendiri.
- **Iklan:** Meta & TikTok. Pixel browser hanya di toko (PageView, ViewContent, InitiateCheckout).
  **Purchase dikirim dari server** saat webhook Midtrans `settlement` lewat Meta Conversions API dan
  TikTok Events API, dengan `event_id` sama untuk dedup. **Tidak ada pixel di aplikasi scan** (dipakai
  anak; kebijakan platform + UU PDP).
- **Anti-bajak:** serial unik per pembelian, PDF per pembeli dengan QR serial di setiap halaman +
  watermark nama/order. Fotokopi tidak bisa dideteksi dari gambarnya; yang dideteksi pemakaian:
  **1 serial = 1 akun Google, maksimal 3 HP**. Di luar itu: layar penutup "belum diaktifkan".
  Konten (config, mask, audio) dikirim server hanya ke yang berhak.
- **Rupa (disetujui):** buku tulis + potongan gunting. Kertas putih, tinta #26231f, garis biru
  #2f5fa8, satu aksen merah margin #c4302b untuk aksi utama, hijau #2b7a4b hanya untuk "benar".
  Mode gelap = papan tulis. Font: **Andika** untuk semua huruf yang dibaca anak (a/g satu kait,
  I/l/1 beda), **Plus Jakarta Sans** untuk teks orang tua. Fredoka/Nunito dilarang (I = l).
  Motif: garis bantu menulis di judul. Tanpa konfeti, tanpa label pil, tanpa poin/streak.
  Arah lengkap: https://claude.ai/artifact/RmyYyu48PjUPSsmpn5Np92
- **Membaca (disetujui):** metode suku kata, audio "sa · pi · sapi". Eja nama huruf ("es, a, sa")
  hanya pilihan di laci "Untuk Ayah/Bunda".
- **Hitung:** anak mengetuk tiap bagian, lalu MEMILIH jumlahnya dari kartu angka (kardinalitas).
- **Logo:** roket kertas berdiri dari buku tulis (dibuat pemilik dengan generator AI dari
  `docs/brand/logo-prompt.md`). File asli raster 1254 px: `docs/brand/logo-roket-kertas-asli.webp`.
  Turunan di `apps/scan/public/brand` dan `public/icons` (dipotong rapat; maskable 70%).
  **Masih perlu versi vektor (SVG)** sebelum dicetak atau didaftarkan.
- **Ilustrasi:** dibuat Claude sebagai SVG garis (bagian terstruktur → mask dan titik ketuk otomatis).
- **Marketplace:** [Kemungkinan Besar] TikTok Shop tidak menerima produk digital; afiliasi butuh SKU fisik.
- **Backend:** Vercel (serverless functions) + **Postgres Neon**.
- **Format QR produksi:** `HTTPS://<DOMAIN>/A/<SERIAL>` huruf besar semua (mode alfanumerik, modul
  lebih besar). Parser: `parseActivation()` di `apps/scan/src/qr.ts`.

## Status
- [x] PWA siap Vercel, responsif, 6 soal hitung, auto-zoom.
- [x] QR dibaca dari foto yang sama (dipotong lewat homografi). Foto simulasi: terbaca sampai
      foto selebar 540 px. Foto demo di `public/demo` tidak punya QR (dibuat sebelum QR ditambahkan).
- [x] `?debug=1`: diagnosa di layar (pojok terbaca, waktu, galat, status QR) untuk uji di HP asli.
- [ ] Uji nyata: kertas cetak + HP asli (paling penting, belum dilakukan).
- [ ] Backend: login Google, tabel serial/aktivasi/perangkat, gating config, webhook Midtrans,
      CAPI/Events API, generator PDF per pesanan.
- [ ] Katalog 10 objek Tingkat 1 (gambar garis + mask + soal + kata), rekaman suara asli.
