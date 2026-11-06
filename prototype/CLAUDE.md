# Gambarku Hidup: Konteks Lengkap Proyek (Handoff ke Claude Code)

> **Untuk Claude di sesi baru:** baca file ini sampai habis sebelum mengerjakan apa pun. Ini adalah ringkasan seluruh diskusi produk, riset, keputusan desain, dan prototipe teknis yang sudah jadi dan sudah teruji. Folder ini berisi kode prototipe yang **sudah berjalan**. Jangan menulis ulang dari nol. Kembangkan dari sini.
>
> **Pemilik proyek:** Dimfad (Dimas Fadilah Permana R), Marketing Data Analyst, Jakarta. Bahasa kerja: Bahasa Indonesia.
> **Gaya kerja yang diminta Dimfad:** berperan sebagai penasihat, bukan "yes-man". Sampaikan kelemahan dan kebenaran yang tidak enak di kalimat pertama. Beri label keyakinan untuk klaim penting: **[Pasti]**, **[Kemungkinan Besar]**, **[Menebak]**. Tanpa basa-basi, tanpa pujian pembuka. Kalau Dimfad salah, pakai struktur: "Saya tidak setuju karena… Ini yang akan saya lakukan… Risikonya…". Keputusan teknis yang wajar langsung diambil, tidak perlu minta izin di setiap langkah.

---

## 0. Ringkasan satu paragraf

**Gambarku Hidup** (nama kerja) adalah buku lembar kerja calistung berjenjang untuk anak **4-7 tahun** yang "hidup" lewat **AR 2D gaya potongan kertas**. Alurnya: anak mewarnai atau menebalkan huruf di kertas cetak. Orang tua memindai lembar dengan HP. Gambar hasil karya anak **terpotong mengikuti garis** (dengan pinggiran putih seperti stiker), **terlipat berdiri di atas kertasnya, dan bergoyang**, lalu memberi tugas: menghitung (misalnya ketuk kaki sapi satu per satu) atau mengeja (S-A Sa, P-I Pi, dibaca Sapi, dengan tombol cek oleh orang tua lalu audio contoh). Buku 1 = Level 1, lalu Buku 2, 3, dan seterusnya makin sulit sampai anak lancar baca, tulis, hitung. Prototipe web (deteksi lembar, pemotongan, animasi berdiri, hitung kaki, eja, mode foto, mode kamera langsung, tampilan 3D) **sudah jadi dan teruji** di folder ini.

---

## 1. Isi folder ini

```
CLAUDE.md                      <- file ini
package.json                   <- deps Node: js-aruco 0.1.0, three 0.128.0, pngjs, puppeteer-core (untuk tes)
sheets.py                      <- SUMBER KEBENARAN layout lembar (koordinat mm A4, ID marker, gambar sapi, huruf)
build_assets.py                <- generate SVG/PDF lembar, mask siluet, config.json (env APP_URL -> QR)
make_photos.py                 <- bikin "foto HP" simulasi (krayon + perspektif + meja) untuk tes/demo
build_page.py                  <- rakit web app 1 file: dist/gambarku-hidup.html + dist/standalone/index.html
src/template.html              <- markup + CSS (token warna, light/dark)
src/core.js                    <- geometri murni: homografi, pose kamera, estimasi fokus, rektifikasi, white balance
src/app.js                     <- aplikasi: three.js scene, potongan berdiri, animasi, tugas hitung/eja, kamera langsung
vendor/aruco-bundle.js         <- js-aruco (detektor marker) dibundel untuk browser + patch ukuran minimum
test/run.js                    <- tes Node: deteksi + rektifikasi di foto simulasi -> build/test/*.png
test/browser.js                <- tes headless Chrome: klik demo, hitung kaki, eja, 3D, screenshot
test/live.js                   <- tes mode kamera langsung pakai kamera palsu (y4m)
build/config.json              <- konfigurasi lembar hasil generate (dipakai app)
out/Gambarku-Hidup-Sapi-Level1.pdf          <- PDF A4 2 lembar siap cetak (prototipe)
out/gambarku-hidup-kamera-langsung.html     <- web app standalone (mode kamera langsung butuh HTTPS)
```

**Perintah build:**
```bash
npm install                                   # js-aruco, three, pngjs, puppeteer-core
pip install qrcode numpy pillow opencv-python fonttools --break-system-packages
# font Fredoka harus terpasang di fontconfig (lihat bagian 9.6)
APP_URL="https://domain-kamu/scan" python3 build_assets.py   # SVG, PDF, mask, config.json
python3 make_photos.py                        # foto simulasi untuk demo/tes
python3 build_page.py                         # web app 1 file
node test/run.js                              # cek deteksi & rektifikasi
node test/browser.js <folder_screenshot>      # cek alur UI (butuh google-chrome)
```

