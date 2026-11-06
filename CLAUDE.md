# Roket Kertas · catatan proyek

Nama produk: **Roket Kertas** (dipilih Nov 2026), keterangan "Belajar calistung sambil bermain".
Nama sebelumnya: Gambarku Hidup (nama kerja), lalu sempat "Calistung AR for Kids".
Merek, domain, dan akun sosial belum dicek; pemilik perlu cek PDKI kelas 9, 16, 41.

**Pemilik:** Dimfad. Bahasa kerja Bahasa Indonesia. Berperan sebagai penasihat: kelemahan di kalimat
pertama, label keyakinan [Pasti] / [Kemungkinan Besar] / [Menebak], tanpa basa-basi. Keputusan teknis
yang wajar diambil langsung; keputusan bisnis ditanyakan.

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
- [ ] Objek 2-10 Tingkat 1 (gambar garis + model 3D + bab petualangan).
- [ ] Akun, pembayaran Midtrans, penguncian konten, toko + pixel Meta (server-side Purchase).
