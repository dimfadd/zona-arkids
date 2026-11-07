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

Prototipe pertama (sudah jalan, `apps/scan/index.html`): sapi.
1. Warnai sapi (10 krayon, kuas besar/kecil, penghapus, urungkan, hapus semua).
2. Sapi 3D (toon + garis tinta). Kenalan: hitung kaki (4) dan tanduk (2), lalu pilih angka.
3. Jalan ke pohon: hitung mangga (acak 3-5), pilih angka.
4. Rumah Budi: susun kartu RU + MAH (pengecoh BU), pintu terbuka.
5. Ibu minta SA·PU: anak membaca kartu lalu memilih benda (bola / sapu / topi), di 3D atau tombol gambar.
6. Selesai: gambar anak jadi stiker di "kebun stiker"; laporan untuk orang tua.

Navigasi (sejak desain ulang): beranda = **Peta Petualangan** (pulau per episode dari `src/play/episodes.ts`),
kartu episode dari bawah, **Buku Stiker**, **Ruang Ayah/Bunda** di balik gerbang orang tua (laporan,
pengaturan mode mewarnai, hapus data), tombol suara on/off. Login dan landing page belum, sengaja ditunda.

Mewarnai punya dua mode (`coloring.ts`): **Jari** (bawaan untuk sentuhan): krayon virtual dengan ujung
64 px di atas jari, dan goresan terkunci di bagian gambar tempat goresan dimulai (tidak meluber).
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
Komponen yang dipakai semua episode dan belum dibangun: **menebalkan huruf** (titik mulai, panah, cek
arah goresan) dan **lihat sekilas** (subitizing). Urutan goresan huruf perlu disahkan guru TK.

## Struktur repo
```
apps/scan/            PWA (Vite + TS + three.js r128) yang di-deploy ke Vercel
  index.html          GAME (produk utama)            → src/play/
  scan.html           prototipe AR kertas (arsip)    → src/scan.ts, src/core.ts, src/qr.ts
  src/play/cow-art.ts gambar garis sapi + region (badan, kepala, kaki, tanduk, ...) + krayon
  src/play/coloring.ts papan mewarnai + baca warna dominan per region
  src/play/cow3d.ts   sapi 3D dari bentuk sederhana; bagian terpisah = sasaran ketuk
  src/play/world.ts   jalan, pohon mangga, rumah Budi, Ibu, sapu/bola/topi
  src/play/app.ts     alur layar dan langkah petualangan
  e2e/play.mjs        memainkan seluruh petualangan di 4 ukuran layar
content3d/sand3d/     program model 3D sand3d (sepeda, sapi) + hasil uji; lihat README di sana
prototype/            prototipe asli + pipeline konten Python (arsip AR kertas)
docs/brand/           logo asli + prompt logo
```
Vercel: Root Directory = `apps/scan`; konfigurasi di `apps/scan/vercel.json`.

## Tes
- `cd apps/scan && npm test`: tes geometri/QR untuk arsip AR kertas.
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
- [ ] Bangun komponen dari `docs/episodes/katalog-aktivitas.md` (terberat: TULIS-TEBAL), lalu E01 versi baru.
- [ ] Objek dan episode berikutnya (benda/kendaraan via sand3d, hewan via three.js).
- [ ] Akun, pembayaran Midtrans, penguncian konten, toko + pixel Meta (server-side Purchase).