**Prototipe yang sudah dipublikasikan:** https://claude.ai/artifact/A2YL3M4At2BK3JFUwq3Nav (artifact claude.ai, privat milik Dimfad). QR di PDF prototipe mengarah ke URL ini. **Di artifact, kamera langsung diblokir** oleh sandbox, jadi hanya mode foto yang jalan di sana.

---

## 2. Latar belakang produk & riset (hasil diskusi)

### 2.1 Kebutuhan anak 4-7 tahun (ringkasan riset)
- **Sosial-emosional dan regulasi diri** adalah kebutuhan paling mendasar. Studi Jones, Greenberg & Crowley (AJPH 2015, AS) menunjukkan skor prososial anak TK memprediksi pendidikan, pekerjaan, dan kriminalitas belasan tahun kemudian. **[Pasti] korelasinya ada, [Menebak] kausalitasnya**, karena penelitinya sendiri menyatakan studi itu tidak membuktikan sebab-akibat.
- **Fungsi eksekutif** (memori kerja, kontrol diri, fleksibilitas). Meta-analisis Pauli-Pott dkk. (2021, Jerman, 35 RCT): efek intervensi memori kerja d≈0,46 dan kontrol inhibisi d≈0,30. Pendekatan *scaffolding* oleh orang dewasa paling efektif. **[Kemungkinan Besar] nyata tapi efeknya sedang.**
- **Bermain peran gaya Vygotsky (Rusia, Tools of the Mind)** mendukung EF, tapi buktinya hanya parsial (Veraksa dkk. 2022; WWC hanya menerima 1 studi).
- **Latihan akademik (calistung) juga menaikkan EF, tapi kecil** (efek ~0,17, Dietrichson dkk.).
- **Keterlibatan orang tua** adalah bahan aktif terpenting. Gawai tanpa pendampingan berisiko memicu tantrum dan impulsivitas.
- Tahap kognitif usia 2-7 adalah praoperasional, transisi ke operasi konkret di usia 7-8. Materi harus konkret, visual, dan bisa dipegang.

### 2.2 Perilaku beli orang tua
- Survei 262 orang tua Indonesia (anak 0-6 tahun, Jurnal Riset Bisnis 2023): faktor terkuat niat beli mainan edukatif adalah **persepsi kontrol perilaku** (mudah dan terkendali), disusul sikap, norma subjektif, nilai uang, dan kualitas. Persepsi risiko tidak signifikan.
- China: kecemasan pendidikan orang tua tinggi saat transisi ke SD (n=26.295 keluarga). Perbandingan sosial memperbesar kecemasan itu. Literatur akademik menganggap memanfaatkan kecemasan ini sebagai **masalah etis**.
- AS (Radesky dkk., JAMA Netw Open 2022): 4 dari 5 aplikasi anak prasekolah memakai desain manipulatif. Urgensi palsu (fake scarcity) masuk kategori dark pattern dan ditindak FTC.
- **Keputusan:** jangan pakai urgensi palsu atau manipulasi emosi. Pakai **pengurangan gesekan** dan **urgensi nyata** (tahun ajaran baru Juli, persiapan masuk SD, ulang tahun, kenaikan kelas).

### 2.3 Kenapa AR "potongan kertas 2D", bukan 3D, dan bukan aplikasi layar penuh
- AR murni berisiko: efek kebaruan cepat pudar, bertabrakan dengan alasan orang tua membeli (ingin mengurangi waktu layar), sulit dipakai anak 4-6 tahun sendiri, dan HP Android murah lemah. **[Kemungkinan Besar]**
- Solusinya adalah rumus **"lama di kertas, sebentar di layar"**: sekitar 20 menit mewarnai atau menulis, lalu 1-2 menit AR sebagai hadiah.
- **3D dibatalkan** karena butuh model 3D dan UV mapping per objek (mahal). Penggantinya **2D standee**: gambar dipotong mengikuti siluet lalu ditekuk berdiri. Membuat objek baru cukup dengan line art + mask, jauh lebih murah, dan warna anak tampil persis seperti di kertas.
- Warna yang keluar garis otomatis terbuang oleh mask, jadi hasilnya selalu terlihat rapi.

