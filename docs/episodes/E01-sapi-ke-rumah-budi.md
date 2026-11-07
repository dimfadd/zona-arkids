# E01 · Sapi ke Rumah Budi

Tingkat 1 (4-5 tahun) · Musim 1, episode pertama · Revisi dari prototipe `apps/scan/index.html`

## 1. Ringkasan
Anak mewarnai seekor sapi kecil. Sapi itu hidup dalam 3D dan diundang Budi untuk tinggal di kandang
barunya. Di perjalanan sapi memetik mangga untuk Budi, takut menyeberangi sungai kecil sampai anak
membantunya lewat batu bernomor, lalu di rumah Budi anak menulis nama SAPI di papan kandang dan
membantu Ibu menyapu kandang. Episode ditutup malam hari: sapi tidur di kandang bernama tulisan anak.

- **Tokoh:** sapi buatan anak (tokoh utama, tidak bicara, hanya "mooo"), Budi (anak laki-laki ±6 th),
  Ibu (ibu Budi). Narator: suara perempuan hangat.
- **Tujuan cerita untuk anak:** "Antar sapimu ke kandang barunya di rumah Budi."
- **Ketegangan kecil:** sapi takut menyeberang sungai (adegan 4). Penyelesaian: anak menunjukkan batu
  yang benar, sapi berhasil dan menjadi berani.
- **Durasi:** 11-15 menit (anak cepat ±10 menit). Ada titik simpan otomatis setelah adegan 5, jadi
  boleh dilanjutkan besok tanpa mengulang.

## 2. Tujuan belajar
| Bidang | Isi |
|---|---|
| Membaca (SAS) | Suku kata SA, PI, PU. Kata **SAPI**, **SAPU** (KV-KV). Membedakan SAPI dan SAPU dari suku kedua. RUMAH tetap kata tujuan yang disusun dari kartu RU + MAH dan dibacakan (MAH suku tertutup, tidak dituntut dibaca sendiri). |
| Menulis | Menebalkan huruf **S** (1 goresan) dan **A** (3 goresan) menjadi suku kata SA di papan nama kandang. |
| Berhitung | Rentang 1-5. Lima jenis soal: hitung ketuk lalu pilih (kaki 4, mangga 3-5), lihat sekilas/subitisasi (tanduk 2), mengambil sejumlah benda (2 mangga ke keranjang), mengenali lambang angka berurutan 1-5 (batu sungai). |
| Sosial-emosional | Menolong teman yang takut (sapi), berterima kasih (Budi, Ibu). |

**Kaitan:** ini episode pertama, jadi semua mekanik dikenalkan di sini (mewarnai, hitung-ketuk, kartu
suku kata, menebalkan). E02 (Astronot Roket Kertas) memakai ulang SAPI/SAPU sebagai kartu pengecoh,
menambah huruf T dan O, dan membalik urutan hitung (hitung mundur 5-1). Adegan terakhir E01 memberi
cuplikan roket kertas yang melintas di langit malam.

## 3. Adegan

### Adegan 1 · Sapi tanpa warna (±2,5 menit)
- **Latar & kamera:** layar mewarnai 2D (halaman buku tulis: garis biru, margin merah). Tidak ada 3D.
- **Narasi:**
  - "Halo! Ini sapi kecil. Dia belum punya warna."
  - "Ayo warnai sapimu. Pilih krayon, lalu gosok di gambarnya."
  - Setelah ±70% wilayah berwarna: "Wah, sapimu cantik. Ketuk tombol merah kalau sudah selesai."
  - Jika anak menekan selesai terlalu cepat: "Warnai dulu sapinya, ya."
- **Aktivitas:** mewarnai bebas (10 krayon, kuas besar/kecil, penghapus, urungkan, hapus semua).
- **Jawaban benar:** tidak ada; semua warna benar.
- **Aset:** dipakai ulang (`cow-art.ts`, `coloring.ts`). Tidak ada aset baru.
- **Untuk Ayah/Bunda:** "Sebelum mulai, tanya: sapi yang pernah kamu lihat warnanya apa? Biarkan anak
  memilih warna apa saja, sapi ungu juga boleh."

### Adegan 2 · Halo, Sapi! (±2 menit)
- **Latar & kamera:** padang rumput di awal jalan. Kamera `sapi` (setengah badan, bisa diputar geser),
  lalu `kaki` (samping agak rendah), lalu `kepala` (depan-samping kepala).
