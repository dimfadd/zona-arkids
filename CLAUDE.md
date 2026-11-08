# Roket Kertas · catatan proyek

Nama produk: **Roket Kertas** (dipilih Nov 2026), keterangan "Belajar calistung sambil bermain".
Nama sebelumnya: Gambarku Hidup (nama kerja), lalu sempat "Calistung AR for Kids".
Merek, domain, dan akun sosial belum dicek; pemilik perlu cek PDKI kelas 9, 16, 41.

**Pemilik:** Dimfad. Bahasa kerja Bahasa Indonesia. Berperan sebagai penasihat: kelemahan di kalimat
pertama, label keyakinan [Pasti] / [Kemungkinan Besar] / [Menebak], tanpa basa-basi. Keputusan teknis
yang wajar diambil langsung; keputusan bisnis ditanyakan.

**Wajib dibaca setiap sesi:** `docs/SOP.md` (aturan kerja: tes sebelum push, isi belajar, rupa/antislop,
aset 3D dengan referensi foto, privasi anak, agen) dan entri terbaru `docs/LOG.md` (riwayat keputusan).
Setiap sesi diakhiri dengan entri baru di `docs/LOG.md` dan Status di bawah diperbarui.
Agen proyek: `.claude/agents/storyboard-episode.md`, `.claude/agents/asset-3d-designer.md`.

## Arah produk (sejak Nov 2026)
**Produk digital murni, tanpa kertas.** Anak mewarnai gambar garis di layar, gambarnya menjadi
objek 3D (warna anak terbawa ke bagian yang sama), lalu ikut petualangan pendek 3-5 menit yang
berisi soal berhitung dan membaca. Pemilik memutuskan tidak memakai AR kertas (biaya HPP kertas,
cetak, kirim). Iklan utama: Meta.

E01 yang jalan sekarang (`apps/scan/index.html`, rilis bertahap dari storyboard): 11 aktivitas dalam
5 babak pendek (Sapi, Pohon, Sungai, Rumah, Ibu), sekitar 10-12 menit. Awal setiap babak = titik simpan.
1. Sapi putih dari buku: hitung kaki (KETUK) → ketuk kartu SA·PI di kalung → **warnai** sapi → tanduk
   **lihat sekilas** (panggung ditutup, pilih 1-4; salah 2 kali → menghitung dengan ketukan).
2. Pohon: hitung mangga (acak 3-5) → **tebalkan S** di keranjang.
3. Sungai: **batu titian 1-5** (2 pilihan per langkah, sapi melompat).
4. Rumah: susun RU + MAH (pengecoh BU) → papan **S _ PI: tulis A** (3 goresan).
5. Ibu: baca SA·PU, pilih sapu → baca papan SA·PI bersama (jeda 2 detik). Stiker + laporan.
Belum dibangun dari storyboard E01: TULIS-JALUR, HITUNG-AMBIL (seret mangga), momen ringan
GOSOK/SERET, WARNA-BENDA-KECIL (atap kandang), papan nama SAPI di 3D.

Navigasi (sejak desain ulang): beranda = **Peta Petualangan** (pulau per episode dari `src/play/episodes.ts`),
kartu episode dari bawah, **Buku Stiker**, **Ruang Ayah/Bunda** di balik gerbang orang tua (laporan,
pengaturan mode mewarnai, hapus data), tombol suara on/off. Login dan landing page belum, sengaja ditunda.

Mewarnai punya dua mode (`coloring.ts`): **Jari** (bawaan untuk sentuhan): krayon virtual dengan ujung
64 px di atas jari; satu goresan hanya mewarnai satu bagian. Bagian itu = bagian tempat krayon paling
banyak mewarnai, bukan tempat jari mendarat: krayon yang melintasi bagian luar menuju bagian dalam
(kasus donat) hanya mewarnai bagian dalam, coretan di bagian luar ditarik kembali. Setelah ±110 unit
gambar mewarnai satu bagian, pilihan terkunci (keluar garis sedikit tidak memindahkan warna).
**Pen**: langsung di bawah pen/mouse, bebas. Pen stylus terdeteksi otomatis; pilihan diingat di HP.