### 2.4 Keputusan pedagogi
- **Level 1 hanya kata dengan suku kata terbuka KV-KV**: SA-PI, BO-LA, KU-DA, MA-TA, SA-PU, dan sejenisnya. Kata dengan "NG", "NY", atau suku kata tertutup (KUCING, KAMBING) baru masuk Level 2.
- **Metode eja harus konsisten di semua buku.** Prototipe memakai pola yang Dimfad minta: nama huruf, lalu suku kata ("es, a, sa · pe, i, pi · dibaca sapi"). Masih perlu dicek dengan guru TK, metode mana yang dipakai sekolah sekitar. **[Menebak]**
- **Tidak memakai pengenalan suara.** Orang tua yang menilai anak lewat tombol "Anak sudah mengeja · Cek", lalu audio contoh diputar. Ini menghindari masalah teknis tersulit dan melibatkan orang tua.
- **Hitung dengan ketukan.** Anak mengetuk tiap kaki, muncul badge angka 1, 2, 3, 4, dan terdengar suara "satu, dua…". Ini lebih jelas daripada sekadar ditanya.
- **Menulis tetap di kertas.** AR tidak menilai tulisan tangan. Huruf yang ditebalkan anak ikut terpotong menjadi kartu huruf yang berdiri.
- **Klaim pemasaran:** "latihan calistung yang menyenangkan / persiapan masuk SD lewat bermain", **bukan** "anak pasti bisa membaca". Kemendikbud melarang tes calistung untuk masuk SD dan mendorong transisi PAUD-SD yang menyenangkan. **[Kemungkinan Besar]**

### 2.5 Strategi bisnis (draf)
- **Produk utama: buku cetak** (lebih sulit dibajak, nilai terasa lebih tinggi, bisa jadi kado). PDF cocok untuk tes pasar awal saja.
- Dijual per tema/level di TikTok Shop & Shopee. Konten UGC "gambar anakku jadi hidup" adalah format penjualan alami. Dimfad berpengalaman di TikTok Shop dan affiliate.
- Harga **[Menebak]**: Rp59-99 ribu per buku. Margin besar karena barangnya kertas.
- **Validasi sebelum produksi massal:** 1 lembar dicetak lalu dites di 3-5 HP Android murah, kemudian 5-10 keluarga selama 2 minggu, rekam reaksi anak, lalu pre-order. Ukur juga sudut pesan: "siap SD" vs "anti gadget" vs "kado".
- **Hubungan dengan Kidpedia** (platform edukasi anak milik Dimfad): jangan jadikan Kidpedia "serba ada". Gambarku Hidup bisa menjadi produk fokus, dan Kidpedia menjadi pendamping atau rumah teknisnya. Stack Kidpedia yang sudah ada: VPS Biznet Neo (4 core/8GB/60GB), Cloudflare R2, Auth.js Google OAuth, Postgres, Midtrans.

---

## 3. Alur pengguna (sudah diimplementasikan di prototipe)

1. Orang tua mencetak PDF. Anak **mewarnai** (Lembar 1) atau **menebalkan huruf** (Lembar 2).
2. Orang tua memindai **QR** di lembar untuk membuka web app, lalu memilih:
   - **Foto lembar** (`<input type=file accept=image/* capture=environment>`), selalu bisa dipakai, termasuk di artifact, atau
   - **Kamera langsung** (`getUserMedia`), hanya di hosting sendiri yang HTTPS.
3. App mendeteksi **4 marker hitam di pojok** dan otomatis tahu ini lembar apa dari ID markernya.
4. App menghitung homografi lalu memotong (merektifikasi) area gambar dan huruf, melakukan white balance ke putih kertas, lalu memberi mask siluet.
5. Potongan muncul. Mula-mula rata menempel di kertas, lalu **terlipat berdiri** (easeOutBack, efek "tuing"), meninggalkan **lubang bekas potongan** di kertas dan **bayangan lembut**, lalu **bergoyang** terus.
6. Tugas:
   - **Lembar 1 (hitung):** "Ada berapa kaki sapi? Ketuk kakinya satu per satu." Setiap ketukan di kaki memunculkan badge angka dan suara. Setelah 4 kaki: "Hebat! Kaki sapi ada empat." plus konfeti. Mengetuk badan sapi memunculkan suara "mooo" dan sapi melompat.
   - **Lembar 2 (eja):** kartu huruf S-A-P-I dan sapi kecil berdiri. Orang tua mendampingi anak mengeja, lalu mengetuk "Anak sudah mengeja · Cek". Huruf melompat satu per satu mengikuti audio "es… a… sa… pe… i… pi… dibaca, sapi", disertai caption `S-A Sa · P-I Pi`.
7. Tombol **Putar 3D** mengganti foto dengan kertas virtual. Drag untuk memutar dan melihat potongan berdiri dari samping. **Ulangi** mengulang animasi. **Ganti lembar** kembali ke awal.