- **Narasi & aktivitas:**
  1. "Ini sapimu! Dia bisa bergerak. Geser untuk memutarnya."
  2. Kalung muncul di leher sapi dengan label dua kartu: **SA** (biru) · **PI** (merah).
     "Sapimu pakai kalung. Ada tulisannya. Ketuk kartunya satu per satu."
     Ketuk SA → "sa". Ketuk PI → "pi". Lalu otomatis: "sa... pi... sapi! Namanya SAPI."
  3. "Ada berapa kaki sapimu? Ketuk kakinya satu per satu." (mekanik yang sudah ada) → anak memilih 4.
  4. Tanduk, **lihat sekilas**: "Sekarang lihat kepalanya. Tanpa mengetuk, ada berapa tanduk?"
     Pilihan hanya 1, 2, 3 (subitisasi).
- **Jawaban benar:** kaki 4, tanduk 2.
- **Petunjuk saat salah:**
  - Kaki: "Hmm, coba hitung lagi angka terakhirnya." 2 kali salah → kartu 4 disorot.
  - Tanduk salah: "Kita hitung bersama, yuk. Ketuk tanduknya." Beralih ke mode hitung-ketuk (tanpa
    hukuman), lalu pilih lagi. 2 kali salah → kartu 2 disorot.
- **Aset baru:** `kalung` (torus tipis + label pipih) dengan dua bagian yang bisa diketuk:
  `label_SA`, `label_PI` (tekstur `wordTexture`, warna suku seperti papan RU MAH).
  Bagian sapi yang bisa diketuk (sudah ada): `kaki[0..3]`, `tanduk[0..1]`.
- **Untuk Ayah/Bunda:** "Saat anak mengetuk kaki, ikut menghitung dengan suara pelan. Setelah selesai,
  tanya: jadi semuanya ada berapa? Jawaban ini yang penting, bukan urutan hitungnya."

### Adegan 3 · Pohon mangga (±2 menit)
- **Latar & kamera:** sapi berjalan ke pohon (`walkTo` yang ada). Kamera `pohon`, lalu turun sedikit
  supaya keranjang di samping sapi ikut terlihat.
- **Narasi & aktivitas:**
  1. "Ayo jalan ke rumah Budi! Lihat, ada pohon mangga."
     "Ada berapa mangga di pohon? Ketuk satu per satu." (acak 3-5, mekanik yang ada) → pilih jumlahnya.
  2. "Budi suka mangga. Ambil **dua** mangga, masukkan ke keranjang."
     Anak menyeret mangga dari pohon ke keranjang. Setiap mangga yang masuk diberi angka kecil (1, 2).
     Lalu anak mengetuk tombol centang di keranjang: "Sudah?"
- **Jawaban benar:** jumlah mangga di pohon; tepat 2 mangga di keranjang.
- **Petunjuk saat salah:**
  - Isi keranjang 1: "Baru satu. Budi minta dua." Isi 3 atau lebih: "Coba hitung isi keranjangnya.
    Budi minta dua saja." Mangga berlebih tidak dibuang otomatis; anak boleh menyeretnya kembali.
  - 2 kali salah: dua mangga di keranjang disorot hijau, sisanya melayang pelan kembali ke pohon,
    narator: "Satu, dua. Dua mangga. Pas!"
- **Aset baru:** `keranjang` (silinder terbuka + pegangan, toon + tinta) dengan zona jatuh yang besar
  (≥ 88 px). Mangga yang ada perlu bisa diseret (bukan hanya diketuk) dan menempel di keranjang.
- **Untuk Ayah/Bunda:** "Mengambil sejumlah benda ('ambil dua') lebih sulit daripada menghitung yang
  sudah ada. Kalau anak mengambil terlalu banyak, cukup tanya: Budi minta berapa?"

### Adegan 4 · Sungai kecil (±1,5 menit) · ketegangan
- **Latar & kamera:** sungai dangkal memotong jalan antara pohon dan rumah. Kamera tinggi dari depan
  (sudut ±45°) supaya semua batu terlihat sekaligus. Dua lajur batu: tiap langkah ada dua batu
  berdampingan dengan angka berbeda.
