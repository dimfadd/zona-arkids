# Katalog aktivitas · Roket Kertas

Daftar jenis aktivitas yang dipakai semua episode. Episode hanya boleh memakai kode dari katalog ini;
jenis baru ditambahkan di sini dulu (dengan kriteria uji) sebelum dipakai di storyboard.
Katalog ini juga **daftar komponen untuk tim teknis**: setiap jenis adalah satu komponen yang dapat
dipakai ulang dengan parameter, bukan kode khusus per episode.

## 0. Aturan umum (berlaku untuk semua jenis)

**Istilah**
- **Aktivitas** = satu jenis dari unsur baca, tulis, hitung, atau warnai. Inilah yang dihitung untuk
  aturan "10-16 aktivitas per episode" dan "baca/tulis/hitung masing-masing minimal 3 kali".
- **Momen ringan** (kode `RINGAN-...`) = selingan 15-30 detik tanpa jawaban salah. Tidak dihitung
  dalam 10-16, tetapi dicatat di tabel alur.
- **Ritual** (`RITUAL-SAPA`, `RITUAL-STIKER`) = pembuka dan penutup tetap. Tidak dihitung.
- **Berurutan** = dua aktivitas yang bersebelahan di tabel alur, dengan mengabaikan momen ringan dan
  batas babak. Dua aktivitas berurutan tidak boleh berkode sama.
- **Level 1-3** = tingkat kesulitan di dalam satu jenis. Ini berbeda dari "Tingkat 1" (kelompok usia
  4-5 tahun). Musim 1 memakai Level 1, dengan sedikit Level 2 di babak terakhir episode akhir musim.

**Perilaku yang sama di semua aktivitas berpenilaian**
- Instruksi dibacakan suara saat aktivitas dibuka. Tombol telinga (ikon, ≥ 44 px) memutar ulang.
- Salah pertama → bunyi lembut "blup" + gerak geleng/goyang pada benda yang dipilih + petunjuk lisan
  khusus jenis itu (lihat per jenis). Tidak ada tanda silang merah, tidak ada bunyi gagal yang keras.