---

## 4. Desain lembar cetak (A4 potret, satuan mm)

Semua angka ada di `sheets.py` dan `build/config.json`.

### 4.1 Marker pojok (ArUco "original", 7×7 sel)
- Ukuran marker **20 mm** (sel 20/7 ≈ 2,857 mm), dengan **quiet zone putih 1 sel** di sekelilingnya.
- Posisi pojok kiri-atas tiap marker: TL `(10,10)`, TR `(180,10)`, BL `(10,267)`, BR `(180,267)`.
- **ID per lembar** (4 ID unik per lembar, dipakai untuk mengenali lembar dan menghitung pose):
  - `warna-sapi` (Lembar 1): TL 101, TR 202, BL 303, BR 404
  - `tebal-sapi` (Lembar 2): TL 515, TR 626, BL 737, BR 848
- **Encoding ID** (kamus asli js-aruco): ID 10-bit, 5 baris × 2 bit. Setiap baris memakai salah satu pola `[1,0,0,0,0]`, `[1,0,1,1,1]`, `[0,1,0,0,1]`, `[0,1,1,1,0]` (1 = sel putih). Lihat `marker_bits()` di `sheets.py`.
- **Urutan sudut hasil deteksi**: `corners[0..3]` = kiri-atas, kanan-atas, kanan-bawah, kiri-bawah marker dalam orientasinya sendiri (sudah diverifikasi). Config menyimpan 4 sudut halaman per ID dengan urutan yang sama.
- **Kapasitas:** kamus ini punya 1024 ID, jadi maksimal **256 lembar** dengan set 4 ID unik. Cukup untuk beberapa level. Kalau kurang, pertimbangkan pindah ke `js-aruco2` (kamus ARUCO_MIP_36H12 / 4X4_1000) atau skema "3 marker tetap + 1 marker ID lembar".
- **Jangan** taruh elemen hitam pekat atau teks dalam jarak kurang dari 5 mm dari marker. Instruksi "Jangan warnai kotak hitam di pojok" wajib ada di setiap lembar.

### 4.2 Lembar 1 "Sapi · Mewarnai"
- Judul "Sapi" (Fredoka Bold 13 mm) dan subjudul "Lembar 1 · Mewarnai" di tengah atas.
- Sapi line art (box lokal 170×180, kaki di y=168) ditempatkan di `(20,32)` skala 1. Garis tanah dan rumput dekoratif tidak ikut terpotong.
- **Potongan (piece) `cow`**: box `[14, 50, 184, 154.2]`, hinge (garis tekuk) `y = 204.2` = sisi bawah box. Mask = siluet sapi yang **dilebarkan 2,6 mm** (pinggiran putih seperti stiker).
- **Area ketuk kaki** (koordinat halaman, r = radius mm): `(63.5,172,r11)`, `(78,177,r11)`, `(126.5,172,r11)`, `(140,177,r11)`. Toleransi ketuk 1,45×r.
- Teks "Warnai sapinya sesukamu!" di y≈224. Instruksi untuk orang tua di x=40, y=246-270.

### 4.3 Lembar 2 "Tebalkan Hurufnya · Menulis"
- Sapi kecil di `(60,22)` skala 0,52 (boleh diwarnai). Piece `cow`: box `[56.88, 31.36, 95.68, 80.707]`, hinge `112.067`.
- 4 kartu huruf 40×54 mm di y=148, dengan jarak 5 mm dalam satu suku kata dan 16 mm antar suku kata:
  S x=12, A x=57, P x=113, I x=158. Hinge di y=202. Huruf ditulis dengan Fredoka Medium 50 mm, isi abu muda `#f1ede6`, dan garis putus-putus `#8f877b`.
- Ada garis bantu atas dan bawah di tiap kartu. Teks "Tebalkan huruf di bawah ini" (y≈141) dan "Sudah? Ayo eja bersama Ayah/Bunda!" (y≈213).
- Data eja: `SYLLABLES = [{SA, [0,1], say [es,a,sa]}, {PI, [2,3], say [pe,i,pi]}]`, `WORD = {SAPI, say "sapi"}`.

### 4.4 QR code: posisi & fungsi
- **Posisi saat ini (prototipe):** pojok kanan bawah area konten, **x=157, y=236, ukuran 22×22 mm** (di sebelah kanan instruksi orang tua dan di atas marker BR, dengan jarak lebih dari 5 mm). Dibuat oleh `qr_svg(APP_URL, 157, 236, 22)` di `build_assets.py` (library Python `qrcode`, ECC level M, tanpa border tambahan karena halaman sudah putih).
- **Isi saat ini:** URL statis prototipe (artifact). Sudah diuji **tidak mengganggu deteksi marker** (detektor menolak pola QR karena bit-nya tidak valid).
- **Untuk produksi, QR harus berisi serial unik per pembeli.** Lihat bagian 6.

