# Model 3D dengan sand3d (uji coba, Nov 2026)

[sand3d](https://github.com/Sandflow-ai/sand3d) (Apache-2.0) menulis objek 3D sebagai program Python
di atas Blender (`bpy`). Setiap bagian bernama, jadi nama itu bisa langsung dipakai game sebagai
sasaran ketuk dan sebagai bagian yang menerima warna anak. Sambungan (roda, engkol, pintu) ikut
tersimpan di GLB (`extras.s3d_joint`).

```bash
python3 -m venv .venv && .venv/bin/pip install sand3d      # Python 3.13, membawa bpy 5.2 (~1 GB)
.venv/bin/python sepeda.py sepeda.glb
```

Hasil uji (`uji-perbandingan.png`, dirender dengan gaya toon + tinta milik game):
- **sepeda.py**: bagus dan langsung dikenali; 35 bagian bernama; sambungan putar roda dan engkol.
- **sapi.py**: percobaan pertama TIDAK lebih bagus dari sapi buatan tangan di `apps/scan/src/play/cow3d.ts`
  (kepala kecil, tanpa leher, tanduk tenggelam). Hewan butuh iterasi lebih lanjut.
- Ukuran GLB 690-910 KB: terlalu besar untuk HP murah. Perlu dikecilkan (tesselasi lebih rendah,
  atau gltf-transform: simplify + meshopt) sebelum dipakai di game.

Keputusan sementara: sand3d untuk **benda dan kendaraan** (sepeda, roket, perahu, meja, delman);
hewan tetap dibuat langsung dengan three.js sampai uji hewan sand3d lebih baik.
