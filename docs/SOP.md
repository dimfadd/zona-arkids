# SOP Roket Kertas

Aturan kerja untuk siapa pun yang mengerjakan repo ini: manusia, Claude, atau agen. Keputusan produk
dan status ada di `CLAUDE.md`; riwayat keputusan dan perubahan ada di `docs/LOG.md`.
Kalau aturan di sini bertentangan dengan permintaan pemilik produk (Dimfad), permintaan pemilik menang,
lalu aturan ini diperbarui.

## 1. Setiap sesi kerja
1. Baca `CLAUDE.md`, file ini, dan 10 entri terakhir `docs/LOG.md` sebelum mengubah apa pun.
2. Kerjakan di branch yang ditentukan sesi. Jangan push ke branch lain.
3. Sebelum push: `cd apps/scan && npm test && npm run build && npm run e2e`. Semua harus lulus.
   "WARN" (sasaran ketuk < 44 px) dicatat; perbaikannya di aset atau sudut kamera, bukan di tes.
4. Push ke GitHub = Vercel deploy ulang otomatis (Root Directory `apps/scan`). Setelah push, minta
   pemilik membuka ulang aplikasi; PWA bisa menampilkan versi lama sekali sebelum memuat yang baru.
5. Akhiri sesi dengan: entri baru di `docs/LOG.md`, `CLAUDE.md` bagian Status diperbarui, dan aturan
   baru (kalau ada) ditambahkan di file ini.

## 2. Cara berkomunikasi dengan pemilik
- Bahasa Indonesia. Kelemahan atau kabar buruk di kalimat pertama. Tanpa basa-basi atau pujian.
- Label keyakinan untuk klaim penting: **[Pasti]**, **[Kemungkinan Besar]**, **[Menebak]**.
- Saat tidak setuju: "Saya tidak setuju karena … Ini yang akan saya lakukan … Risikonya …".
- Keputusan teknis yang wajar diambil langsung. Keputusan bisnis (harga, nama, kanal jual, tokoh,
  kurikulum) ditanyakan, dengan rekomendasi.
- Hasil uji dilaporkan apa adanya: yang gagal, yang dilewati, yang belum diuji di HP asli.

## 3. Aturan isi belajar (berlaku di semua episode)
- Membaca: metode suku kata (SAS). Audio "sa · pi · sapi". Nama huruf hanya pilihan orang tua.
- Tingkat 1: kata yang dibaca anak hanya KV-KV. Kata bersuku tertutup hanya dibacakan.
- Berhitung: ketuk satu per satu, lalu anak MEMILIH jumlahnya.
- Tidak pernah buntu: salah → petunjuk; 2 kali salah → jawaban disorot.
- Tanpa skor, poin, nyawa, batas waktu, atau streak. Anak dapat stiker; orang tua dapat laporan.
- Episode dirancang oleh agen `storyboard-episode` dan disimpan di `docs/episodes/` sebelum dibangun.
- Urutan goresan huruf untuk menebalkan disahkan guru TK sebelum dipakai.
- Hindari BABI dan ANJING; tokoh dan benda lokal Indonesia; tanpa merek.

## 4. Aturan rupa dan UI
- Arah rupa yang disetujui: buku tulis + potongan gunting. Token warna dan font ada di `CLAUDE.md`.
- Andika untuk semua huruf yang dibaca anak; Plus Jakarta Sans untuk teks orang tua.
- Setiap perubahan UI atau copy melewati filter antislop (skill `antislop`): tanpa em dash, tanpa
  statistik/testimoni karangan, kontras WCAG AA di mode terang dan gelap, sasaran sentuh ≥ 44 px,
  tidak ada tombol yang tidak berbuat apa-apa, ada keadaan kosong/memuat/galat.
- Satu aksen merah per layar. Tanpa konfeti, tanpa label pil.

## 5. Aturan aset 3D
- Aset dibuat oleh agen `asset-3d-designer` (lihat `.claude/agents/asset-3d-designer.md`).
- **Pilih alat:** benda buatan manusia dan kendaraan → sand3d (`content3d/sand3d/`); hewan, tumbuhan,
  dan tokoh → three.js langsung (`apps/scan/src/play/`), sampai sand3d terbukti untuk hewan.
- **"Realistis" artinya bentuk dan proporsi benar menurut foto asli**, bukan tampilan foto. Gaya
  tetap toon + garis tinta, dan warna objek yang diwarnai datang dari krayon anak.
- **Wajib referensi nyata:** setiap aset dibandingkan dengan 2-4 foto asli (samping, depan, tiga
  perempat) sebelum dianggap selesai. Proporsi kunci diukur dari foto dan ditulis di
  `content3d/<aset>/referensi.md` bersama sumber dan lisensi setiap foto.
- **Sumber foto:** Wikimedia Commons (host diizinkan di lingkungan cloud). Akses dari sandbox dibatasi
  laju: maksimal sekitar 6 permintaan per aset, tunggu 45-60 detik setelah balasan 429, cantumkan
  User-Agent yang jelas. Foto hanya untuk perbandingan: jangan disalin jadi tekstur, jangan di-commit
  (folder `ref/` diabaikan git); yang di-commit hanya metadata dan render model.
- **Kalau Wikimedia terus membalas 429** (sering terjadi: IP sandbox dipakai bersama), jangan
  memaksa dan jangan mengarang: minta pemilik mengirim 2-4 foto lewat chat (lihat sudut yang
  dibutuhkan), lalu lanjutkan dari foto itu. Sumber lain (misalnya Openverse) baru dipakai setelah
  host-nya disetujui pemilik.
- **Nama bagian** dalam Bahasa Indonesia dan stabil, karena dipakai game: `badan`, `kepala`,
  `kaki_depan_dekat`, `roda_depan`, `jari_3`. Bagian yang dihitung atau diwarnai harus objek terpisah.
- **Anggaran:** di bawah 15 ribu segitiga per aset, GLB di bawah 200 KB setelah kompresi, tanpa tekstur
  foto. Bagian yang dihitung harus terlihat dari kamera adegannya dan berjarak ≥ 44 px di HP 360 px.

## 6. Data anak dan privasi
- Data belajar (stiker, laporan) hanya di HP; tidak dikirim ke server atau platform iklan.
- Tidak ada pixel iklan di aplikasi anak. Pixel hanya di toko untuk orang tua; Purchase dari server.
- Video atau foto anak untuk pemasaran hanya dengan izin tertulis orang tua.

## 7. Agen yang tersedia
| Agen | File | Dipakai untuk |
|---|---|---|
| storyboard-episode | `.claude/agents/storyboard-episode.md` | merancang episode dan peta musim |
| asset-3d-designer | `.claude/agents/asset-3d-designer.md` | membuat dan memperbaiki aset 3D dengan referensi foto |
Agen bekerja di latar belakang; hasilnya diperiksa sebelum di-commit, dan dicatat di `docs/LOG.md`.