---

## 5. Arsitektur teknis prototipe (cara kerjanya)

### 5.1 Pipeline per foto/frame
1. **Downscale** untuk deteksi: foto ke lebar 1100 px (kalau kurang dari 4 marker, coba lagi di 1600 px). Video ke lebar 640 px.
2. **Deteksi marker**: `AR.Detector().detect(imageData)` dari js-aruco. **Patch penting** di `vendor/aruco-bundle.js`: ambang keliling kontur minimum diubah dari `width*0.20` menjadi `max(40, width*0.07)`. Tanpa patch ini, marker kecil di foto miring tidak terdeteksi.
3. **Korespondensi** (`core.correspondences`): pilih lembar dengan ID yang paling banyak cocok, buang ID duplikat (detektor kadang mengembalikan marker yang sama 2×), lalu tiap marker menyumbang 4 pasangan titik (mm halaman ↔ px gambar). Minimal 2 marker; kurang dari 4 memunculkan peringatan.
4. **Homografi** (`core.homography`): DLT least squares dengan normalisasi Hartley, h33=1, persamaan normal 8×8 diselesaikan dengan eliminasi Gauss. Galat reproyeksi di tes sekitar 1-1,6 px.
5. **Estimasi fokus** (`core.estimateFocal`): dari dua kendala ortogonalitas dan norma pada H dengan principal point di tengah. Dipakai hanya kalau 4 marker terbaca dan hasilnya di rentang 0,5-1,6× sisi terpanjang. Kalau tidak, default **f = 0,78 × sisi terpanjang** (setara FOV kamera HP utama ±26 mm).
6. **Pose** (`core.pose`): `K⁻¹H = λ[r1 r2 t]`, ortonormalisasi simetris r1/r2, `r3 = r1×r2`, lalu pastikan t_z > 0. Sumbu halaman: x kanan, y bawah, **z masuk ke kertas**. Jadi "ke atas dari kertas" = **−z**.
7. **Rektifikasi** (`core.rectify`): untuk tiap piece, sampling bilinear dari foto resolusi penuh (maks 2000 px) melalui H. **4 px/mm**, supersampling 2×2 di mode foto dan 1× di mode live.
8. **White balance** (`core.paperWhite` + `core.enhance`): estimasi putih kertas dari persentil 8% teratas piksel terang bersaturasi rendah, skala per kanal, angkat nilai mendekati putih ke putih, naikkan saturasi 1,18-1,25. Untuk huruf, tinta juga dipertegas.
9. **Mask**: piece hewan memakai PNG siluet hasil `build_assets.py` (base64 di config, putih = dipakai). Kartu huruf memakai rounded-rect yang digambar di canvas.

### 5.2 Rendering (three.js r128, UMD dari cdnjs)
- Kamera three: `fov = 2·atan(H/2/f)`, aspect = W/H gambar. Canvas WebGL ditumpuk tepat di atas `<img>`/`<video>` dengan ukuran sama, jadi piksel cocok 1:1.
- `pageRoot.matrix = diag(1,−1,−1) · [R|t]` (konversi konvensi OpenCV ke three.js). Semua objek didefinisikan dalam **mm halaman**.
- **Per piece** (`buildPieces`):
  - `hinge` (Group) di `(0, hingeY, 0)`, `rotation.order = "ZYX"`. `rotation.x = θ` melipat dari rata (0) ke berdiri. `rotation.z` = menoleh/bergoyang.
  - `front` = PlaneGeometry, tekstur gambar + alpha mask, `alphaTest 0.5`, **`side: BackSide`**. Normal plane +z mengarah ke dalam kertas, sedangkan kamera di sisi −z, sehingga yang terlihat kamera adalah sisi belakang mesh. Ini disengaja.
  - `back` = sisi belakang potongan berwarna kertas `#e9e3d8`, alphaMap = mask, `FrontSide`.
  - `hole` = siluet berwarna kertas (×0,93) dengan bayangan dalam di tepi atas, ditempel di kertas. Membuat ilusi "kertasnya sudah dipotong".
  - `shadow` = mask di-blur, hitam, rata di kertas di belakang garis tekuk. Panjangnya mengecil saat potongan berdiri. Opasitas 0,24 (hewan) dan 0,16 (huruf).
  - **Tekstur `flipY = false`**: baris 0 canvas = sisi atas box di halaman.