Aturan permainan:
- Tidak pernah buntu: salah → bunyi/geleng + petunjuk; setelah 2 kali salah, jawaban benar disorot.
- Setelah menghitung, anak MEMILIH jumlahnya (kardinalitas), bukan aplikasi yang menyebutkan.
- Tanpa skor angka, poin, atau streak untuk anak. Anak dapat stiker; orang tua dapat laporan kemampuan.
- Data (stiker, laporan) hanya di HP (localStorage), tidak dikirim ke mana pun (UU PDP, PP Tunas).
- Tidak ada pixel iklan di aplikasi anak; pixel hanya di toko untuk orang tua.

Yang DITOLAK dan alasannya (jangan diusulkan ulang tanpa data baru):
- Game dunia 3D bebas sudut pandang orang pertama (POV, mirip Roblox): kontrol terlalu sulit untuk
  4-5 th, bisa pusing, skala kerja berbulan-bulan, kalah dibanding game gratis. Ganti: petualangan
  pendek berjalur dengan hewan buatan anak sebagai tokoh, satu bab per objek.
- Skor/nilai angka untuk anak: risiko menurunkan minat alami dan memicu pembandingan.

## Episode
Storyboard dirancang oleh agen `.claude/agents/storyboard-episode.md` (format dan aturan ada di sana),
hasilnya di `docs/episodes/`: `E01-sapi-ke-rumah-budi.md` (versi lengkap, 8 adegan, 11-15 menit, dengan
menebalkan huruf S A), `E02-astronot-roket-kertas.md`, dan `musim-1.md` (peta 10 episode Tingkat 1:
15 huruf, 21 kata KV-KV, angka 1-5 lalu 1-10). Prototipe yang jalan sekarang masih E01 versi pendek.
Komponen sudah dibangun: TULIS-TEBAL/LENGKAPI (`tracing-data.ts` = 15 huruf musim 1 + penilai,
`trace-board.ts` = papan tulis), HITUNG-SEKILAS, BACA-KETUK-SUKU, HITUNG-URUT. Urutan goresan huruf
masih tebakan wajar dan **perlu disahkan guru TK**.

## Struktur repo
```
apps/scan/            PWA (Vite + TS + three.js r128) yang di-deploy ke Vercel
  index.html          GAME (produk utama)            → src/play/
  scan.html           prototipe AR kertas (arsip)    → src/scan.ts, src/core.ts, src/qr.ts
  src/play/cow-art.ts gambar garis sapi + region (badan, kepala, kaki, tanduk, ...) + krayon
  src/play/coloring.ts papan mewarnai + baca warna dominan per region
  src/play/cow3d.ts   sapi 3D dari bentuk sederhana; bagian terpisah = sasaran ketuk
  src/play/world.ts   jalan, pohon mangga, rumah Budi, Ibu, sapu/bola/topi
  src/play/app.ts     alur layar, langkah episode (STEPS), titik simpan, pembaruan otomatis
  src/play/tracing-data.ts  data goresan huruf + penilai goresan (diuji di test/tracing.test.ts)
  src/play/trace-board.ts   papan menebalkan huruf (titik mulai, panah, contoh, bantuan)
  e2e/play.mjs        memainkan seluruh petualangan di 4 ukuran layar
content3d/sand3d/     program model 3D sand3d (sepeda, sapi) + hasil uji; lihat README di sana
prototype/            prototipe asli + pipeline konten Python (arsip AR kertas)
docs/brand/           logo asli + prompt logo
```
Vercel: Root Directory = `apps/scan`; konfigurasi di `apps/scan/vercel.json`.

## Tes
- `cd apps/scan && npm test`: penilai goresan huruf (benar lulus; terbalik, dari tengah, berhenti,
  acak gagal) + tes geometri/QR arsip AR kertas.