- **Narasi & aktivitas:**
  - Sapi berhenti, mundur, menggeleng: "Mooo..." Narator: "Oh! Ada sungai kecil. Sapimu takut basah."
  - "Lihat, ada batu bernomor. Bantu sapimu melompat dari batu **satu** sampai batu **lima**.
    Ketuk batu nomor satu."
  - Setiap batu benar: sapi melompat ke sana, narator menyebut angkanya, lalu "Sekarang nomor...?"
    (diam 2 detik, lalu "dua").
  - Pasangan batu per langkah: 1 / 3, 2 / 5, 3 / 1, 4 / 2, 5 / 4 (urutan kiri-kanan diacak).
  - Sampai seberang: sapi melompat senang. "Hore! Sapimu berhasil menyeberang. Sapimu berani!"
- **Jawaban benar:** urutan 1, 2, 3, 4, 5.
- **Petunjuk saat salah:** batu goyang "blup", "Itu batu nomor tiga. Kita cari nomor dua." 2 kali salah
  → batu yang benar berdenyut hijau.
- **Aset baru:** `sungai` (bidang biru dengan tekstur riak sederhana, animasi geser UV), `batu_titian[0..9]`
  (silinder pipih, angka 1-5 dicetak dengan Andika di permukaan atas). Setiap batu bisa diketuk
  sendiri; jarak antar batu di layar ≥ 44 px pada layar terkecil (cek di E2E). Animasi sapi: mundur +
  geleng (baru), lompat (pakai `hop` yang ada + lintasan busur).
- **Untuk Ayah/Bunda:** "Tanya: sapinya kenapa berhenti? Bagaimana kalau kamu yang takut? Ini latihan
  mengenal lambang angka 1 sampai 5 secara berurutan."

### Adegan 5 · Rumah Budi (±1,5 menit)
- **Latar & kamera:** depan rumah Budi, kamera `rumah` yang ada.
- **Narasi & aktivitas:**
  1. "Ini rumah siapa, ya? Susun kartunya, jadi nama tempat ini." Kartu RU, MAH, pengecoh BU (yang ada).
     Benar: "ru... mah... rumah!" Pintu terbuka.
  2. Budi keluar: "Halo, Sapi! Wah, kamu bawa mangga?" Anak menyeret keranjang ke Budi.
     Budi: "Terima kasih! Dua mangga, pas untuk aku dan Ibu."
- **Jawaban benar:** RU lalu MAH.
- **Petunjuk saat salah:** (yang ada) "Itu bu. Cari yang lain." 2 kali salah → kartu benar disorot.
- **Aset baru:** `budi` (anak bergaya mainan: badan kapsul, kepala bola, rambut hitam setengah bola,
  kaus berwarna polos, tanpa logo). Animasi: lambai, terima keranjang.
- **Titik simpan:** setelah adegan ini kemajuan disimpan di HP. Jika aplikasi ditutup, lanjut di
  adegan 6 dengan sapi berwarna sama.
- **Untuk Ayah/Bunda:** "Kata RUMAH disusun dari kartu, belum perlu dibaca sendiri. Cukup dengarkan
  anak menyebut ru... mah bersama suara."

### Adegan 6 · Papan nama kandang (±2,5 menit) · menulis
- **Latar & kamera:** halaman samping rumah, kandang kayu kecil baru. Di atas pintunya ada papan nama
  kosong dengan dua kotak bergaris: kotak 1 kosong (bertitik-titik untuk S dan A), kotak 2 sudah
  tertulis **PI** oleh Budi. Kamera close-up papan, lalu layar beralih ke papan menulis 2D yang besar.
- **Narasi & aktivitas:**
  1. Budi: "Ini kandang baru untuk sapimu. Tapi papan namanya belum selesai. Aku sudah tulis PI.
     Kamu tulis SA, ya?"
  2. Anak memilih satu krayon (warna tulisan = warna krayon pilihan anak).
  3. **S:** "Huruf S. Mulai dari titik hijau, ikuti panahnya, melengkung seperti ular." 1 goresan.
     Selesai: "sss..." (bunyi huruf) dan huruf berkilau sebentar.
  4. **A:** "Huruf A. Garis miring turun ke kiri... garis miring turun ke kanan... lalu garis datar di
     tengah." 3 goresan, masing-masing dimulai dari titik hijau.
  5. Tulisan anak pindah ke papan 3D. "SA... dan PI. Ayo baca bersama. Ketuk kartunya."
     Ketuk SA → "sa", ketuk PI → "pi", lalu "sapi! Ini kandang SAPI."