- **Animasi** (`animatePieces`): delay bertingkat 0,25 s + 0,16 s per piece, lipat 0,95 s dengan easeOutBack, lalu goyang ±5° pada 0,62 Hz dan putaran ±0,04 rad. `prefers-reduced-motion` mengecilkan goyangan. "Hop" = loncat 14 mm (hewan) / 9 mm (huruf) selama 0,55 s plus skala 1,07.
- **Sudut berdiri adaptif terhadap kamera** (penting): kalau foto diambil tegak lurus dari atas, potongan yang berdiri 70-90° akan terlihat sebagai garis tipis. Solusinya: hitung posisi kamera dalam koordinat halaman, sudut kamera di bidang lipat `eS = atan2(−vz, vy)`, lalu `θ = clamp(135° − eS, 25°, target)`. Target = 70° untuk hewan, 74° untuk huruf. Hewan juga **menoleh ke kamera** maksimal ±20° (hanya kalau kamera dari sisi bawah halaman). Di mode **Putar 3D**, sudut adaptif dimatikan supaya potongan berdiri tegak.
- **Ketukan**: Raycaster ke mesh `front`, `uv` diubah ke koordinat halaman `(bx + u·bw, by + v·bh)`, lalu dicocokkan ke area kaki. Drag lebih dari 7 px dianggap putar (mode 3D), bukan ketukan.
- **Mode kamera langsung**: deteksi per frame di 640 px, lalu **smoothing EMA (α 0,45) pada 4 sudut halaman yang diproyeksikan**, lalu H dihitung ulang dari 4 titik itu, lalu pose. Hilang lebih dari 450 ms membuat objek disembunyikan. Tombol "Hidupkan!" aktif kalau minimal 3 marker terlihat. Saat ditekan, frame resolusi penuh dideteksi ulang untuk potongan yang tajam. Setelah itu potongan tetap mengikuti kertas yang bergerak.
- **Suara**: `speechSynthesis` dengan `lang id-ID` (pilih voice `id-*` kalau ada), rate 0,82, pitch 1,15, dengan fallback timeout. **Produk akhir harus memakai rekaman suara asli per suku kata/kata.**

### 5.3 Batasan lingkungan
- **Artifact claude.ai memblokir `getUserMedia`**, jadi di sana hanya mode foto. Hosting sendiri harus **HTTPS** (`getUserMedia` butuh secure context). Video perlu `playsinline muted` untuk iOS (sudah ada).
- CDN three.js: `cdnjs …/three.js/r128/three.min.js`. Untuk produksi sebaiknya di-bundle sendiri (Vite) supaya tidak tergantung CDN.
- Ukuran 1 file HTML sekitar 505 KB (termasuk 2 foto demo JPEG ~150 KB base64 dan config dengan mask base64).

### 5.4 Status pengujian
- **[Pasti]** Lolos: 4 foto simulasi (lurus, miring kuat, terputar 90°, dua lembar) dengan 4/4 marker, galat 1-1,6 px, deteksi 60-120 ms di Node. Uji headless Chrome: alur demo, ketuk 4 kaki, eja, 3D tanpa error. Kamera langsung dengan feed palsu: 4/4 pojok terbaca, capture, potongan mengikuti. Lembar ber-QR tidak mengganggu deteksi.
- **[Menebak] / belum diuji:** kertas cetak asli + krayon asli + cahaya rumah; HP Android murah (performa deteksi live dan WebGL); iOS Safari; ketersediaan suara Bahasa Indonesia di berbagai HP; foto yang diambil dari sisi atas halaman (potongan akan menghadap menjauh, belum ditangani).

---

## 6. Anti-pembajakan (rancangan untuk versi produksi, BELUM diimplementasikan)

**Kebenaran yang tidak enak:** tidak ada sistem yang 100% anti-bajak. Tujuannya membuat pembajakan **merepotkan dan bisa dilacak**, sementara pembeli asli tetap merasa mudah. **[Pasti]**

### 6.1 Masalah
Sekali PDF beredar di grup WhatsApp, semua orang bisa mencetak dan memakai AR-nya. Marker pojok hanya mengidentifikasi **lembar**, bukan **pembeli**.

### 6.2 Lapisan pertahanan (urut prioritas)
1. **Produk utama buku cetak**, plus **kartu aktivasi** berisi serial unik (QR + kode 10-12 karakter, idealnya bisa digosok). Biaya fotokopi buku berwarna dan berkualitas cukup tinggi untuk menekan pembajakan.
2. **Serial unik per pembeli**, termasuk untuk PDF:
   - Saat checkout (Midtrans/TikTok/Shopee), server membuat `serial` (contoh `GH1-7K3Q-9XZD`), lalu **menghasilkan PDF khusus pembeli itu**. QR di setiap lembar berisi `https://<domain>/a/<serial>`, dan **watermark** nama/order ID samar di footer setiap halaman.
   - PDF disimpan di R2 dan dikirim lewat **signed URL berumur pendek**.
   - Serial ditandatangani (HMAC) supaya tidak bisa ditebak, atau dicek di tabel DB.
