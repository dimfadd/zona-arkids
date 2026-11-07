# Log Roket Kertas

Catatan keputusan dan perubahan, terbaru di atas. Setiap sesi kerja menambah satu entri:
tanggal, apa yang diputuskan (dan oleh siapa), apa yang berubah, hasil uji, dan apa yang belum.

## 2026-11-07 · Desain ulang UI: dunia potongan kertas + sistem episode
- Pemilik: UI sebelumnya terasa "AI slop / khas Claude". Diagnosis: tampil seperti dokumen (latar putih,
  judul bergaris, tombol kotak bergaris tinta, teks panjang), bukan dunia bermain.
- Dibangun: beranda = Peta Petualangan Musim 1 (10 pulau sesuai `musim-1.md`; E01 bisa dimainkan,
  E02-E10 jujur "segera hadir"), kartu episode dari bawah (yang dipelajari, durasi, tombol Main),
  Buku Stiker bergaris buku tulis, Ruang Ayah/Bunda di balik gerbang orang tua (soal perkalian),
  tombol suara on/off, krayon berbentuk batang krayon, token angka kuning, kartu soal.
- Rupa: warna dari logo (merah roket, langit, rumput, kuning), tombol tebal bertingkat, satu tema siang
  (dunia ilustrasi anak, disengaja). Semua kontras teks lolos WCAG AA.
- Penanda posisi di peta: roket kertas digambar ulang sebagai SVG (memotong logo raster menyisakan kertas).
- Login dan landing page ditunda (permintaan pemilik) sampai tampilan dinilai bagus.
- Tes: unit 10/10, build, E2E game (peta, kartu terkunci, buku stiker, gerbang orang tua) dan arsip lulus.

## 2026-11-07 · SOP, log, agen desainer aset 3D
- Dibuat `docs/SOP.md` (aturan kerja) dan file ini (log). `CLAUDE.md` tetap ringkasan keputusan + status.
- Dibuat agen `asset-3d-designer`: wajib membandingkan model dengan 2-4 foto asli sebelum selesai.
- Lingkungan cloud: host `commons.wikimedia.org` dan `upload.wikimedia.org` diizinkan (disetujui pemilik)
  untuk foto referensi. Hasil uji: satu pencarian berhasil (200), lalu berulang kali 429 dan sempat 403
  dari proxy. Jalur cadangan di SOP: pemilik mengirim 2-4 foto lewat chat.
- Tes sebelum push: unit 10/10, build, E2E game dan arsip lulus (WARN kaki 35-40 px di arsip AR kertas).
- Kesalahan: screenshot E2E (e2e/out-play) sempat ter-commit; dihapus di `928f871`, aturan cek `git status` ditambahkan ke SOP.
- Diluruskan ke pemilik: sand3d bukan perpustakaan aset jadi; setiap objek ditulis sebagai program.
  "Realistis" = proporsi benar menurut foto, gaya tetap krayon + tinta.

## 2026-11-07 · Mode mewarnai jari/pen, storyboard musim 1, uji sand3d (`6ad9bd0`)
- Pemilik: mewarnai dengan jari sering meluber. Dibangun mode Jari (krayon virtual, ujung 64 px di atas
  jari, goresan terkunci di bagian awal) dan mode Pen (langsung, stylus terdeteksi otomatis).
- Kamera berbasis waktu (HP lambat), badge angka berukuran tetap di layar. Tes: ?mangga=5.
- Agen `storyboard-episode` dibuat; hasil: E01 lengkap, E02 Astronot Roket Kertas, peta musim 1.
- Uji sand3d (izin pemilik): sepeda bagus; sapi belum lebih baik dari buatan tangan; GLB 690-910 KB.
  Keputusan: sand3d untuk benda/kendaraan, hewan tetap three.js.
- Pertanyaan terbuka ke pemilik: pengesahan urutan goresan huruf, episode gratis, model jual,
  simpan-lanjut, penampilan tokoh.

## 2026-11-06 · Arah produk berubah: game mewarnai + 3D, tanpa kertas (`84d4443`)
- Pemilik memutuskan: produk digital murni, tanpa AR kertas (biaya HPP, cetak, kirim). Iklan utama Meta.
- Prototipe sapi: warnai → sapi 3D → hitung kaki/tanduk/mangga → RU+MAH → SA·PU → stiker + laporan.
- Ditolak: game dunia 3D POV mirip Roblox (terlalu sulit untuk 4-5 th, skala besar); skor angka anak.
- Aplikasi AR kertas dipindah ke `/scan.html` sebagai arsip. Bug PWA: /scan.html?debug=1 dijawab dengan
  halaman game, diperbaiki.

## 2026-11-06 · Nama dan logo (`b6c069c`)
- Nama: Roket Kertas (pemilik). Logo roket kertas dari generator AI (pemilik); perlu versi SVG.
- Diperingatkan: merek, domain, akun sosial belum dicek (PDKI kelas 9, 16, 41).

## 2026-11-06 · Arah rupa dan metode baca disetujui (`5f3d299`)
- Rupa buku tulis + potongan gunting, mode gelap papan tulis, Andika + Plus Jakarta Sans.
- Metode baca suku kata (SAS) menggantikan "es, a, sa" sebagai bawaan.
- Riset pasar: TikTok Shop tidak menerima produk digital. Riset kurikulum: daftar objek KV-KV.

## 2026-11-06 · Deploy Vercel (`70fa98c`)
- Dua kali gagal build karena perintah memakai jalur dari root repo; proyek Vercel ternyata berjalan
  dari `apps/scan`. Konfigurasi dipindah ke `apps/scan/vercel.json`. URL: zona-arkids-scan.vercel.app.

## 2026-11-06 · Awal (`6be06ef` … `fccc1e2`)
- Prototipe AR kertas "Gambarku Hidup" diimpor, diporting ke Vite + TS PWA, 6 soal hitung sapi,
  auto-zoom, pembacaan QR serial dari foto, mode diagnosa `?debug=1`.