- **Jawaban benar:** goresan mengikuti jalur dari titik mulai sampai titik akhir (toleransi lebar,
  ±12% tinggi huruf); arah goresan benar.
- **Petunjuk saat salah:** goresan keluar jalur atau mulai dari ujung salah → goresan memudar, titik
  mulai berdenyut, "Coba mulai dari titik hijau." 2 kali salah → tangan contoh menggambar goresannya,
  lalu anak cukup menelusuri jalur yang sudah ditebalkan (selalu bisa selesai).
- **Aset baru:**
  - 3D: `kandang` (kotak terbuka di depan + atap pelana, warna kayu) dengan bagian `papan_nama`
    (tekstur kanvas yang menerima tulisan anak) dan `label_SA`, `label_PI` yang bisa diketuk.
  - 2D: **komponen menebalkan** (dipakai ulang di semua episode): kerangka huruf S dan A dalam
    bentuk jalur bergaris putus-putus, titik mulai hijau, panah arah, deteksi urutan goresan.
- **Untuk Ayah/Bunda:** "Biarkan anak menulis sendiri walau tidak rapi. Yang dilatih adalah titik
  mulai dan arah goresan. Setelah selesai, minta anak menunjuk huruf S di benda lain di rumah."

### Adegan 7 · Ibu minta sapu (±1,5 menit)
- **Latar & kamera:** depan kandang, kamera `dapur` yang ada digeser ke kandang. Benda bola, sapu, topi
  berjajar di bangku.
- **Narasi & aktivitas:**
  1. Ibu datang: "Halo, Sapi! Kandangnya masih kotor, banyak daun. Tolong ambilkan benda ini."
     Kartu besar **SA · PU** (yang ada). Anak memilih bendanya di 3D atau tombol gambar.
  2. Benar: "Betul! Itu sapu." Ibu menyerahkan sapu ke anak: "Ayo bantu Ibu. Sapu daunnya keluar."
     Anak menyeret sapu di lantai kandang; 5 daun terbang keluar satu per satu (bermain, tanpa soal).
- **Jawaban benar:** sapu.
- **Petunjuk saat salah:** "Itu bola. Coba baca lagi: sa... pu." Jika memilih karena mengira SAPI:
  "Ini bukan sapi. Dengar suku terakhirnya: pu. Sa... pu." 2 kali salah → sapu disorot.
- **Aset baru:** `daun[0..4]` (bidang kecil berbentuk daun, toon). Sapu yang ada perlu bisa diseret
  di lantai kandang (jalur geser satu bidang).
- **Untuk Ayah/Bunda:** "SAPI dan SAPU hanya beda suku terakhir. Tanya: apa bedanya sapi dan sapu?
  Coba sebutkan kata lain yang diawali sa."

### Adegan 8 · Selamat tidur, Sapi (±1 menit) · penutup
- **Latar & kamera:** langit berubah senja lalu malam (warna latar dan cahaya berganti, total cahaya
  tetap ±1 supaya warna krayon tetap sama). Kamera lebar: kandang dengan papan SAPI tulisan anak,
  Budi dan Ibu melambai.
- **Narasi & aktivitas:**
  1. Sapi berjalan masuk kandang di bawah papan nama. "Sapimu sudah sampai di kandang barunya."
  2. "Ketuk papan namanya, lalu baca bersama." Ketuk → narator berhenti sebentar sebelum membaca
     supaya anak sempat membaca dulu: "...sa · pi · sapi."
  3. Budi: "Selamat tidur, Sapi. Terima kasih sudah membantu!" Sapi: "mooo" pelan, menguap.
  4. Cuplikan: roket kertas kecil melintas di langit. "Eh, apa itu? Roket kertas! Besok kita
     terbang bersamanya."
  5. Layar selesai: gambar sapi anak jadi stiker di kebun stiker. Tiga cap bergambar (buku = membaca,
     pensil = menulis, jari = menghitung) muncul satu per satu, tanpa angka atau nilai.
     "Hari ini kamu membaca SAPI dan SAPU, menulis SA, dan menghitung sampai lima. Hebat!"
- **Aset baru:** `langit_malam` (preset warna latar + cahaya), `bintang` (sprite sederhana, hiasan),
  animasi sapi masuk dan menguap, `roket_kecil` (dipakai ulang dari model E02, skala kecil).
- **Untuk Ayah/Bunda (setelah main):** "Tanya: tadi sapimu takut apa? Siapa yang menolongnya?
  Ajak anak mencari tulisan SA di rumah, misalnya di bungkus makanan."