3. **Aktivasi terikat akun**: membuka `/a/<serial>` mengharuskan login (Auth.js Google, sudah ada di stack Kidpedia). Serial lalu terikat ke akun itu, dengan **batas perangkat** (misalnya 3 perangkat) dan batas akun (1 akun keluarga). Serial yang dipakai di banyak akun ditandai dan dibekukan.
4. **Konten AR hanya dikirim ke yang berhak**: config lembar (posisi piece, mask, data tugas, audio) **tidak dibundel di klien**. Setelah marker terdeteksi, klien meminta `GET /api/sheets/<sheetKey>` dengan sesi login, lalu server memeriksa entitlement (buku/level) sebelum mengirim. Tanpa entitlement, app menampilkan halaman "Aktifkan bukumu".
5. **Rate limit & log**: catat pemindaian per serial/akun/perangkat. Lonjakan dari banyak IP atau perangkat untuk satu serial adalah indikasi kebocoran.
6. **Watermark terlacak**: kalau PDF bocor, serial dan order ID di footer menunjukkan sumbernya.

### 6.3 Posisi QR di versi produksi
- Tetap di **x=157, y=236, 22 mm** pada setiap lembar (sudah teruji aman terhadap marker), berisi **URL aktivasi dengan serial**, bukan URL statis.
- Di **halaman sampul/halaman pertama** buku, tambahkan QR besar plus kode aktivasi tertulis (untuk orang tua yang tidak bisa scan).
- Untuk buku cetak massal (QR tidak bisa unik per halaman), QR di lembar berisi **URL app statis**, dan **serial unik hanya ada di kartu aktivasi** yang diselipkan.
- Jaga jarak QR minimal 5 mm dari marker pojok. Uji ulang deteksi setiap kali layout berubah (`node test/run.js`).

### 6.4 Skema data minimal (Postgres)
```
books(id, code, title, level)                          -- contoh: L1-SAPI
sheets(id, book_id, key, marker_ids int[4], config jsonb, audio jsonb)
orders(id, channel, external_ref, buyer_email, created_at)
serials(serial pk, book_id, order_id, status, max_devices, created_at)
activations(serial, user_id, device_id, activated_at, last_seen_at)
scan_events(id, user_id, device_id, serial, sheet_key, ip, created_at)
```

---

## 7. Rekomendasi arsitektur produksi (untuk dikerjakan di Claude Code)

- **Frontend scan app**: Vite + TypeScript (vanilla atau React), three.js sebagai dependency (bukan CDN), js-aruco tetap dibundel dengan patch `minPerimeterRatio`. Port `src/core.js` (fungsi murni, sudah teruji) dan logika `src/app.js` ke modul. PWA supaya bisa "dipasang" di HP. **Wajib HTTPS.**
- **Backend**: bisa satu VPS dengan Kidpedia (Biznet Neo) atau terpisah. Auth.js Google OAuth, Postgres, Cloudflare R2 (PDF, audio, mask), Midtrans (penjualan langsung). Webhook marketplace jika memungkinkan, atau serial dari kartu fisik.
- **Pipeline konten (paling penting untuk skala):** setiap "objek" didefinisikan dalam satu file data:
  - line art SVG (path, urutan gambar), siluet (otomatis dari path + margin 2,6 mm), area ketuk (kaki, mata, dll.), kata + suku kata + file audio, level.
  - build script menghasilkan lembar SVG/PDF (dengan marker ID dari alokator, QR, watermark), mask PNG, dan config JSON.
  - Contoh pola: `sheets.py` + `build_assets.py` di prototipe ini. Kembangkan menjadi katalog objek, bukan hardcode sapi.
- **Generator PDF per pesanan**: Python (rsvg-convert) atau Node (pdf-lib/svg2pdf) di worker. Buat sekali per order lalu cache di R2.
- **Audio**: rekam suara manusia (huruf, suku kata, kata, angka 1-20, pujian). Format OGG/MP3 kecil, preload per lembar.
- **Analitik**: event scan_success/fail (jumlah marker, waktu deteksi), waktu sampai potongan berdiri, penyelesaian tugas. Ini penting untuk menyetel ukuran marker dan instruksi.

---

## 8. Rencana konten berjenjang (draf)