- `npm run build && npm run e2e`: `e2e/play.mjs` (warnai → warna pindah ke 3D → hitung kaki, tanduk,
  mangga dengan cek "sasaran tidak tertutup" dan jarak ≥ 44 px → susun RU+MAH → pilih sapu → stiker
  → laporan) lalu `e2e/smoke.mjs` (arsip AR kertas di /scan.html).

## Keputusan desain (tetap berlaku)
- **Rupa (disetujui):** buku tulis + potongan gunting. Kertas putih, tinta #26231f, garis biru
  #2f5fa8, satu aksen merah margin #c4302b untuk aksi utama, hijau #2b7a4b hanya untuk "benar".
  Mode gelap = papan tulis. Dunia 3D: toon shading + garis tinta (inverted hull), cahaya total ≈ 1
  supaya warna krayon tampil sama. Font: **Andika** untuk semua huruf yang dibaca anak,
  **Plus Jakarta Sans** untuk teks orang tua. Fredoka/Nunito dilarang (I = l).
  Tanpa konfeti, tanpa label pil. Arah lengkap: https://claude.ai/artifact/RmyYyu48PjUPSsmpn5Np92
- **Membaca:** metode suku kata (sa · pu · sapu). Kartu suku kata, papan RU MAH dengan suku kata berwarna.
- **Aturan kata:** Level 1 hanya KV-KV (MATA, KAKI, SAPU; RUMAH dipakai sebagai kata tujuan, MAH tertutup).
- **3D:** bagian yang dihitung harus terlihat dari sudut kamera soal itu (tes mengecek dengan raycast)
  dan berjarak ≥ 44 px di layar. Tiap soal punya sudut kamera sendiri (kaki: samping agak rendah;
  tanduk: depan-samping kepala).
- **Logo:** roket kertas (raster 1254 px di `docs/brand/`); **perlu versi SVG** sebelum dipakai cetak/merek.
- **Pembayaran:** Midtrans (Snap). **Backend:** Vercel serverless + Postgres Neon (belum dibangun).

Keputusan lama yang TIDAK berlaku lagi: PDF per pembeli + QR serial di kertas, versi fisik/buku,
aturan jarak 20 mm di kertas, AR kamera. Anti-bajak untuk produk digital = konten terkunci di akun.

## Status
- [x] Prototipe game sapi (warnai → 3D → petualangan → stiker + laporan), lulus E2E 4 ukuran layar.
- [ ] Uji ke 3-5 anak: bagian mana yang diulang, di mana bingung, berapa lama bertahan.
- [ ] Suara rekaman asli (sekarang suara bawaan HP).
- [x] Mode mewarnai jari (krayon virtual + tidak meluber) dan pen.
- [x] Desain ulang UI: dunia potongan kertas, peta episode, buku stiker, ruang Ayah/Bunda.
- [x] Storyboard E01 lengkap, E02, peta musim 1.
- [x] Katalog aktivitas (26 jenis) + E01/E02 versi bervariasi + pola pembuka musim 1.
- [x] Tahap 1 komponen: TULIS-TEBAL/LENGKAPI, HITUNG-SEKILAS, BACA-KETUK-SUKU, HITUNG-URUT; E01 jadi
  11 aktivitas, titik simpan per babak, pembaruan otomatis tanpa hapus cache, krayon "bidik" (donat).
- [ ] Tahap 2 E01: TULIS-JALUR, HITUNG-AMBIL (seret), momen ringan GOSOK/SERET, WARNA-BENDA-KECIL,
  papan nama 3D. Diputuskan: 15-18 menit dengan titik simpan, E01 = episode gratis untuk iklan
  (iklan baru jalan setelah E01 lengkap), huruf kapital campur kecil boleh.
- [ ] Urutan goresan 15 huruf disahkan guru TK.
- [ ] Objek dan episode berikutnya (benda/kendaraan via sand3d, hewan via three.js).
- [ ] Akun, pembayaran Midtrans, penguncian konten, toko + pixel Meta (server-side Purchase).