- Salah kedua → jawaban benar disorot (denyut hijau #2b7a4b, 3 kali, lalu tetap bergaris hijau)
  sampai anak memilihnya. Anak selalu bisa menyelesaikan.
- Diam 8 detik tanpa sentuhan → instruksi diulang sekali. Diam 20 detik → petunjuk visual
  (tangan contoh menunjuk). Tidak ada batas waktu.
- Benar → bunyi "ting" lembut + kalimat pujian pendek yang menyebut isinya ("Empat kaki!"), bukan
  pujian umum. Tanpa skor, poin, bintang nilai, atau konfeti.
- Semua sasaran sentuh ≥ 44 px dan berjarak ≥ 44 px dari sasaran lain di layar 360 px. Benda 3D yang
  menjadi sasaran harus terlihat dari kamera adegan (diuji dengan raycast di E2E).

**Catatan hasil (untuk laporan orang tua, disimpan di localStorage saja)**
Setiap aktivitas berpenilaian menulis satu entri:
`{ episode, id_aktivitas, kode, level, isi, hasil: "lancar" | "dibantu" | "disorot", salah: n, detik: n }`
- `lancar` = benar tanpa salah, `dibantu` = benar setelah 1 salah, `disorot` = jawaban sempat disorot.
- Aktivitas yang tidak bisa dinilai mesin (lihat BACA-KETUK-SUKU) memakai `hasil: "diikuti"` dan
  opsional `ortu: "membaca sendiri" | "dibantu"` dari tombol di laci "Untuk Ayah/Bunda".

**Tidak dipakai di jenis mana pun:** pengenalan suara/mikrofon, mengetik, batas waktu, nyawa, skor.

## Ringkasan (26 jenis + 2 ritual)

| Unsur | Kode | Inti | Level di Musim 1 | Pertama dipakai | Komponen |
|---|---|---|---|---|---|
| Baca | BACA-KETUK-SUKU | ketuk kartu suku kata satu per satu, dengar gabungannya | 1 | E01 | ubah dari kartu RU MAH |
| Baca | BACA-SUSUN | seret/ketuk kartu suku kata menjadi kata | 1-2 | E01 | ada (`build`) |
| Baca | BACA-PILIH-BENDA | baca satu kartu kata, pilih benda/gambarnya | 1-2 | E01 | ada (`pick`) |
| Baca | BACA-LABEL | lihat satu benda, pilih label kata yang cocok | 1-2 | E02 | baru |
| Baca | BACA-DENGAR-PILIH | dengar kata/suku kata, pilih kartunya (tanpa gambar) | 1-2 | E07 | baru |
| Baca | BACA-LENGKAPI | kata dengan satu suku hilang, pilih suku kata pengisinya | 2 | E08 | baru |
| Tulis | TULIS-JALUR | geser jari mengikuti jalur (pra-menulis) | 1 | E01 | baru |
| Tulis | TULIS-TEBAL | tebalkan huruf/suku kata dengan arah goresan benar | 1-3 | E01 | baru (inti) |
| Tulis | TULIS-LENGKAPI | tebalkan satu huruf yang hilang di dalam kata | 1-2 | E01 | baru (pakai TULIS-TEBAL) |
| Tulis | TULIS-ANGKA | tebalkan lambang angka | 1-2 | E05 | baru (pakai TULIS-TEBAL) |
| Hitung | HITUNG-KETUK | ketuk benda satu per satu, lalu pilih jumlahnya | 1-2 | E01 | ada (`count`) |
| Hitung | HITUNG-SEKILAS | lihat kelompok sebentar, pilih jumlahnya tanpa mengetuk | 1-2 | E01 | baru |
| Hitung | HITUNG-AMBIL | seret sejumlah benda ke wadah, tekan "Sudah?" | 1-2 | E01 | baru |
| Hitung | HITUNG-URUT | ketuk lambang angka berurutan naik | 1-2 | E01 | baru |
| Hitung | HITUNG-MUNDUR | ketuk lambang angka berurutan turun | 1-2 | E02 | baru (varian HITUNG-URUT) |
| Hitung | HITUNG-SATU-LAGI | lihat n, satu ditambah (atau diambil), pilih jumlah baru | 1-2 | E02 | baru |
| Hitung | HITUNG-PASANG | pasangkan satu lawan satu, jawab cukup/kurang | 1-2 | E03 | baru |
| Hitung | HITUNG-BANDING | pilih kelompok yang lebih banyak/lebih sedikit | 1-2 | E04 | baru |
| Hitung | HITUNG-PILAH | pilah benda ke dua wadah menurut warna/bentuk, lalu hitung | 1-2 | E06 | baru (pakai HITUNG-AMBIL) |
| Warnai | WARNA-TOKOH | mewarnai tokoh/kendaraan penuh, warnanya pindah ke 3D | 1 | E01 | ada (sapi), perlu dibuat umum |
| Warnai | WARNA-BENDA-KECIL | mewarnai benda kecil 2-4 wilayah, ≤ 1 menit | 1 | E01 | baru (pakai papan mewarnai) |
| Warnai | WARNA-HITUNG | mewarnai tepat n wilayah dari beberapa | 1-2 | E09 | baru |
| Ringan | RINGAN-TOMBOL | ketuk satu tombol/tokoh, sesuatu terjadi | - | E01 | baru (kecil) |
| Ringan | RINGAN-SERET | seret benda di jalur tetap (turun, geser, putar) | - | E01 | baru |
| Ringan | RINGAN-GOSOK | gosok/usap wilayah sampai bersih atau terisi | - | E01 | baru |
| Ringan | RINGAN-CARI | ketuk tempat sembunyi sampai benda ditemukan | - | E02 | baru |
| Ritual | RITUAL-SAPA | tokoh menyapa dan menyebut tujuan | - | E01 | baru |
| Ritual | RITUAL-STIKER | penutup: stiker + cap baca/tulis/hitung | - | E01 | ada (stiker), perlu cap |

Jumlah: Baca 6, Tulis 4, Hitung 9, Warnai 3, Ringan 4 = **26 jenis**.

---

## 1. BACA (metode suku kata, SAS)

Aturan bersama: kartu suku kata memakai Andika kapital, tinggi huruf ≥ 48 px, warna suku bergantian
seperti papan RU MAH (`wordTexture`). Level 1 hanya kata KV-KV. Suara selalu menyebut bunyi suku
kata ("sa"), bukan nama huruf, kecuali orang tua mengubahnya di pengaturan.

### BACA-KETUK-SUKU
- **Unsur:** baca (mengenal dan memadukan suku kata).
- **Cara main:** 2-3 kartu suku kata di layar atau di benda 3D (kalung, papan, badan roket). Anak
  mengetuk kartu dari kiri ke kanan. Tiap ketukan memutar bunyi suku kata itu dan kartu menyala.
  Setelah kartu terakhir, suara memadukan: "sa... pi... sapi!"
- **Varian jeda (dipakai di akhir episode):** sebelum suara memadukan, ada jeda 2 detik dan teks kecil
  di laci orang tua: "Tunggu, biarkan anak membaca dulu."
- **Cara menilai:** mesin hanya bisa menilai urutan ketuk. Kartu yang bukan berikutnya diketuk →
  dianggap salah urutan. Membaca sendiri tidak bisa dinilai mesin: hasil `diikuti`; orang tua boleh
  menekan "Anak membaca sendiri" atau "Dibantu" di laci (dinilai orang tua).
- **Salah:** "Kita mulai dari kiri, ya." Kartu paling kiri yang belum diketuk berdenyut.
  2 kali salah → kartu berikutnya disorot terus sampai urutan selesai.
- **Level:** 1 = 2 kartu, bunyi tiap kartu diputar. 2 = 3 kartu (kata 3 suku KV, mis. KE·LA·PA). 3 = kartu tanpa bunyi per suku; bunyi hanya setelah kata lengkap.
- **Durasi:** 30-45 detik.
- **Komponen:** ubah dari kartu RU MAH (`wordTexture` di `world.ts`, `tapCard` di `app.ts`): kartu
  harus bisa ditempel di benda 3D sebagai bagian yang bisa diketuk, dan menerima daftar suku kata.
- **Uji:** ketuk kanan dulu → tidak memutar kata; ketuk berurutan → event `selesai` dengan urutan
  benar; varian jeda menunggu ≥ 2 detik sebelum memutar kata.

### BACA-SUSUN
- **Unsur:** baca (memadukan dan mengurutkan suku kata).
- **Cara main:** 2-3 slot kosong + 3-4 kartu acak (termasuk 1 pengecoh). Anak mengetuk kartu (kartu
  terbang ke slot kosong pertama) atau menyeretnya ke slot. Kartu di slot bisa diketuk untuk kembali.
- **Cara menilai:** isi slot sama dengan urutan target.
- **Salah:** kartu yang salah kembali ke tempatnya, suara menyebut bunyinya: "Itu bu. Cari yang lain."
  2 kali salah → kartu benar berikutnya disorot.
- **Level:** 1 = 2 slot, 1 pengecoh yang bunyinya jauh beda. 2 = 2-3 slot, pengecoh yang mirip
  (SA vs SU). 3 = tanpa contoh audio di awal.
- **Durasi:** 45-60 detik.
- **Komponen:** ada (`kind: "build"`, papan RU MAH). Perlu: dukungan seret selain ketuk, 3 slot.
- **Uji:** kartu pengecoh tidak pernah diterima; dua salah memicu sorot; kata selesai memicu event.

### BACA-PILIH-BENDA
- **Unsur:** baca (memahami arti kata).
- **Cara main:** satu kartu kata besar (2 suku) di atas; 3 benda di dunia 3D atau 3 tombol gambar di
  bawah. Anak membaca kartu lalu memilih benda yang namanya tertulis.
- **Cara menilai:** benda yang dipilih = benda target.
- **Salah:** suara menyebut benda yang dipilih lalu suku yang membedakan: "Itu bola. Coba baca lagi:
  sa... pu." Kalau pengecoh adalah kata mirip (SAPI vs SAPU), sebut suku yang berbeda.
  2 kali salah → benda benar disorot.
- **Level:** 1 = mengetuk kartu memutar bunyi suku kata (bantuan). 2 = kartu tidak berbunyi sampai
  benda dipilih; pengecoh dengan suku pertama sama.
- **Durasi:** 30-45 detik.
- **Komponen:** ada (`kind: "pick"`, sapu/bola/topi). Perlu: daftar benda sebagai parameter, tombol
  gambar sebagai cadangan bila benda 3D kecil.
- **Uji:** pilihan 3D dan tombol gambar menghasilkan event yang sama; pengecoh mirip menghasilkan
  petunjuk suku yang berbeda.

### BACA-LABEL
- **Unsur:** baca (mencocokkan benda dengan tulisan). Arah kebalikan BACA-PILIH-BENDA: satu benda,
  beberapa tulisan.
- **Cara main:** satu benda (atau permintaan bergambar) ditunjukkan; 3 wadah/pintu/kotak berlabel
  kata. Anak mengetuk label yang cocok, lalu bendanya masuk ke wadah itu.
- **Cara menilai:** label yang dipilih = label target.
- **Salah:** "Itu sa... pu, sapu. Cari yang dimulai dengan ba." 2 kali salah → label benar disorot.
- **Level:** 1 = pengecoh berbeda di suku pertama. 2 = pengecoh berbeda hanya di suku kedua.
- **Durasi:** 30-45 detik.
- **Komponen:** baru: wadah 3D dengan label `wordTexture` yang bisa diketuk + animasi benda masuk.
- **Uji:** label dan wadah adalah satu sasaran ≥ 44 px; urutan label diacak tiap main.

### BACA-DENGAR-PILIH
- **Unsur:** baca (mengenali tulisan dari bunyi, tanpa bantuan gambar).
- **Cara main:** suara menyebut kata atau suku kata ("ru... sa"); 2-3 kartu tulisan. Anak mengetuk
  kartu yang sesuai. Kartu **tidak** berbunyi saat disentuh sebelum dipilih (kalau berbunyi, soalnya
  jadi mencocokkan bunyi, bukan membaca).
- **Cara menilai:** kartu yang dipilih = kartu target.
- **Salah:** suara mengulang target pelan per suku, lalu membaca kartu yang salah: "Ini ka... ra.
  Kita cari ru... sa." 2 kali salah → kartu benar disorot.
- **Level:** 1 = 2 kartu, beda suku pertama. 2 = 3 kartu. 3 = beda hanya satu huruf (RUSA/RASA).
- **Durasi:** 30-45 detik.
- **Komponen:** baru, memakai kartu BACA-KETUK-SUKU dengan bunyi dimatikan.
- **Uji:** menyentuh kartu tidak memutar suara sebelum pilihan; tombol telinga memutar ulang target.

### BACA-LENGKAPI
- **Unsur:** baca (suku kata di dalam kata).
- **Cara main:** gambar benda + kata dengan satu slot kosong (BU·__). 3 kartu suku kata. Anak memilih
  kartu pengisi; kata lengkap dibacakan.
- **Cara menilai:** kartu = suku yang hilang.
- **Salah:** suara membaca kata dengan suku yang salah ("bu... ka? Bu-ka. Itu bukan gambar ini.")
  2 kali salah → kartu benar disorot.
- **Level:** 2 (dipakai mulai akhir Musim 1). 1 hanya bila slot di suku kedua dan gambar sangat jelas.
- **Durasi:** 30-45 detik.
- **Komponen:** baru, gabungan BACA-SUSUN (slot) dan BACA-PILIH-BENDA (gambar).
- **Uji:** hanya satu slot; slot yang terisi salah kembali kosong.

## 2. TULIS (menebalkan dengan arah goresan)

Aturan bersama: kanvas tulis 2D (garis buku tulis biru #2f5fa8), huruf kapital setinggi ≥ 60% tinggi
kanvas. Bisa jari atau pen (pengaturan yang sudah ada `setMode`). Warna tinta = krayon yang dipilih
anak. Tulisan anak disimpan sebagai gambar kecil (PNG di localStorage, ≤ 30 KB) untuk laporan dan
dipasang ke benda 3D (papan, badan roket, bendera). **Urutan goresan setiap huruf disahkan guru TK
sebelum dibangun** (lihat SOP bagian 3).

### TULIS-JALUR
- **Unsur:** tulis (pra-menulis: garis lurus, lengkung, zig-zag, spiral).
- **Cara main:** jalur titik-titik lebar (koridor ≥ 56 px) dari titik mulai hijau ke tujuan. Tokoh
  (sapi, roket, bola) ikut bergerak di ujung jari sepanjang jalur.
- **Cara menilai:** jari mencapai ujung jalur dengan ≥ 80% titik sampel di dalam koridor. Jari keluar
  koridor → tokoh berhenti dan menunggu; tidak dianggap salah.
- **Salah:** tidak ada salah. Lepas jari di tengah → tokoh menunggu; mulai lagi dari posisi tokoh.
  Keluar koridor 3 kali → koridor melebar 1,5× dan tangan contoh menunjukkan arah (hasil `dibantu`).
- **Level:** 1 = lurus atau satu lengkung. 2 = lengkung S, zig-zag. 3 = spiral, jalur lebih sempit.
- **Durasi:** 30-45 detik.
- **Komponen:** baru: jalur dari path SVG, sampel jari, tokoh mengikuti parameter jarak di jalur.
- **Uji:** tidak mungkin "maju" tanpa jari di koridor; selesai hanya di ujung jalur.

### TULIS-TEBAL
- **Unsur:** tulis (huruf atau suku kata 1-2 huruf).
- **Cara main:** kerangka huruf garis putus-putus, titik mulai hijau, panah arah, nomor goresan.
  Sebelum mulai, animasi 2 detik menunjukkan goresan pertama. Anak menebalkan goresan satu per satu;
  goresan yang benar menjadi tebal berwarna krayon, lalu goresan berikutnya muncul.
- **Cara menilai (per goresan):** mulai dalam radius 12% tinggi huruf dari titik mulai; melewati
  semua titik periksa goresan itu secara berurutan; simpangan ≤ 12% tinggi huruf; berakhir dalam
  radius 12% dari titik akhir. Arah terbalik = salah.
- **Salah:** goresan memudar, titik mulai berdenyut, "Coba mulai dari titik hijau." atau "Ikuti
  panahnya." 2 kali salah pada goresan yang sama → tangan contoh menggambar goresan itu, lalu jalur
  ditebalkan samar dan toleransi dilipat dua; anak menelusurinya (selalu bisa selesai).
- **Level:** 1 = putus-putus + panah + nomor + contoh animasi. 2 = putus-putus + titik mulai, tanpa
  panah. 3 = hanya titik mulai dan bayangan huruf sangat samar; dipakai untuk kata utuh (E10).
- **Durasi:** 45-75 detik per huruf.
- **Komponen:** baru, **komponen inti** dipakai TULIS-LENGKAPI dan TULIS-ANGKA. Data huruf = daftar
  goresan, tiap goresan polyline + titik periksa. Huruf Musim 1: S A T O K U L E R I P M D B J.
- **Uji:** untuk setiap huruf, rekaman goresan benar lulus, goresan terbalik gagal, goresan dari ujung
  salah gagal, goresan acak gagal; data simpangan disimpan untuk laporan.

### TULIS-LENGKAPI
- **Unsur:** tulis (huruf di dalam kata yang bermakna di cerita).
- **Cara main:** kata ditampilkan di benda (papan nama, bendera), satu huruf berupa kerangka
  putus-putus. Layar beralih ke kanvas tulis dengan huruf lain di kata itu tetap terlihat sebagai
  konteks. Setelah selesai, kata lengkap dipasang kembali di benda 3D dan dibacakan.
- **Cara menilai, salah, sorot:** sama dengan TULIS-TEBAL.
- **Level:** 1 = panduan penuh seperti TULIS-TEBAL Level 1. 2 = tanpa panah.
- **Durasi:** 45-75 detik.
- **Komponen:** TULIS-TEBAL + tampilan kata konteks + pemasangan tekstur tulisan ke bagian 3D.
- **Uji:** huruf konteks tidak bisa ditulisi; hasil tertempel di bagian 3D yang benar.

### TULIS-ANGKA
- **Unsur:** tulis (lambang angka 1-9).
- **Cara main, menilai, salah:** sama dengan TULIS-TEBAL, untuk angka. Selalu didahului soal hitung
  yang jawabannya angka itu (menulis jumlah yang baru dihitung).
- **Level:** 1 = 1, 4, 7 (garis lurus) dan 0. 2 = 2, 3, 5, 6, 8, 9.
- **Durasi:** 40-60 detik.
- **Komponen:** TULIS-TEBAL dengan data goresan angka.
- **Uji:** sama dengan TULIS-TEBAL.

## 3. HITUNG

Aturan bersama: setiap soal jumlah berakhir dengan anak **memilih** jumlahnya dari baris tombol
angka (Andika, ≥ 56 px). Badge angka kecil muncul di benda yang sudah diketuk/dipindah (yang ada).
Tombol angka berisi 4-5 pilihan berurutan yang memuat jawaban (fungsi `choices` yang ada).

### HITUNG-KETUK
- **Unsur:** hitung (korespondensi satu-satu + kardinalitas).
- **Cara main:** anak mengetuk setiap benda satu kali; suara menyebut bilangan; badge muncul. Setelah
  semua diketuk: "Jadi, ada berapa?" lalu memilih angka.
- **Cara menilai:** angka pilihan = jumlah benda. Benda yang sudah diketuk tidak dihitung dua kali.
- **Salah:** "Hmm, coba lihat angka terakhir yang kamu sebut." 2 kali salah → tombol benar disorot.
- **Level:** 1 = 1-5 benda tersebar jelas. 2 = 6-10 benda, sebagian berdekatan.
- **Durasi:** 45-60 detik.
- **Komponen:** ada (`kind: "count"`, `countOne`, `chooseNumber`). Perlu: target sebagai parameter
  (daftar bagian 3D), bukan hanya kaki/tanduk/mangga.
- **Uji:** yang ada di `e2e/play.mjs` (raycast terlihat, jarak ≥ 44 px), diperluas ke target baru.

### HITUNG-SEKILAS
- **Unsur:** hitung (subitisasi: mengenali jumlah kecil tanpa menghitung).
- **Cara main:** kelompok benda tampil atau disorot selama waktu tertentu, lalu diredupkan. Anak memilih
  jumlahnya dari tombol 1-4 (atau 1-6 untuk pola dadu).
- **Cara menilai:** pilihan = jumlah.
- **Salah:** pertama → "Kita lihat sekali lagi, ya." Benda tampil 2× lebih lama. Kedua → beralih ke
  HITUNG-KETUK pada benda yang sama (tanpa hukuman), lalu tombol benar disorot setelah ketuk selesai.
- **Level:** 1 = 2-3 benda, tampil 2,5 detik. 2 = 4 benda atau pola dadu 1-6, 1,5 detik.
- **Durasi:** 20-40 detik.
- **Komponen:** baru: timer tampil/redup + jatuh ke mode ketuk.
- **Uji:** tombol angka tidak aktif sebelum benda diredupkan; salah kedua memicu mode ketuk.

### HITUNG-AMBIL
- **Unsur:** hitung (membuat himpunan berjumlah n; lebih sulit daripada menghitung yang ada).
- **Cara main:** 5-7 benda di sumber, satu wadah dengan zona jatuh ≥ 88 px. Suara: "Ambil dua."
  Anak menyeret benda ke wadah; tiap benda di wadah diberi badge 1, 2, ... Benda di wadah bisa diseret
  keluar. Anak menekan tombol centang "Sudah?" di wadah.
- **Cara menilai:** isi wadah = n saat "Sudah?" ditekan.
- **Salah:** kurang → "Baru satu. Budi minta dua." Lebih → "Coba hitung isinya. Dua saja." Benda
  tidak dibuang otomatis. 2 kali salah → n benda di wadah disorot hijau, sisanya kembali sendiri,
  "Satu, dua. Dua. Pas!"
- **Level:** 1 = n 1-5. 2 = n 6-10 atau dua permintaan berturut ("dua merah, satu kuning").
- **Durasi:** 45-75 detik.
- **Komponen:** baru: seret benda 3D ke zona jatuh, badge, tombol "Sudah?".
- **Uji:** zona jatuh menerima benda yang dilepas di dalamnya saja; badge selalu urut 1..k.

### HITUNG-URUT
- **Unsur:** hitung (lambang angka dan urutan naik).
- **Cara main:** di tiap langkah ada 2-3 benda bernomor (batu, kursi, balon). Anak mengetuk nomor
  berikutnya mulai dari 1. Tokoh bergerak ke benda yang benar. Setelah tiap langkah suara bertanya
  "Sekarang nomor...?" lalu diam 2 detik sebelum menyebut jawabannya.
- **Cara menilai:** ketukan = nomor berikutnya.
- **Salah:** benda goyang, "Itu nomor tiga. Kita cari nomor dua." 2 kali salah → nomor benar berdenyut.
- **Level:** 1 = 1-5, 2 pilihan per langkah. 2 = 1-10, 3 pilihan. 3 = mulai dari angka tengah
  ("lanjutkan dari 4").
- **Durasi:** 60-90 detik.
- **Komponen:** baru: deret sasaran bernomor (tekstur angka Andika) + gerak tokoh antar sasaran.
- **Uji:** pasangan per langkah tidak pernah berisi dua nomor yang sama; sasaran ≥ 44 px dan terpisah.

### HITUNG-MUNDUR
- **Unsur:** hitung (urutan turun).
- **Cara main:** panel 2D dengan tombol angka 1-n diacak posisinya. Anak mengetuk dari n turun ke 1.
  Setiap ketukan benar menambah efek (getar, asap). Setelah 1, satu tombol aksi terbuka.
- **Cara menilai, salah, sorot:** seperti HITUNG-URUT dengan urutan terbalik. "Setelah empat, kita
  sebut tiga."
- **Level:** 1 = 5 ke 1. 2 = 10 ke 1.
- **Durasi:** 45-75 detik.
- **Komponen:** varian HITUNG-URUT (parameter arah) dengan tampilan panel 2D.
- **Uji:** tombol aksi terkunci sampai urutan selesai.

### HITUNG-SATU-LAGI
- **Unsur:** hitung (jembatan ke penjumlahan/pengurangan, tanpa tanda + atau -).
- **Cara main:** n benda sudah dihitung. Satu benda datang (atau pergi) dengan animasi jelas. Suara:
  "Tadi empat... satu lagi... jadi berapa?" Anak memilih angka.
- **Cara menilai:** pilihan = n + 1 (atau n - 1).
- **Salah:** "Kita hitung semuanya, ya." Beralih ke HITUNG-KETUK pada semua benda. 2 kali salah →
  tombol benar disorot.
- **Level:** 1 = tambah satu, n ≤ 4. 2 = kurang satu, atau n sampai 9.
- **Durasi:** 30-45 detik.
- **Komponen:** baru (kecil): animasi datang/pergi + baris angka yang ada.
- **Uji:** jawaban n (tanpa perubahan) dihitung salah; mode ketuk menghitung semua benda.

### HITUNG-PASANG
- **Unsur:** hitung (satu lawan satu, "sama banyak", "cukup atau kurang").
- **Cara main:** baris slot (kursi, piring, bunga) dan sekumpulan benda. Anak menyeret satu benda ke
  setiap slot. Lalu pertanyaan bergambar dua tombol: "Cukup?" (centang) atau "Kurang" (tanda tanya
  bergambar slot kosong). Level 2: "Ada berapa kursi kosong?" dengan tombol angka.
- **Cara menilai:** jawaban cukup/kurang atau jumlah slot kosong sesuai keadaan.
- **Salah:** "Lihat, ada kursi yang masih kosong?" (slot kosong berkedip). 2 kali salah → jawaban disorot.
- **Level:** 1 = 3-6 slot, satu benda per slot. 2 = bingkai sepuluh (2 × 5 slot), tanya yang kosong.
- **Durasi:** 45-75 detik.
- **Komponen:** baru, memakai seret + zona jatuh HITUNG-AMBIL (satu benda per zona).
- **Uji:** satu slot hanya menerima satu benda; jawaban tergantung keadaan akhir, bukan jumlah tetap.

### HITUNG-BANDING
- **Unsur:** hitung (lebih banyak, lebih sedikit, sama).
- **Cara main:** dua kelompok di dua wadah. "Mana yang lebih banyak?" Anak mengetuk wadahnya. Level 2
  boleh menambah tombol "sama".
- **Cara menilai:** wadah yang dipilih sesuai.
- **Salah:** "Kita pasangkan satu-satu, yuk." Benda dari dua wadah berbaris berpasangan; yang tidak
  punya pasangan berkedip. 2 kali salah → wadah benar disorot.
- **Level:** 1 = selisih ≥ 3, total ≤ 10. 2 = selisih 1-2 atau sama.
- **Durasi:** 30-45 detik.
- **Komponen:** baru: dua wadah bisa diketuk + animasi berbaris berpasangan.
- **Uji:** posisi wadah benar diacak kiri/kanan; ukuran benda sama di dua wadah (tidak menipu).

### HITUNG-PILAH
- **Unsur:** hitung (mengelompokkan lalu menghitung).
- **Cara main:** 6-10 benda dengan dua warna (atau bentuk). Anak menyeret ke dua wadah bergambar warna.
  Lalu "Ada berapa kerang kuning?" memilih angka.
- **Cara menilai:** semua benda di wadah warnanya; jumlah pilihan = isi wadah yang ditanya.
- **Salah:** benda di wadah salah memantul keluar, "Ini merah. Wadahnya di sini." Jumlah salah seperti
  HITUNG-KETUK. 2 kali salah → sorot.
- **Level:** 1 = 2 warna jauh beda, 6 benda. 2 = 2 bentuk, 10 benda.
- **Durasi:** 60-90 detik.
- **Komponen:** HITUNG-AMBIL dengan dua zona dan aturan terima per warna.
- **Uji:** wadah menolak benda yang tidak sesuai; warna dibedakan juga oleh bentuk/pola (buta warna).

## 4. WARNAI

Aturan bersama: papan mewarnai buku tulis yang ada (10 krayon, kuas besar/kecil, penghapus, urungkan,
hapus semua). Semua warna benar; tidak ada salah. Warna dominan per wilayah dibaca dan dipakai di 3D
atau di cerita (toon, cahaya total ≈ 1).

### WARNA-TOKOH
- **Unsur:** warnai (tokoh utama atau kendaraan; hasilnya jadi 3D).
- **Cara main:** gambar garis penuh layar dengan 6-10 wilayah. Tombol merah "Selesai" aktif setelah
  ≥ 50% luas berwarna; di 70% suara memuji dan mengingatkan tombol merah.
- **Cara menilai:** tidak ada benar/salah. Dicatat: lama, jumlah warna dipakai, % luas.
- **Salah:** tekan selesai terlalu cepat → "Warnai dulu sedikit lagi, ya." Wilayah yang belum
  berwarna sedikit berkedip.
- **Durasi:** 1,5-2,5 menit (tidak dibatasi).
- **Komponen:** ada untuk sapi (`ColoringBoard`, `cow-art.ts`). Perlu dibuat umum: gambar garis +
  daftar wilayah sebagai data (roket, kupu-kupu, perahu, kuda, kura-kura) dan pemetaan wilayah ke
  bagian 3D.
- **Uji:** warna wilayah di 3D = warna dominan di 2D (sudah dicek E2E untuk sapi; diperluas per aset).

### WARNA-BENDA-KECIL
- **Unsur:** warnai (benda pendukung: bendera, atap, kalung, baju).
- **Cara main:** gambar garis 2-4 wilayah di panel setengah layar (dunia 3D tetap terlihat di atas),
  kuas besar saja, 6 krayon. Tombol "Selesai" aktif di ≥ 40% luas.
- **Cara menilai:** tidak ada benar/salah.
- **Durasi:** 45-75 detik.
- **Komponen:** baru: mode panel dari papan mewarnai yang ada.
- **Uji:** panel tidak menutupi benda 3D yang sedang diwarnai; warna langsung tampil di benda 3D.

### WARNA-HITUNG
- **Unsur:** warnai + hitung ("warnai tiga titik").
- **Cara main:** 5-8 wilayah kecil sejenis (titik sayap, lilin, balon). "Warnai tiga." Lalu "Sudah?"
- **Cara menilai:** jumlah wilayah dengan ≥ 60% luas berwarna = n.
- **Salah:** kurang/lebih seperti HITUNG-AMBIL; wilayah berlebih bisa dihapus dengan penghapus.
  2 kali salah → n wilayah ditandai garis hijau.
- **Level:** 1 = n ≤ 5. 2 = dua warna ("dua merah, satu biru").
- **Durasi:** 45-75 detik.
- **Komponen:** baru: papan mewarnai + penghitung wilayah terwarnai.
- **Uji:** wilayah yang hanya tergores sedikit (< 60%) tidak dihitung.

## 5. RINGAN (selingan 15-30 detik, tanpa salah)

Tidak berpenilaian, tidak menulis hasil (hanya detik). Fungsinya menurunkan ritme setelah aktivitas
berpikir dan memberi rasa "aku yang menggerakkan".

| Kode | Cara main | Contoh | Komponen |
|---|---|---|---|
| RINGAN-TOMBOL | ketuk satu tombol besar atau tokoh; animasi/bunyi terjadi | luncurkan roket, sapi "mooo" dan melompat, tancap bendera | baru (kecil): sasaran ketuk + pemicu animasi |
| RINGAN-SERET | seret benda di jalur tetap (1 sumbu atau busur); dilepas → benda diam menunggu | roket turun ke landasan, keranjang ke Budi, memutar sapi | baru; memutar sapi sudah ada (`bindTaps`) |
| RINGAN-GOSOK | usap wilayah; kemajuan dari luas yang tersapu; selesai di 70% | sapu daun, lap debu, siram bunga | baru: topeng luas tersapu |
| RINGAN-CARI | ketuk 2-4 tempat sembunyi; ketukan kedua selalu menemukan | kawah bulan, semak, bawah meja | baru (kecil) |

## 6. RITUAL (tetap di setiap episode)

- **RITUAL-SAPA** (20-30 detik): halaman buku tulis sebagai panggung; tokoh pemandu menyapa dengan
  nama anak bila sudah diisi orang tua, lalu menyebut tujuan dalam satu kalimat ("Hari ini kita
  antar sapi ke kandang Budi."). Peta kecil berisi 3-4 titik (satu per babak) tampil 3 detik.
  Saat melanjutkan dari titik simpan: sapaan pendek "Kita lanjut, ya. Tadi sampai di sungai."
- **RITUAL-STIKER** (40-60 detik): hasil warna anak menjadi stiker di kebun stiker; tiga cap bergambar
  (buku = membaca, pensil = menulis, jari = menghitung) muncul satu per satu, tanpa angka; suara
  menyebut isi yang dipelajari ("Hari ini kamu membaca SAPI dan SAPU..."); cuplikan episode berikut.
- **Titik simpan** di akhir setiap babak: kemajuan dan warna disimpan di localStorage. Layar jeda
  memberi dua tombol bergambar: "Lanjut" dan "Istirahat dulu". Tanpa hitung mundur otomatis.

## 7. Urutan bangun yang disarankan
1. Untuk E01 (wajib): RITUAL-SAPA, RITUAL-STIKER (cap), titik simpan, HITUNG-SEKILAS, HITUNG-AMBIL,
   HITUNG-URUT, BACA-KETUK-SUKU, TULIS-JALUR, TULIS-TEBAL, TULIS-LENGKAPI, WARNA-BENDA-KECIL,
   RINGAN-TOMBOL, RINGAN-SERET, RINGAN-GOSOK. Ubah: HITUNG-KETUK, BACA-SUSUN, BACA-PILIH-BENDA,
   WARNA-TOKOH menjadi berparameter.
2. Untuk E02: HITUNG-MUNDUR, HITUNG-SATU-LAGI, BACA-LABEL, RINGAN-CARI.
3. Sisanya mengikuti episode pertama yang memakainya (lihat tabel ringkasan).

[Kemungkinan Besar] TULIS-TEBAL adalah pekerjaan terbesar (pengenal goresan + data 15 huruf + toleransi
yang terasa adil untuk anak 4 tahun); perlu diuji ke anak sebelum data semua huruf dibuat.