- **Buku 1 / Level 1 (4-5 th):** 8-10 objek (hewan dan benda dekat), masing-masing 1 lembar mewarnai + 1 lembar tebalkan huruf, **memakai objek yang sama** (model/mask dipakai ulang). Kata KV-KV: SAPI, BOLA, KUDA, MATA, SAPU, BAJU, PITA, TOPI, PIPA, MEJA. Hitung 1-10 (kaki, bintik, roda, kelopak).
- **Buku 2 / Level 2 (5-6 th):** suku kata tertutup dan NG/NY (KUCING, KAMBING, BURUNG), penjumlahan sederhana (sapi 2 + ayam 1, jumlah kaki?).
- **Buku 3 / Level 3 (6-7 th):** kata 3 suku, kalimat pendek, pengurangan, dan potongan yang dipecah per bagian (kepala, kaki) dengan engsel masing-masing (gaya wayang/boneka kertas) supaya hewan bisa "berjalan".
- Setiap buku memakai mesin AR yang sama. Hanya data konten yang berbeda.

---

## 9. Hal teknis kecil yang penting diingat

1. **Patch js-aruco**: `findCandidates(contours, Math.max(40, image.width * (AR.minPerimeterRatio || 0.07)), 0.05, 10)`. Tanpa ini, foto miring gagal.
2. Detektor kadang mengembalikan ID yang sama 2×. Sudah ditangani di `correspondences` (dedupe).
3. js-aruco versi npm memakai `module.exports`/`require`. Bundel browser dibuat dengan menghapus baris itu dan membungkusnya dalam IIFE yang menulis `window.AR`/`window.CV`.
4. `flipY=false` di semua CanvasTexture. PlaneGeometry: vertex `+h/2` memakai `uv.v = 1` = baris bawah canvas = sisi bawah box di halaman.
5. Gambar depan potongan memakai `BackSide` (lihat 5.2). Jangan "diperbaiki" menjadi FrontSide.
6. Font: **Fredoka** (judul, huruf tebal) + **Nunito** (UI). Untuk rsvg/PDF, woff dari `@fontsource/fredoka` dikonversi ke TTF dengan fontTools, nama family di-set ke "Fredoka", lalu dipasang ke `~/.fonts` dan dijalankan `fc-cache -f`.
7. Foto dari input file: browser modern sudah menerapkan orientasi EXIF saat `drawImage`. Foto diperkecil ke sisi terpanjang maksimal 2000 px sebelum diproses.
8. Hinge = sisi bawah box mask. Box hewan dibuat cukup lebar (+14 mm lokal) supaya margin telinga tidak terpotong.
9. Foto yang diambil dari **sisi atas halaman** (terbalik) belum ditangani: potongan akan menghadap menjauh. Solusi yang mungkin: deteksi arah kamera, lalu putar hinge 180° atau lipat dari sisi atas.
10. Instruksi di lembar: "foto dari atas, 4 kotak hitam ikut terlihat, jangan warnai kotak hitam."

---

## 10. Langkah berikutnya yang disarankan (urut)

1. **Uji nyata dulu (paling penting):** cetak PDF, warnai dengan krayon, lalu foto dengan 3-5 HP Android murah dan 1 iPhone di cahaya rumah. Catat: jumlah marker terbaca, waktu proses, apakah potongan rapi. Sesuaikan ukuran marker (20 → 24 mm) jika perlu.
2. Port prototipe ke proyek Vite + TS, lalu hosting HTTPS untuk menguji kamera langsung di HP asli.
3. Rekam audio asli untuk SAPI (huruf, suku kata, kata, angka 1-4, pujian).
4. Bangun pipeline konten (katalog objek) dan buat 8-10 objek Level 1.
5. Backend aktivasi serial + gating config (bagian 6), lalu generator PDF per pesanan dengan QR serial + watermark.
6. Uji 5-10 keluarga selama 2 minggu, rekam reaksi untuk konten, lalu buka pre-order.

---

## 11. Prompt pembuka yang disarankan untuk sesi Claude Code

```
Baca CLAUDE.md di folder ini sampai habis, lalu jalankan:
npm install && node test/run.js
Pastikan 4 foto uji terdeteksi 4/4 marker. Setelah itu, ringkas pemahamanmu
dalam 5 poin dan usulkan struktur proyek produksi (Vite + TS untuk scan app,
backend aktivasi serial). Jangan menulis ulang core.js dari nol; port dan
tambahkan tes. Tugas pertama kita: [isi tugas, misalnya "port prototipe ke Vite + TS
dan siapkan hosting HTTPS untuk tes kamera langsung di HP"].
```
