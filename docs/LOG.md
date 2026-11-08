# Log Roket Kertas

Catatan keputusan dan perubahan, terbaru di atas. Setiap sesi kerja menambah satu entri:
tanggal, apa yang diputuskan (dan oleh siapa), apa yang berubah, hasil uji, dan apa yang belum.

## 2026-11-08 · E01 tahap 1: menebalkan huruf, soal lebih banyak, krayon bidik, pembaruan otomatis
- Pemilik: (1) setiap ada pembaruan web tidak berubah sampai cache dihapus, ini tidak bisa dibebankan ke
  pembeli; (2) krayon jari ikut mewarnai bagian luar saat lewat menuju bagian dalam (kasus donat), usul
  lingkaran "aktifkan warna"; (3) soal dalam satu episode masih sedikit.
- Pembaruan: PWA diubah ke mode "prompt" dengan penjaga: versi baru dipasang otomatis (muat ulang) hanya
  di peta/stiker/ruang orang tua, dicek tiap 30 menit dan saat aplikasi kembali dibuka. Versi tampil di
  ruang Ayah/Bunda. Halaman arsip scan langsung memperbarui diri.
- Krayon: usul lingkaran aktivasi tidak dipakai (dua kontrol terlalu sulit untuk 4-5 tahun). Gantinya
  "bidik otomatis": goresan milik bagian tempat krayon paling banyak mewarnai; coretan di bagian yang
  dilewati ditarik kembali; terkunci setelah ±110 unit. Diuji E2E: lewat badan ke corak → hanya corak;
  lama di badan lalu terpeleset ke corak → tetap badan.
- Komponen baru: TULIS-TEBAL + TULIS-LENGKAPI (15 huruf, penilai per goresan, 142 tes unit), HITUNG-SEKILAS,
  BACA-KETUK-SUKU (dengan varian jeda), HITUNG-URUT (sungai + 5 batu di 3D). Laporan orang tua kini
  mencatat menulis.
- E01: dari 5 menjadi 11 aktivitas dalam 5 babak, dibuka dengan menghitung sapi putih, mewarnai di
  tengah babak 1; titik simpan di awal setiap babak (kartu episode menawarkan "Lanjutkan").
- Bug yang ditemukan tes: tirai sekilas menutupi ketukan (CSS mengalahkan `hidden`); lompatan sapi
  bertabrakan bila batu diketuk cepat. Keduanya diperbaiki.
- Uji: `npm test` 152 lulus, `npm run e2e` lulus di 4 ukuran layar. Belum diuji di HP asli.

## 2026-11-07 · Keputusan pemilik soal durasi dan rilis
- Durasi episode tetap 15-18 menit dengan titik simpan per babak (pemilik: masih normal).
- E01 menjadi episode gratis untuk iklan Meta.
- E01 versi baru dirilis bertahap: komponen dibangun satu per satu, mulai dari yang paling sering
  dipakai di musim 1, dan langsung dipasang ke E01.
- E02 boleh didominasi berhitung (6 dari 14 aktivitas).
- Huruf: kapital campur huruf kecil diperbolehkan.
- Catatan deploy: dua commit terakhir (`df4096d`, `9985350`) hanya dokumen, jadi tampilan web tidak
  berubah. Perubahan tampilan terakhir ada di `7828ae6` (desain ulang). Semua sudah di-push.

## 2026-11-07 · Episode bervariasi + katalog aktivitas
- Pemilik: urutan warnai, petualangan, selesai yang selalu sama akan membuat anak bosan; minta episode
  kreatif, mewarnai tidak selalu di awal dan boleh lebih dari sekali, banyak aktivitas, 10-20 menit.
- Aturan baru (SOP + agen storyboard): sapaan dan stiker tetap; isi tengah bervariasi; 3-4 babak dengan
  titik simpan; 10-16 aktivitas; baca/tulis/hitung masing-masing minimal 3 kali; pembuka beda antar episode.
- Agen storyboard menulis `katalog-aktivitas.md` (26 jenis + 2 ritual, sekaligus daftar komponen) dan
  merevisi E01 (pembuka HITUNG, 3 babak, 13 aktivitas, ±16,5 menit), E02 (pembuka BACA, 4 babak,
  14 aktivitas, ±17,5 menit), musim-1 (pola pembuka H B W T B W H T B W, ±166 menit).
- Risiko dicatat: 16-18 menit melewati daya tahan anak 4 tahun sekali duduk, jadi titik simpan wajib;
  E01 versi baru butuh 15 komponen, terberat TULIS-TEBAL. Prototipe yang jalan masih E01 versi pendek.

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