## 4. Daftar aset
**Dipakai ulang:** gambar garis sapi + region, papan mewarnai, sapi 3D (`kaki`, `tanduk` bisa diketuk),
jalan + bunga, pohon mangga + `mangga[]`, rumah Budi + pintu, Ibu, sapu/bola/topi, kartu suku kata,
papan RU MAH, `wordTexture`, mekanik hitung-ketuk + pilih angka, stiker dan laporan.

**Baru (3D):** kalung + `label_SA`, `label_PI`; keranjang (zona jatuh); sungai; `batu_titian[0..9]`
dengan angka; Budi; kandang + `papan_nama` (tekstur tulisan anak) + label yang bisa diketuk;
`daun[0..4]`; preset langit malam + bintang; roket kecil (dari E02).

**Baru (2D / mekanik):** komponen menebalkan huruf (S, A; nanti semua huruf) dengan titik mulai, panah,
deteksi arah dan urutan goresan; mode "lihat sekilas" (pilihan angka tanpa ketuk, jatuh ke mode
hitung-ketuk saat salah); seret benda ke wadah + tombol "Sudah?"; titik simpan antar-adegan.

**Animasi baru:** sapi mundur + geleng, lompat busur antar batu, masuk kandang, menguap; Budi lambai.

## 5. Laporan untuk orang tua
Dicatat per kemampuan dengan tiga keadaan: **lancar** (benar tanpa petunjuk), **dengan bantuan**
(benar setelah petunjuk), **belum** (jawaban disorot). Tanpa angka/skor.
- Menyebut jumlah setelah menghitung (kardinalitas): kaki 4, mangga 3-5.
- Mengenali jumlah kecil tanpa menghitung (tanduk 2), dan apakah perlu beralih ke mode ketuk.
- Mengambil sejumlah benda (2 mangga).
- Mengenal lambang angka 1-5 berurutan (batu sungai): angka mana yang tertukar.
- Membaca suku SA, PI, PU dan kata SAPI, SAPU; membedakan SAPI/SAPU.
- Menyusun RU + MAH.
- Menulis S dan A: mulai dari titik yang benar? arah benar? berapa kali dibantu tangan contoh.
  Ditampilkan juga gambar kecil tulisan anak (disimpan di HP).
- Lama bermain per adegan (untuk melihat bagian yang diulang atau membosankan).
- Saran kegiatan di rumah: cari huruf S dan A; hitung sendok di meja; "ambil dua" saat makan.

## 6. Pertanyaan terbuka untuk pemilik
1. **Durasi:** dengan 8 adegan, anak lambat bisa 15 menit lebih. Setuju ada titik simpan setelah
   adegan 5 (boleh berhenti dan lanjut besok), atau episode harus selesai dalam satu duduk?
2. **Huruf kapital saja di Tingkat 1?** Usul: kapital dulu (lebih mudah ditulis); huruf kecil mulai
   Tingkat 2. Perlu dicek dengan 1-2 guru TK tentang buku menulis yang umum dipakai. [Kemungkinan Besar]
   banyak TK langsung mengajarkan huruf kecil, jadi bisa jadi pengaturan orang tua.
3. **Urutan goresan:** S satu goresan dari kanan atas; A tiga goresan (miring kiri, miring kanan,
   datar). Perlu disahkan guru TK sebelum dibangun. [Menebak] bahwa ini sesuai kebiasaan TK Indonesia.
4. **Bunyi huruf saat menulis:** pakai bunyi ("sss") atau nama huruf ("es")? Usul: bunyi, dengan nama
   huruf sebagai pengaturan orang tua (sesuai metode SAS).
5. **RUMAH** tetap dipertahankan (suku tertutup MAH) karena sudah dibangun dan berfungsi sebagai kata
   tujuan, atau diganti kata KV-KV murni?
6. **Subitisasi tanduk** menggantikan hitung-ketuk tanduk yang sekarang. Setuju?
7. **Suara:** perlu 3 suara (narator, Budi, Ibu). Rekam dengan pengisi suara, atau satu orang dengan
   variasi?
8. **Nama sapi:** tetap "SAPI" (agar bisa dibaca), atau anak boleh memilih dari 3 nama KV-KV
   (mis. "PIPI", "MUMU")? Memilih nama menambah rasa memiliki tetapi menambah rekaman suara.
